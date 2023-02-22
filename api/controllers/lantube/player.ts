import * as ChildProcess from "child_process";
import * as fs from "fs";
import Server from "./server";
import { Youtube } from "./youtube";
import { PlayerStats } from "../../interfaces/PlayerStats";
import { Video } from "../../interfaces/Video.interface";

const exec = ChildProcess.exec;

// Load Server
const server = new Server();

process.on("unhandledRejection", (r) => console.log(r));

export class Player {
    private playing: ChildProcess.ChildProcess;

    playerStats: PlayerStats;
    volumeChange: "-" | "+";
    youtubeCtrl: any;
    stopped: any;
    userTriggered = false;

    constructor(private io: any) {
        this.io = io;
        this.youtubeCtrl = new Youtube(this.io);

        server.getPlayerStats().then((playerStats) => {
            this.playerStats = playerStats;
            this.playerStats.volume = 0;
            this.playerStats.audioOnly =
                process.env.PLAYER_MODE === "audio" ? true : false;
        });
    }

    // Only for omxplayer for now
    pause() {
        return new Promise(async (resolve, reject) => {
            // Update stats
            let current = await server.getPlayerStats();
            let action: any =
                current.status === "paused" || current.status === "stopped"
                    ? "play"
                    : "pause";
            let status: any =
                current.status === "paused" || current.status === "stopped"
                    ? "playing"
                    : "paused";
            console.info(
                `Playback ${
                    current.status === "paused" || current.status === "stopped"
                        ? "starting"
                        : "paused"
                }!`
            );

            if (process.env.PLAYER === "vlc") {
                // VLC
                this.playing.stdin.write("pause \n");
            } else if (process.env.PLAYER === "omxplayer") {
                // If player is playing we just toggle play/pause
                if (
                    this.playing &&
                    this.playing.pid &&
                    this.playing.stdin.writable
                ) {
                    this.playing.stdin.write(" ");
                } else {
                    this.userTriggered = false;
                    this.play(this.playerStats);
                }
            } else {
                return reject({
                    message: "Error: Player not supported?",
                    player: process.env.PLAYER,
                });
            }

            // Update stats
            let stats: PlayerStats = {
                player: process.env.PLAYER,
                action,
                status,
                videoId: current.videoId,
                videoInfo: current.videoInfo,
                playlist: current.playlist,
                volume: current.volume,
                lastUpdated: new Date(),
            };

            // Persist player stats
            server.setPlayerStats(stats);

            // Emit stats change
            this.io.emit("PLAYER_MESSAGE", stats);
            console.log("pause stats");

            resolve(status);
        });
    }

    // Only for omxplayer for now
    volume(volume) {
        return new Promise(async (resolve, reject) => {
            let currentStats = await server.getPlayerStats();
            let currVol = currentStats.volume;

            if (process.env.PLAYER === "vlc") {
                // VLC
            } else if (process.env.PLAYER === "omxplayer") {
                if (volume === "down") {
                    this.volumeChange = "-";
                    currVol = currVol - 300;
                } else if (volume === "up") {
                    this.volumeChange = "+";
                    currVol = currVol + 300;
                }
                if (
                    currentStats.status === "playing" ||
                    currentStats.status === "paused"
                ) {
                    this.playing.stdin.write(this.volumeChange);
                    console.info("Volume: " + this.volumeChange);
                }
            }

            currentStats.volume = currVol;

            // Persist player stats
            server.setPlayerStats(currentStats);

            // Emit stats change
            this.io.emit("PLAYER_MESSAGE", currentStats);
            console.log("volume stats");

            resolve(this.volumeChange);
        });
    }

    // If videoId is null, let's consider 'video1' as starting ponit
    getVideoOrder(videoId = "video") {
        return Number(videoId.replace("video", ""));
    }

    // Play previous video (always user triggered)
    playPrev(userTriggered = true) {
        return new Promise(async (resolve, reject) => {
            this.userTriggered = userTriggered;

            this.playerStats = await server.getPlayerStats();
            let order = this.getVideoOrder(this.playerStats.videoId);
            let prevVideo: Video = await this.youtubeCtrl.getPrev(
                "videos",
                order
            );

            this.playerStats.videoId = prevVideo.videoInfo.videoId;
            this.playerStats.videoInfo = prevVideo.videoInfo;
            this.playerStats.action = "prev";
            this.playerStats.status = "loading";

            console.log("prev: ", this.playerStats);
            // Emit stats change
            this.io.emit("PLAYER_MESSAGE", this.playerStats);
            console.log("prev stats");

            this.play(this.playerStats)
                .then((result) => {
                    resolve(this.playerStats);
                })
                .catch(() => {
                    reject(this.playerStats);
                });
        });
    }

    // Play next video (can be user triggered or if player stats "playlist" value is true)
    playNext(userTriggered = false) {
        return new Promise(async (resolve, reject) => {
            this.userTriggered = userTriggered;

            this.playerStats = await server.getPlayerStats();
            let order = this.getVideoOrder(this.playerStats.videoId);
            let nextVideo: Video = await this.youtubeCtrl.getNext(
                "videos",
                order
            );

            this.playerStats.videoId = nextVideo.videoInfo.videoId;
            this.playerStats.videoInfo = nextVideo.videoInfo;
            this.playerStats.action = "next";
            this.playerStats.status = "loading";

            console.log("next: ", this.playerStats);
            // Emit stats change
            this.io.emit("PLAYER_MESSAGE", this.playerStats);
            console.log("next stats");

            this.play(this.playerStats)
                .then(() => {
                    resolve(this.playerStats);
                })
                .catch(() => {
                    reject(this.playerStats);
                });
        });
    }

    stopAll(userTriggered = true) {
        return new Promise(async (resolve, reject) => {
            this.userTriggered = userTriggered;

            console.info(`Playback stopped!`);

            if (this.userTriggered) {
                let stats: PlayerStats = await server.getPlayerStats();
                // Update stats
                stats.action = "stop";
                stats.status = "stopped";

                this.playerStats = stats;

                // Persist player stats
                server.setPlayerStats(stats);

                // Emit stats change
                this.io.emit("PLAYER_MESSAGE", stats);
                console.log("stopAll stats");
            }

            if (this.playing && this.playing.pid) {
                if (this.playing.stdin.writable) {
                    if (process.env.PLAYER === "omxplayer") {
                        this.playing.stdin.write("q");
                    }
                    if (!this.playing.killed) {
                        this.playing.kill();
                        if (this.playing.killed) {
                            return resolve(true);
                        }
                    }
                } else {
                    return resolve({ playing: false });
                }
            }

            this.playing = null;
            resolve(true);
        });
    }

    async play(playerOptions: PlayerStats): Promise<any> {

        // Stop/clear any current playback before starting
        return new Promise(async (resolve, reject) => {
            if (
                this.playerStats.playlist &&
                this.playerStats.status === "playing"
            ) {
                return resolve(false);
            }

            if (this.playing && this.playing.pid) {
                if (this.playing.stdin.writable) {
                    if (process.env.PLAYER === "omxplayer") {
                        this.playing.stdin.write("q");
                    }
                    if (!this.playing.killed) {
                        this.playing.kill();
                    }
                }
                this.playing = null;
            }

            this.playerStats = await server.getPlayerStats();
            this.playerStats.action = playerOptions.action;
            this.playerStats.status = playerOptions.status;
            this.playerStats.videoId = playerOptions.videoId;
            this.playerStats.videoInfo = playerOptions.videoInfo;
            this.playerStats.audioOnly = playerOptions.audioOnly;

            var videoUrl = playerOptions.videoInfo.url;

            // Update stats
            let stats: PlayerStats = {
                player: process.env.PLAYER,
                action: playerOptions.action || "idle",
                status: "loading",
                videoId: this.playerStats.videoId,
                videoInfo: this.playerStats.videoInfo,
                audioOnly: this.playerStats.audioOnly,
                playlist: this.playerStats.playlist,
                volume: this.playerStats.volume,
                lastUpdated: new Date(),
            };

            // Persist player stats
            server.setPlayerStats(stats);

            this.playerStats = stats;

            this.io.emit("PLAYER_MESSAGE", stats);
            console.log("play stats");

            if (!this.playing) {
                console.log("Extracting Youtube URL...");
                const youtubeURL = await this.extracYoutubeURL(videoUrl);

                console.log(`Starting ${process.env.PLAYER}...`);
                this.startPlayer(youtubeURL);

                return resolve(this.playerStats);
            }
        }).catch(async (result) => {
            console.log("ERROR, can't stop the beat I can't stop.");
            // await this.play(this.playerOptions);
        });
    }

    async initPlaybackSession() {
        // Update stats
        let stats: PlayerStats = {
            player: process.env.PLAYER,
            action: this.playerStats.action,
            status: "playing",
            videoId: this.playerStats.videoInfo.videoId,
            videoInfo: this.playerStats.videoInfo,
            audioOnly: this.playerStats.audioOnly,
            playlist: this.playerStats.playlist,
            volume: this.playerStats.volume,
            lastUpdated: new Date(),
        };

        this.playerStats = stats;

        // Emit stats change
        this.io.emit("PLAYER_MESSAGE", stats);
        console.log("initPlaybackSession stats");

        // Persist player stats
        server.setPlayerStats(stats);
    }

    async finishPlayback(action) {
        console.log("playback before end", this.playerStats);
        // this.stopped = true;

        // console.log('User triggered?', this.userTriggered);
        // console.log('Audio only mode?', this.playerStats.audioOnly);
        // console.log('Playlist mode?', this.playerStats.playlist);
        console.log("Action?", this.playerStats.action);
        // if (this.playerStats.playlist === true && this.playerStats.action !== 'stop') {
        //     this.playNext(false);
        // }

        if (this.playerStats.playlist === true && action !== "stop") {
            this.playNext(false);
        } else {
            // Update stats
            let stats: PlayerStats = {
                player: process.env.PLAYER,
                action: "idle",
                status: "stopped",
                videoId: this.playerStats.videoInfo.videoId,
                videoInfo: this.playerStats.videoInfo,
                audioOnly: this.playerStats.audioOnly,
                playlist: this.playerStats.playlist,
                volume: this.playerStats.volume,
                lastUpdated: new Date(),
            };

            // Persist player stats
            this.playerStats = stats;
            server.setPlayerStats(stats);

            // Emit stats change
            this.io.emit("PLAYER_MESSAGE", stats);
            console.log("finishPlayback stats");

            console.log("playback ended", this.playerStats);
        }
    }

    extracYoutubeURL(videoURL) {
        return new Promise((resolve, reject) => {
            const formats =
                process.env.PLAYER_MODE === "audio"
                    ? process.env.AUDIO_ONLY_FORMATS
                    : process.env.AUDIO_VIDEO_FORMATS;
            const ua =
                "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.98 Mobile Safari/537.36";
            const ref = "https://www.youtube.com/";
            const header = "Host: rr2---sn-j5cax8pnpvo-o9oe.googlevideo.com";
            const execString = `${process.env.YOUTUBE_DL} --user-agent "${ua}" --referer "${ref}" --add-header "${header}" -g -f 140 ${videoURL}`;
            const videoPlayer = exec(execString);
            // const videoPlayer = exec(`${process.env.YOUTUBE_DL} --user-agent ${ua} --referer ${ref} --add-header "Host: rr2---sn-j5cax8pnpvo-o9oe.googlevideo.com" --rm-cache-dir -f ${formats} -g ${videoURL}`);

            videoPlayer.stdout.on('data', (data, chunk) => {
                data = data
                    .toString()
                    .replace("\n", "")
                    .replace("\n", "")
                    .replace("\n", "");
                console.log({ data, chunk });
                resolve(data);
            });
            videoPlayer.stdout.on('error', (stoutError) => {
                console.log({ stoutError });
            });
            videoPlayer.stderr.on('error', (error) => {
                console.log({ error });
                reject(error);
            });
            videoPlayer.on('close', (closeResult, signal) => {
                console.log({ closeResult, signal });
                reject(closeResult);
            });
        });
    }

    startPlayer(extractedURI): Promise<ChildProcess.ChildProcess> {
        return new Promise((resolve, reject) => {
            let playerString;

            if (process.env.PLAYER === "vlc") {
                // VLC
                playerString = `${process.env.PLAYER_BIN} -I dummy rc '${extractedURI}' ${process.env.PLAYER_EXIT}`;
            } else if (process.env.PLAYER === "omxplayer") {
                // OMXPLAYER
                // Won't pipe anything to stdout, only to stderr, if option -I or --info is used
                // Use "--alpha 0 --win 0,0,1280,720" for audio only mode
                this.playerStats.audioOnly = true;
                playerString = `${process.env.PLAYER} ${
                    this.playerStats.audioOnly
                        ? `--win 0,0,0,0 --alpha 0`
                        : `-b`
                } -o ${process.env.SYSTEM_AUDIO} --vol ${
                    this.playerStats.volume
                } -I "${extractedURI}"`;
            }

            this.playing = exec(playerString);

            this.initPlaybackSession();

            this.playing.on("disconnect", () => {});
            this.playing.on("exit", (exit) => {});

            this.playing.on("close", (close) => {
                console.log(
                    "this.playing closed with action: ",
                    this.playerStats.action
                );
                this.finishPlayback(this.playerStats.action);
            });

            this.playing.stderr.once("error", (error) => {
                console.log({ error });
                return reject(this.playing);
            });
        });
    }

    playFile(file) {
        this.startPlayer(file);
    }

    togglePlaylist() {
        return new Promise(async (resolve, reject) => {
            this.playerStats = await server.getPlayerStats();
            this.playerStats.playlist = !this.playerStats.playlist;

            server.setPlayerStats(this.playerStats);

            // Emit stats change
            this.io.emit("PLAYER_MESSAGE", this.playerStats);
            console.log("togglePlaylist stats");
            return resolve(this.playerStats);
        });
    }

    // UNUSED, omxplayer won't play playlist files
    // Left here for future implementations with VLC, MPV, etc
    playlist(videosRedis) {
        // Generate and serve PLS playlist
        let playlist = "[playlist]\n\n";

        let videos = [];
        for (let video in videosRedis) {
            videos.push(JSON.parse(videosRedis[video]));
        }

        videos.sort(function (a, b) {
            return (
                Number(a.videoId.replace(/video/, "")) -
                Number(b.videoId.replace(/video/, ""))
            );
        });

        videos.forEach((video, i) => {
            ++i;
            playlist += "Title" + i + "=" + video.title + "\n";
            playlist += "File" + i + "=" + video.url + "\n\n";
        });

        playlist += "NumberOfEntries=" + videos.length;

        let pls = fs.writeFileSync("/tmp/playlist.pls", playlist);
    }

    // UNUSED, omxplayer won't play playlist files
    // Left here for future implementations with VLC, MPV, etc
    deletePlaylist() {
        return new Promise((resolve, reject) => {
            let fileExists = fs.existsSync("file:///tmp/playlist.pls");
            if (fileExists) {
                fs.unlinkSync("file:///tmp/playlist.pls");
                resolve(true);
            } else {
                resolve(false);
            }
        });
    }

    // Unused?
    updateStats(updatedStats: PlayerStats) {
        // Persist player stats
        server.setPlayerStats(updatedStats);

        // Emit stats change
        this.io.emit("PLAYER_MESSAGE", updatedStats);
        console.log("updateStats stats");
    }
}
