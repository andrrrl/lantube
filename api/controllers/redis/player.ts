import { execSync } from "child_process";
import * as ChildProcess from 'child_process';
import * as fs from 'fs';
import * as ServerSchema from '../../schemas/redis/Server';
import { Videos } from './../../controllers/redis/videos';
import { IPlayerStats } from "../../interfaces/IPlayerStats";
import { IVideo } from "../../interfaces/IVideo.interface";

const
    exec = ChildProcess.exec;

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

    constructor(private io: any) {
        this.io = io;
        this.videosCtrl = new Videos(this.io);

        Server.getPlayerStats().then(playerStats => {
            this.playerStats = playerStats;
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

            // If player is playing we just toggle play/pause
            if (this.playing && this.playing.pid && this.playing.stdin.writable) {
                this.playing.stdin.write(" ");
            } else {
                this.userTriggered = false;
                this.play(this.playerStats);
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

            resolve(true);
        })
    }

    // Only for omxplayer for now
    volume(volume) {
        return new Promise(async (resolve, reject) => {

            let currentStats = await Server.getPlayerStats();
            let currVol = currentStats.volume;

            if (volume === 'down') {
                this.volumeChange = '-';
                currVol = currVol - 300;

            } else if (volume === 'up') {
                this.volumeChange = '+';
                currVol = currVol + 300;
            }

            if (process.env.PLAYER !== 'omxplayer') {
                console.info('Volume change not supported!');
                reject('Volume change not supported!')
            } else {
                this.playing.stdin.write(this.volumeChange);
                console.info('Volume: ' + this.volumeChange);
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
            let prevVideo: IVideo = await this.videosCtrl.getPrev('videos', order);

            this.playerStats.videoId = prevVideo.videoInfo.videoId;
            this.playerStats.videoInfo = prevVideo.videoInfo;
            this.playerStats.action = 'prev';
            this.playerStats.status = 'loading';

            console.log('prev: ', this.playerStats);
            // console.log({ prevVideo });

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
            let nextVideo: IVideo = await this.videosCtrl.getNext('videos', order);

            this.playerStats.videoId = nextVideo.videoInfo.videoId;
            this.playerStats.videoInfo = nextVideo.videoInfo;
            this.playerStats.action = 'next';
            this.playerStats.status = 'loading';

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

                console.log('Starting OMXPLAYER...');
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
            let playerString = `${process.env.PLAYER} ${this.playerStats.audioOnly ? `--alpha 0` : `-b`} -o both --vol ${this.playerStats.volume} -I --threshold 30 --audio_fifo 30 "${extractedURI}"`;
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
