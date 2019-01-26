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
                status: status,
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

            if (volume === 'down') {
                this.volumeChange = '-';
            } else if (volume === 'up') {
                this.volumeChange = '+';
            }

            if (process.env.PLAYER !== 'omxplayer') {
                console.info('Volume change not supported!');
                reject('Volume change not supported!')
            } else {
                this.playing.stdin.write(this.volumeChange);
                console.info('Volume: ' + this.volumeChange);
            }

            if (emitSignal === true) {
                let stats = await Server.getPlayerStats();

                // Emit stats change
                this.io.emit('PLAYER_MESSAGE', stats);
            }

            resolve(this.volumeChange);

        });
    }

    stopAll(userTriggered = true) {
        return new Promise(async (resolve, reject) => {

            this.userTriggered = userTriggered;

            console.info(`Playback stopped!`);

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
            this.playerStats.status = 'loading';

            this.play(this.playerStats).then(() => {
                resolve(this.playerStats);
            }).catch(() => {
                reject(this.playerStats);
            });
        });
    }

    async play(playerOptions) {
        return new Promise(async (resolve, reject) => {

            this.playerStats = await Server.getPlayerStats();
            this.playerStats.status = playerOptions.status;
            this.playerStats.videoId = playerOptions.videoId;
            this.playerStats.videoInfo = playerOptions.videoInfo;

            var videoUrl = playerOptions.videoInfo.url;

            // Stop/clear any current playback before starting
            this.stopped = await this.stopAll(false);

            // Update stats
            let stats: IPlayerStats = {
                player: process.env.PLAYER,
                status: 'loading',
                videoId: this.playerStats.videoId,
                videoInfo: this.playerStats.videoInfo,
                playlist: this.playerStats.playlist,
                lastUpdated: new Date()
            };

            // Persist player stats
            Server.setPlayerStats(stats);

            this.io.emit('PLAYER_MESSAGE', stats);

            if (this.stopped) {
                // Player type?
                if (process.env.PLAYER === 'omxplayer') {
                    if (this.playing === null) {

                        console.log('Extracting Youtube URL...');
                        let youtubeURL = await this.extracYoutubeURL(videoUrl);

                        console.log('Starting OMXPLAYER...');
                        this.playing = await this.startPlayer(youtubeURL);

                        await this.initPlaybackSession();
                        resolve(this.playerStats);
                    }
                }

            }
            else {
                // console.log('WARNING, can\'t stop the beat I can\'t stop.');
                await this.play(this.playerStats);
            }

        }).catch(async result => {
            // console.log('ERROR, can\'t stop the beat I can\'t stop.');
            // await this.play(this.playerOptions);
        });

    }

    async initPlaybackSession() {

        this.playerStats = await Server.getPlayerStats();

        if (this.playing && this.playing.stdin && this.playing.stdin.writable) {
            // Update stats
            let stats: IPlayerStats = {
                player: process.env.PLAYER,
                status: 'playing',
                videoId: this.playerStats.videoInfo.videoId,
                videoInfo: this.playerStats.videoInfo,
                playlist: this.playerStats.playlist,
                lastUpdated: new Date(),
            };

            this.playerStats = stats;

            // Emit stats change
            this.io.emit('PLAYER_MESSAGE', stats);

            // Persist player stats
            Server.setPlayerStats(stats);

        }

        this.playing.on('disconnect', () => { });

        this.playing.on('exit', () => { });

        // Player is closed when video finishes
        this.playing.on('close', () => {
            this.stopped = true;

            console.log('User triggered?', this.userTriggered);
            console.log('Playlist mode?', this.playerStats.playlist);
            if (this.playerStats.playlist === true && !this.userTriggered) {
                this.playNext(false);
            }

            // Update stats
            let stats: IPlayerStats = {
                player: process.env.PLAYER,
                status: 'stopped',
                videoId: this.playerStats.videoInfo.videoId,
                videoInfo: this.playerStats.videoInfo,
                playlist: this.playerStats.playlist,
                lastUpdated: new Date(),
            };

            // Emit stats change
            this.io.emit('PLAYER_MESSAGE', stats);

            // Persist player stats
            Server.setPlayerStats(stats);

        });
    }

    extracYoutubeURL(videoURL) {
        return new Promise((resolve, reject) => {
            let video = exec(`${process.env.YOUTUBE_DL} ${this.formats} -g ${videoURL}`);
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
            this.playing = exec(`${process.env.PLAYER} -b -o both --vol -3600 --threshold 30 --audio_fifo 30 -I "${extractedURI}"`);
            this.playing.stderr.once('data', (data) => {
                resolve(this.playing);
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

}
