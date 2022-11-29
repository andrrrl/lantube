import * as ChildProcess from 'child_process';
import * as fs from 'fs';
import * as ServerSchema from '../../schemas/redis/Server';
import { Youtube } from './youtube';
import { IPlayerStats } from '../../interfaces/IPlayerStats';
import { IVideo } from '../../interfaces/IVideo.interface';

const
    exec = ChildProcess.exec;

// Load Server
let Server = new ServerSchema.Server();

// tslint:disable-next-line:no-console
process.on('unhandledRejection', r => console.log(r));

export class Player {

    private playing: ChildProcess.ChildProcess;

    playerStats: IPlayerStats;

    volumeChange: any;
    youtubeCtrl: any;
    stopped: any;
    userTriggered = false;

    constructor(private io: any) {
        this.io = io;
        this.youtubeCtrl = new Youtube(this.io);

        Server.getPlayerStats().then(playerStats => {
            this.playerStats = playerStats;
            this.playerStats.volume = 0;
            this.playerStats.audioOnly = process.env.PLAYER_MODE === 'audio' ? true : false;
        });

    };

    // Only for omxplayer for now
    pause() {
        return new Promise(async (resolve, reject) => {

            // Update stats
            let current = await Server.getPlayerStats();
            let action: any = (current.status === 'paused' || current.status === 'stopped') ? 'play' : 'pause';
            let status: any = (current.status === 'paused' || current.status === 'stopped') ? 'playing' : 'paused';
            console.info(`Playback ${(current.status === 'paused' || current.status === 'stopped') ? 'starting' : 'paused'}!`);

            if (process.env.PLAYER === 'vlc') {
                // VLC
            } else if (process.env.PLAYER === 'omxplayer') {
                // If player is playing we just toggle play/pause
                if (this.playing && this.playing.pid && this.playing.stdin.writable) {
                    this.playing.stdin.write(" ");
                } else {
                    this.userTriggered = false;
                    this.play(this.playerStats);
                }
            }

            // Update stats
            let stats: IPlayerStats = {
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
            Server.setPlayerStats(stats);

            // Emit stats change
            this.io.emit('PLAYER_MESSAGE', stats);

            resolve(status);
        })
    }

    // Only for omxplayer for now
    volume(volume) {
        return new Promise(async (resolve, reject) => {

            let currentStats = await Server.getPlayerStats();
            let currVol = currentStats.volume;



            if (process.env.PLAYER === 'vlc') {
                // VLC
            } else if (process.env.PLAYER === 'omxplayer') {
                if (volume === 'down') {
                    this.volumeChange = '-';
                    currVol = currVol - 300;

                } else if (volume === 'up') {
                    this.volumeChange = '+';
                    currVol = currVol + 300;
                }
                if (currentStats.status === 'playing' || currentStats.status === 'paused') {
                    this.playing.stdin.write(this.volumeChange);
                    console.info('Volume: ' + this.volumeChange);
                }
            }

            currentStats.volume = currVol;

            // Persist player stats
            Server.setPlayerStats(currentStats);

            // Emit stats change
            this.io.emit('PLAYER_MESSAGE', currentStats);

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
            let prevVideo: IVideo = await this.youtubeCtrl.getPrev('videos', order);

            this.playerStats.videoId = prevVideo.videoInfo.videoId;
            this.playerStats.videoInfo = prevVideo.videoInfo;
            this.playerStats.action = 'prev';
            this.playerStats.status = 'loading';

            console.log('prev: ', this.playerStats);
            // Emit stats change
            this.io.emit('PLAYER_MESSAGE', this.playerStats);

            this.play(this.playerStats).then(result => {
                resolve(this.playerStats);
            }).catch(() => {
                reject(this.playerStats);
            });

        });
    }

    // Play next video (can be user triggered or if player stats "playlist" value is true)
    playNext(userTriggered = false) {
        return new Promise(async (resolve, reject) => {

            this.userTriggered = userTriggered;

            this.playerStats = await Server.getPlayerStats();
            let order = this.getVideoOrder(this.playerStats.videoId);
            let nextVideo: IVideo = await this.youtubeCtrl.getNext('videos', order);

            this.playerStats.videoId = nextVideo.videoInfo.videoId;
            this.playerStats.videoInfo = nextVideo.videoInfo;
            this.playerStats.action = 'next';
            this.playerStats.status = 'loading';

            console.log('next: ', this.playerStats);
            // Emit stats change
            this.io.emit('PLAYER_MESSAGE', this.playerStats);

            this.play(this.playerStats).then(() => {
                resolve(this.playerStats);
            }).catch(() => {
                reject(this.playerStats);
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
                    if (process.env.PLAYER === 'omxplayer') {
                        this.playing.stdin.write("q");
                    }
                    if (!this.playing.killed) {
                        this.playing.kill();
                        if (this.playing.killed) {
                            resolve(true);
                        }
                    }
                } else {
                    resolve({ playing: false });
                }
            }

            this.playing = null;
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
                    if (process.env.PLAYER === 'omxplayer') {
                        this.playing.stdin.write("q");
                    }
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
                volume: this.playerStats.volume,
                lastUpdated: new Date()
            };

            // Persist player stats
            Server.setPlayerStats(stats);

            this.playerStats = stats;

            this.io.emit('PLAYER_MESSAGE', stats);

            if (!this.playing) {

                console.log('Extracting Youtube URL...');
                let youtubeURL = await this.extracYoutubeURL(videoUrl);

                console.log(`Starting ${process.env.PLAYER}...`);
                await this.startPlayer(youtubeURL);

                await this.initPlaybackSession();
                return resolve(this.playerStats);
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
            volume: this.playerStats.volume,
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


        if (this.playerStats.playlist === true && action !== 'stop') {
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
                volume: this.playerStats.volume,
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

            const formats = process.env.PLAYER_MODE === 'audio' ? process.env.AUDIO_ONLY_FORMATS : process.env.AUDIO_VIDEO_FORMATS;
            const ua = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.98 Mobile Safari/537.36';
            const ref = 'https://www.youtube.com/';
            const video = exec(`${process.env.YOUTUBE_DL} -g -f 140 ${videoURL}`);
            // const video = exec(`${process.env.YOUTUBE_DL} --user-agent ${ua} --referer ${ref} --add-header "Host: rr2---sn-j5cax8pnpvo-o9oe.googlevideo.com" --rm-cache-dir -f ${formats} -g ${videoURL}`);
            video.stdout.on('data', (data) => {
                data = data.toString().replace('\n', '').replace('\n', '').replace('\n', '');
                resolve(data);
            });
        });
    }

    startPlayer(extractedURI): Promise<ChildProcess.ChildProcess> {
        return new Promise((resolve, reject) => {
            // OMXPLAYER won't pipe anything to stdout, only to stderr, if option -I or --info is used
            // Use "--alpha 0 --win 0,0,1280,720" for audio only mode
            let playerString;

            if (process.env.PLAYER === 'vlc') {
                // VLC
                playerString = `${process.env.PLAYER} ${this.playerStats.audioOnly ? process.env.PLAYER_MODE_AUDIO_ONLY_ARG : process.env.PLAYER_MODE_FULLSCREEN_ARG} "${extractedURI}"`;
            } else if (process.env.PLAYER === 'omxplayer') {
                this.playerStats.audioOnly = true;
                playerString = `${process.env.PLAYER} ${this.playerStats.audioOnly ? `--win 0,0,0,0 --alpha 0` : `-b`} -o ${process.env.SYSTEM_AUDIO} --vol ${this.playerStats.volume} -I "${extractedURI}"`;
            }
            console.log(playerString);

            this.playing = exec(playerString);

            this.playing.on('disconnect', () => { });
            this.playing.on('exit', () => { });
            this.playing.on('close', () => {
                console.log('this.playing closed with action: ', this.playerStats.action);
                this.finishPlayback(this.playerStats.action);
            });
            this.playing.stderr.once('data', (data) => {
                return resolve(this.playing);
            });
        });

    }

    playFile(file) {
        this.startPlayer(file);
    }

    togglePlaylist() {
        return new Promise(async (resolve, reject) => {
            this.playerStats = await Server.getPlayerStats();
            this.playerStats.playlist = !this.playerStats.playlist;

            Server.setPlayerStats(this.playerStats);

            // Emit stats change
            this.io.emit('PLAYER_MESSAGE', this.playerStats);
            return resolve(this.playerStats);
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
                resolve(true);
            } else {
                resolve(false);
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
            volume: this.playerStats.volume,
            lastUpdated: new Date(),
        };

        this.playerStats = stats;

        // Emit stats change
        this.io.emit('PLAYER_MESSAGE', stats);

        // Persist player stats
        Server.setPlayerStats(stats);
    }

}
