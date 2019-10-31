import * as ChildProcess from 'child_process';
import * as fs from 'fs';
import * as ServerSchema from '../../schemas/redis/Server';
import { Videos } from './../../controllers/redis/videos';
import { IPlayerStats } from "../../interfaces/IPlayerStats";
import { IVideo } from "../../interfaces/IVideo.interface";

const
    exec = ChildProcess.exec,
    spawn = ChildProcess.spawn;

// Load Server
let Server = new ServerSchema.Server();

// tslint:disable-next-line:no-console
process.on('unhandledRejection', r => console.log(r));

export class Player {

    private playing: ChildProcess.ChildProcess;

    formats: string = ' -f 34/18/43/35/44/22/45/37/46';
    playerStats: IPlayerStats;

    volumeChange: any;
    videosCtrl: any;
    stopped: any;
    userTriggered = false;
    systemAudio;

    constructor(private io: any) {
        this.io = io;
        this.videosCtrl = new Videos(this.io);
        this.systemAudio = process.env.SYSTEM_AUDIO;

        Server.getPlayerStats().then(playerStats => {
            this.playerStats = playerStats;
            this.playerStats.status = 'idle';
        });
    };

    // Only for omxplayer for now
    pause() {
        return new Promise(async (resolve, reject) => {

            this.systemAudio = this.systemAudio !== null ? this.systemAudio : process.env.SYSTEM_AUDIO;

            // Only on GUI mode (audio-only won't work)
            if ((this.systemAudio === 'pulseaudio' || this.systemAudio === 'alsa') && process.env.PLAYER_MODE !== 'audio-only') {
                console.log(`xdotool search --class mpv windowactivate --sync %1 key space windowactivate $(xdotool getactivewindow)`);
                exec(`xdotool search --class mpv windowactivate --sync %1 key space windowactivate $(xdotool getactivewindow)`);
            } else if (this.systemAudio === 'omxplayer') {
                // If player is playing we just toggle play/pause
                if (this.playing && this.playing.pid && this.playing.stdin.writable) {
                    this.playing.stdin.write(process.env.PLAYER_PAUSE); // " " <== omxplayer, 
                } else {
                    this.userTriggered = false;
                    this.play(this.playerStats);
                }
            } else if (process.env.PLAYER_MODE === 'audio-only') {
                exec("echo '{ \"command\": [\"cycle\", \"pause\"] }' | socat - /tmp/mpvsocket");
            }

            // Update stats
            let current = await Server.getPlayerStats();
            let action: any = (current.status === 'paused' || current.status === 'stopped') ? 'play' : 'pause';
            let status: any = (current.status === 'paused' || current.status === 'stopped') ? 'playing' : 'paused';
            console.info(`Playback ${(current.status === 'paused' || current.status === 'stopped') ? 'starting' : 'paused'}!`);


            // Update stats
            let stats: IPlayerStats = {
                player: process.env.PLAYER,
                action,
                status,
                videoId: current.videoId,
                videoInfo: current.videoInfo,
                playlist: current.playlist,
                lastUpdated: new Date(),
            };

            // Persist player stats
            Server.setPlayerStats(stats);

            // Emit stats change
            this.io.emit('PLAYER_MESSAGE', stats);

            resolve(true);
        })
    }

    // Only for omxplayer for now
    volume(volume, emitSignal = true) {
        return new Promise(async (resolve, reject) => {

            this.systemAudio = this.systemAudio !== null ? this.systemAudio : process.env.SYSTEM_AUDIO;

            if (volume === 'down') {
                this.volumeChange = '-';
            } else if (volume === 'up') {
                this.volumeChange = '+';
            }

            console.log('systemAudio', this.systemAudio);

            if (this.systemAudio === 'pulseaudio') {
                console.log(`pactl set-sink-volume 0 ${this.volumeChange}${process.env.SYSTEM_VOLUME_STEP}%`);
                exec(`pactl set-sink-volume 0 ${this.volumeChange}${process.env.SYSTEM_VOLUME_STEP}%`);
            } else if (this.systemAudio === 'alsa') {
                console.log(`amixer -q -D sset Master ${process.env.SYSTEM_VOLUME_STEP}${this.volumeChange}`);
                exec(`amixer -q -D sset Master ${process.env.SYSTEM_VOLUME_STEP}${this.volumeChange}`);
            } else if (this.systemAudio === 'omxplayer') {
                this.playing.stdin.write(this.volumeChange);
            }

            console.info('Volume: ' + this.volumeChange);


            if (emitSignal === true) {
                let stats = await Server.getPlayerStats();

                // Emit stats change
                this.io.emit('PLAYER_MESSAGE', stats);
            }

            resolve(this.volumeChange);

        });
    }


    // If videoId is null, let's consider 'video1' as starting ponit
    getVideoOrder(videoId = 'video') {
        return Number(videoId.replace('video', ''));
    }

    // Play previous video (always user triggered)
    playPrev(userTriggered = true) {
        return new Promise(async (resolve, reject) => {

            this.userTriggered = userTriggered;

            this.playerStats = await Server.getPlayerStats();
            let order = this.getVideoOrder(this.playerStats.videoId);
            let prevVideo: IVideo = await this.videosCtrl.getPrev('videos', order);

            this.playerStats.videoId = prevVideo.videoInfo.videoId;
            this.playerStats.videoInfo = prevVideo.videoInfo;
            this.playerStats.action = 'prev';
            this.playerStats.status = 'loading';

            console.log('prev: ', this.playerStats);
            // console.log({ prevVideo });

            this.play(this.playerStats).then(result => {
                return resolve(this.playerStats);
            }).catch(() => {
                return reject(this.playerStats);
            });

        });
    }

    // Play next video (can be user triggered or if player stats "playlist" value is true)
    playNext(userTriggered = false) {
        return new Promise(async (resolve, reject) => {

            this.userTriggered = userTriggered;

            this.playerStats = await Server.getPlayerStats();
            let order = this.getVideoOrder(this.playerStats.videoId);
            let nextVideo: IVideo = await this.videosCtrl.getNext('videos', order);

            this.playerStats.videoId = nextVideo.videoInfo.videoId;
            this.playerStats.videoInfo = nextVideo.videoInfo;
            this.playerStats.action = 'next';
            this.playerStats.status = 'loading';

            this.play(this.playerStats).then(() => {
                return resolve(this.playerStats);
            }).catch(() => {
                return reject(this.playerStats);
            });
        });
    }

    stopAll(userTriggered = true) {
        return new Promise(async (resolve, reject) => {

            this.userTriggered = userTriggered;

            console.info(`Playback stopped!`);

            if (this.userTriggered) {
                let stats: IPlayerStats = await Server.getPlayerStats();
                // Update stats
                stats.action = 'stop';
                stats.status = 'stopped';

                this.playerStats = stats;

                // Persist player stats
                Server.setPlayerStats(stats);

                // Emit stats change
                this.io.emit('PLAYER_MESSAGE', stats);
            }

            if (this.playing && this.playing.pid) {
                if (this.playing.stdin.writable) {
                    this.playing.stdin.write("q");
                    if (!this.playing.killed) {
                        this.playing.kill();
                        if (this.playing.killed) {
                            resolve(true);
                        }
                    }
                } else {
                    resolve(true);
                }
            }

            this.playing = null;

            // Update stats
            let stats = {
                player: process.env.PLAYER,
                status: 'stopped',
                videoId: null,
                lastUpdated: new Date(),
            };
            this.io.emit('USER_MESSAGE', stats);
            await Server.setPlayerStats(stats);

            resolve(true);
        });
    }

    async play(playerOptions) {

        // Stop/clear any current playback before starting
        return new Promise(async (resolve, reject) => {
            if (this.playerStats.playlist && this.playerStats.status === 'playing') {
                return resolve(false);
            }

            if (this.playing && this.playing.pid) {
                if (this.playing.stdin.writable) {
                    this.playing.stdin.write("q");
                    if (!this.playing.killed) {
                        this.playing.kill();
                    }
                }
                this.playing = null;
            }

            this.playerStats = await Server.getPlayerStats();
            this.playerStats.action = playerOptions.action;
            this.playerStats.status = playerOptions.status;
            this.playerStats.videoId = playerOptions.videoId;
            this.playerStats.videoInfo = playerOptions.videoInfo;
            this.playerStats.audioOnly = playerOptions.audioOnly;

            var videoUrl = playerOptions.videoInfo.url;

            // Update stats
            let stats: IPlayerStats = {
                player: process.env.PLAYER,
                action: playerOptions.action || 'idle',
                status: 'loading',
                videoId: this.playerStats.videoId,
                videoInfo: this.playerStats.videoInfo,
                audioOnly: this.playerStats.audioOnly,
                playlist: this.playerStats.playlist,
                lastUpdated: new Date()
            };

            // Persist player stats
            Server.setPlayerStats(stats);

            this.playerStats = stats;

            this.io.emit('PLAYER_MESSAGE', stats);

            if (!this.playing) {

                console.log('Extracting Youtube URL...');
                let youtubeURL = await this.extracYoutubeURL(videoUrl);

                console.log(`Starting ${process.env.PLAYER.toLocaleUpperCase()}...`);
                await this.startPlayer(youtubeURL);

                await this.initPlaybackSession();
                resolve(this.playerStats);
            }
        }).catch(async result => {
            // console.log('ERROR, can\'t stop the beat I can\'t stop.');
            // await this.play(this.playerOptions);
        });
    }

    async initPlaybackSession() {

        // Update stats
        let stats: IPlayerStats = {
            player: process.env.PLAYER,
            action: this.playerStats.action,
            status: 'playing',
            videoId: this.playerStats.videoInfo.videoId,
            videoInfo: this.playerStats.videoInfo,
            audioOnly: this.playerStats.audioOnly,
            playlist: this.playerStats.playlist,
            lastUpdated: new Date(),
        };

        this.playerStats = stats;

        // Emit stats change
        this.io.emit('PLAYER_MESSAGE', stats);

        // Persist player stats
        Server.setPlayerStats(stats);

    }

    async finishPlayback(action) {
        console.log('playback before end', this.playerStats);
        // this.stopped = true;

        // console.log('User triggered?', this.userTriggered);
        // console.log('Audio only mode?', this.playerStats.audioOnly);
        // console.log('Playlist mode?', this.playerStats.playlist);
        console.log('Action?', this.playerStats.action);
        // if (this.playerStats.playlist === true && this.playerStats.action !== 'stop') {
        //     this.playNext(false);
        // }


        if (this.playerStats.playlist === true && action !== 'stop' && action !== 'play') {
            this.playNext(false);
        } else {
            // Update stats
            let stats: IPlayerStats = {
                player: process.env.PLAYER,
                action: 'idle',
                status: 'stopped',
                videoId: this.playerStats.videoInfo.videoId,
                videoInfo: this.playerStats.videoInfo,
                audioOnly: this.playerStats.audioOnly,
                playlist: this.playerStats.playlist,
                lastUpdated: new Date(),
            };

            // Persist player stats
            this.playerStats = stats;
            Server.setPlayerStats(stats);

            // Emit stats change
            this.io.emit('PLAYER_MESSAGE', stats);

            console.log('playback ended', this.playerStats);
        }


    }

    extracYoutubeURL(videoURL) {
        return new Promise((resolve, reject) => {
            let video = exec(`${process.env.YOUTUBE_DL} --rm-cache-dir ${this.formats} -g ${videoURL}`);
            video.stdout.once('data', (data) => {
                data = data.toString().replace('\n', '').replace('\n', '').replace('\n', '');
                resolve(data);
            });
        });
    }

    startPlayer(extractedURI): Promise<ChildProcess.ChildProcess> {
        return new Promise((resolve, reject) => {
            // OMXPLAYER won't pipe anything to stdout, only to stderr, if option -I or --info is used
            // Use "--alpha 0" for audio only mode

            let playbackType = process.env.PLAYER_MODE === 'fullscreen' ? process.env.PLAYER_MODE_FULLSCREEN_ARG : process.env.PLAYER_MODE_AUDIO_ONLY_ARG;

            let playbackString = `${playbackType}`;
            // this.playing = exec(`${process.env.PLAYER} ${playbackString} ${extractedURI}`);
            console.log(process.env.PLAYER, [process.env.PLAYER_EXTRA_ARGS, ...playbackString.split(' '), extractedURI]);
            this.playing = spawn(process.env.PLAYER, [process.env.PLAYER_EXTRA_ARGS, ...playbackString.split(' '), extractedURI]);

            // console.log(this.playing.stdout);

            this.playing.on('disconnect', () => { });
            this.playing.on('exit', () => { });
            this.playing.on('close', () => {
                console.log('this.playing closed with action: ', this.playerStats.action);
                this.finishPlayback(this.playerStats.action);
            });
        });

    }

    // UNUSED, omxplayer won't play playlist files
    // Left here for future implementations with VLC, MPV, etc
    playlist(videosRedis) {

        // Generate and serve PLS playlist
        let playlist = '[playlist]\n\n';
        let i = 1;

        let videos = [];
        for (let video in videosRedis) {
            videos.push(JSON.parse(videosRedis[video]));
        }

        videos.sort(function (a, b) {
            return Number(a.videoId.replace(/video/, '')) - Number(b.videoId.replace(/video/, ''));
        });

        videos.forEach((video, index) => {
            playlist += 'Title' + i + '=' + video.title + '\n';
            playlist += 'File' + i + '=' + video.url + '\n\n';
            i++;
        });

        playlist += 'NumberOfEntries=' + videos.length;

        let pls = fs.writeFileSync('/tmp/playlist.pls', playlist);

    }

    // UNUSED, omxplayer won't play playlist files
    // Left here for future implementations with VLC, MPV, etc
    deletePlaylist() {
        return new Promise((resolve, reject) => {
            let fileExists = fs.existsSync('file:///tmp/playlist.pls');
            if (fileExists) {
                fs.unlinkSync('file:///tmp/playlist.pls');
                return resolve(true);
            } else {
                return resolve(false);
            }
        })
    }

    updateStats(stats: IPlayerStats) {
        // Update stats
        stats = {
            player: process.env.PLAYER,
            action: this.playerStats.action,
            status: 'playing',
            videoId: this.playerStats.videoInfo.videoId,
            videoInfo: this.playerStats.videoInfo,
            audioOnly: this.playerStats.audioOnly,
            playlist: this.playerStats.playlist,
            lastUpdated: new Date(),
        };

        this.playerStats = stats;

        // Emit stats change
        this.io.emit('PLAYER_MESSAGE', stats);

        // Persist player stats
        Server.setPlayerStats(stats);
    }

}
