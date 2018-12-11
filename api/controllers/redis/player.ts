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

            if (this.playing && this.playing.pid) {
                this.playing.stdin.write(" ");
            } else {
                resolve(false);
            }

            let current = await Server.getPlayerStats();

            let status: any = (current.status === 'paused' || current.status === 'stopped') ? 'playing' : 'paused';

            console.info(`Playback ${(current.status === 'paused' || current.status === 'stopped') ? 'starting' : 'paused'}!`);

            let playerOptions: IPlayerStats = {
                videoId: current.videoId,
                videoInfo: current.videoInfo,
                status,
                playlist: current.playlist,
            };
            playerOptions.videoId = current.videoId;
            playerOptions.videoInfo = current.videoInfo;

            if (status === 'playing') {
                this.playNext(playerOptions);
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

            Server.setPlayerStats(stats);

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
                this.io.emit('PLAYER_MESSAGE', stats);
            }
            resolve(this.volumeChange);
        });
    }

    stopAll() {
        return new Promise(async (resolve, reject) => {
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

    playPrev(playerOptions) {
        return new Promise(async (resolve, reject) => {

            let order = this.getVideoOrder(playerOptions.videoId);
            let prevVideo: IVideo = await this.videosCtrl.getPrev('videos', order);

            this.playerStats = await Server.getPlayerStats();

            playerOptions.videoId = prevVideo.videoId;
            playerOptions.videoInfo = prevVideo.videoInfo;

            this.playerStats.videoId = playerOptions.videoInfo.videoId;
            this.playerStats.videoInfo = playerOptions.videoInfo;

            this.play(this.playerStats).then(result => {
                // Update stats
                let stats: IPlayerStats = {
                    player: process.env.PLAYER,
                    status: 'playing',
                    videoId: this.playerStats.videoId,
                    videoInfo: this.playerStats.videoInfo,
                    playlist: this.playerStats.playlist,
                    lastUpdated: new Date(),
                };

                Server.setPlayerStats(stats);
                this.io.emit('PLAYER_MESSAGE', stats);
                resolve(this.playerStats);
            });

        });
    }


    playNext(playerOptions) {
        return new Promise(async (resolve, reject) => {

            this.playerStats = await Server.getPlayerStats();
            playerOptions.playlist = this.playerStats.playlist;

            let order = this.getVideoOrder(this.playerStats.videoInfo.videoId);
            let nextVideo: IVideo = await this.videosCtrl.getNext('videos', order);

            playerOptions.videoId = nextVideo.videoId;
            playerOptions.videoInfo = nextVideo.videoInfo;

            this.playerStats.videoId = playerOptions.videoInfo.videoId;
            this.playerStats.videoInfo = playerOptions.videoInfo;


            this.play(playerOptions).then(result => {

                // Update stats
                let stats: IPlayerStats = {
                    player: process.env.PLAYER,
                    status: 'playing',
                    videoId: this.playerStats.videoInfo.videoId,
                    videoInfo: this.playerStats.videoInfo,
                    playlist: this.playerStats.playlist,
                    lastUpdated: new Date(),
                };

                Server.setPlayerStats(stats);
                this.io.emit('PLAYER_MESSAGE', stats);
                resolve(this.playerStats);
            });
        });

    }

    async play(playerOptions) {
        return new Promise(async (resolve, reject) => {

            this.playerStats = await Server.getPlayerStats();
            this.playerStats.status = playerOptions.status;
            this.playerStats.videoId = playerOptions.videoInfo.videoId;
            this.playerStats.videoInfo = playerOptions.videoInfo;

            var videoUrl = playerOptions.videoInfo.url;

            // Stop/clear any current playback before starting
            this.stopped = await this.stopAll();

            // Update stats
            let stats: IPlayerStats = {
                player: process.env.PLAYER,
                status: 'loading',
                videoId: this.playerStats.videoInfo.videoId,
                videoInfo: this.playerStats.videoInfo,
                playlist: this.playerStats.playlist,
                lastUpdated: new Date()
            };

            this.io.emit('PLAYER_MESSAGE', stats);

            if (this.stopped) {
                // Player type?
                if (process.env.PLAYER === 'omxplayer') {
                    if (this.playing === null) {

                        console.log('Extracting Youtube URL...');
                        let youtubeURL = await this.extracYoutubeURL(videoUrl);

                        console.log('Starting OMXPLAYER...');
                        this.playing = await this.startPlayer(youtubeURL);

                        this.initPlaybackSession();

                        // Update stats
                        stats = {
                            player: process.env.PLAYER,
                            status: 'playing',
                            videoId: this.playerStats.videoInfo.videoId,
                            videoInfo: this.playerStats.videoInfo,
                            playlist: this.playerStats.playlist,
                            lastUpdated: new Date(),
                        };

                        this.playerStats = stats;

                        this.io.emit('PLAYER_MESSAGE', stats);

                        Server.setPlayerStats(stats);

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

    extracYoutubeURL(videoUrl) {
        return new Promise((resolve, reject) => {
            let video = exec(`${process.env.YOUTUBE_DL} ${this.formats} -g ${videoUrl}`);
            video.stdout.once('data', (data) => {
                data = data.toString().replace('\n', '').replace('\n', '').replace('\n', '');
                resolve(data);
            });
        });
    }

    startPlayer(playableURL): Promise<ChildProcess.ChildProcess> {
        return new Promise((resolve, reject) => {
            // OMXPLAYER won't pipe anything to stdout, only to stderr if option -I or --info is used
            // --alpha 0 
            this.playing = exec(`${process.env.PLAYER} -b -o both --vol -1200 --threshold 30 --audio_fifo 30 -I "${playableURL}"`);
            this.playing.stderr.once('data', (data) => {
                resolve(this.playing);
            });
        });

    }

    async initPlaybackSession() {

        this.playerStats = await Server.getPlayerStats();

        this.playing.on('disconnect', () => {

        });

        this.playing.on('exit', code => {
            this.stopped = true;
            if (process.env.NODE_ENV === 'development') {
                console.log(`Player exited with code ${code}`);
            }
        });

        // Player is closed when video finishes
        this.playing.on('close', code => {
            this.stopped = true;

            if (this.playerStats.playlist === true) {
                this.playNext(this.playerStats);
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

            this.io.emit('PLAYER_MESSAGE', stats);

            // Update player stats
            Server.setPlayerStats(stats);

        });
    }

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

    getStats(cb) {
        return new Promise((resolve, reject) => {
            resolve(cb);
        });
    }
}
