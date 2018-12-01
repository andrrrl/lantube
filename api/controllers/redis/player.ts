import { execSync } from "child_process";
import * as ChildProcess from 'child_process';
import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as ServerSchema from '../../schemas/redis/Server';
import { Videos } from './../../controllers/redis/videos';
import { IPlayerOptions } from './../../interfaces/IPlayerOptions.interface';
import { IPlayerStats } from "../../interfaces/IPlayerStats";

const
    exec = ChildProcess.exec;

// Load Server
let Server = new ServerSchema.Server();

// tslint:disable-next-line:no-console
process.on('unhandledRejection', r => console.log(r));

export class Player {

    formats: string = ' -f 34/18/43/35/44/22/45/37/46';
    playerOptions: IPlayerOptions;

    currentStatus: any = 'idle';
    volumeChange: any;

    videosCtrl: any;

    private playing: ChildProcess.ChildProcess;
    private chromecast: Buffer;
    playerStats: IPlayerStats;

    constructor(private io: any) {
        this.io = io;
        this.videosCtrl = new Videos(this.io);

        Server.getPlayerStats().then(playerStats => {
            this.playerStats = playerStats;
        });

    };

    /**
     * 
     * @param id string
     */
    isValid(id) {
        return mongoose.Types.ObjectId.isValid(id);
    }


    // Only for omxplayer for now
    pause() {
        return new Promise(async (resolve, reject) => {
            if (process.env.PLAYER !== 'omxplayer') {
                if (process.env.PLAYER !== 'cvlc -I cli') {
                    console.info('Pause not supported!');
                } else {
                    this.playing.stdin.write("pause\n");
                }
            } else {
                if (this.playing && this.playing.pid) {
                    this.playing.stdin.write("p");
                } else {
                    resolve(false);
                }
            }

            console.info('Playback paused!');

            // Update stats
            let stats = {
                player: process.env.PLAYER,
                status: 'paused',
                videoId: this.playerOptions.videoId,
                lastUpdated: new Date(),
            };

            await Server.setPlayerStats(stats);

            this.io.emit('PLAYER_MESSAGE', stats);

            resolve(true);
        })
    }

    // If videoId is null, let's consider 'video1' as starting ponit
    getVideoOrder(videoId = 'video0') {
        return Number(videoId.replace('video', ''));
    }

    playPrev(playerOptions) {
        return new Promise(async (resolve, reject) => {

            let order = this.getVideoOrder(playerOptions.videoId);

            let prevVideo = await this.videosCtrl.getPrev('videos', order);

            this.playerOptions = prevVideo;

            // console.log('prev', this.playerOptions);
            this.play(this.playerOptions).then(result => {

                // Update stats
                let stats = {
                    player: process.env.PLAYER,
                    status: 'playing',
                    videoId: this.playerOptions.videoId,
                    lastUpdated: new Date(),
                };

                Server.setPlayerStats(stats);
                this.io.emit('PLAYER_MESSAGE', stats);
                resolve(this.playerOptions);
            });

        });
    }


    playNext(playerOptions) {
        return new Promise(async (resolve, reject) => {

            playerOptions = await Server.getPlayerStats();
            console.log({ playerOptions });
            let order = this.getVideoOrder(playerOptions.videoId);

            let nextVideo = await this.videosCtrl.getNext('videos', order);

            this.playerOptions = nextVideo;

            console.log('next', this.playerOptions);

            this.play(this.playerOptions).then(result => {

                // Update stats
                let stats = {
                    player: process.env.PLAYER,
                    status: 'playing',
                    videoId: this.playerOptions.videoId,
                    lastUpdated: new Date(),
                };

                Server.setPlayerStats(stats);
                this.io.emit('PLAYER_MESSAGE', stats);
                resolve(this.playerOptions);
            });
        });

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
                console.info('Volumen change not supported!');
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

            // Update stats
            let stats = {
                player: process.env.PLAYER,
                status: 'stopped',
                videoId: this.playerStats.videoId,
                lastUpdated: new Date(),
            };
            this.io.emit('PLAYER_MESSAGE', stats);
            Server.setPlayerStats(stats);
            
            if (process.env.PLAYER !== 'omxplayer') {
                if (process.env.PLAYER !== 'cvlc -I cli') {
                    if (!this.playing.killed) {
                        this.playing.kill('SIGINT');
                        // kill(this.playing.pid, 'SIGINT');
                    }
                } else {
                    this.playing.stdin.write("stop\n");
                    this.playing.stdin.write('clear\n');
                }
                console.log(process.env.PLAYER, 'STOP (stop button)');
            } else {
                if (this.playing && this.playing.pid) {
                    if (this.playing.stdin.writable) {
                        this.playing.stdin.write("q");
                        if (!this.playing.killed) {
                            this.playing.kill();
                        }
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } else {
                    resolve(true);
                }
            }
            this.playing = null;
            resolve(true);


        });
    }


    play(playerOptions) {
        return new Promise(async (resolve, reject) => {

            this.playerOptions = playerOptions;

            let player = playerOptions.player || process.env.PLAYER;
            var videoUrl = playerOptions.url || '';

            let player_playlist = this.playerOptions.playlist === true ? process.env.PLAYER_PLAYLIST : process.env.PLAYER_NO_PLAYLIST;
            let playerMode = this.playerOptions.playerMode || process.env.PLAYER_MODE || 'windowed';

            let playerModeArg = '';

            // Player mode?
            switch (playerMode) {
                case 'windowed':
                    playerModeArg = process.env.PLAYER_NO_PLAYLIST;
                    break;
                case 'fullscreen':
                    playerModeArg = process.env.PLAYER_MODE_FULLSCREEN_ARG;
                    break;
                case 'audio-only':
                    playerModeArg = process.env.PLAYER_MODE_AUDIO_ONLY_ARG;
                    break;
                case 'chromecast':
                    this.chromecast = execSync(process.env.YOUTUBE_DL + ' -o - ' + videoUrl + ' | castnow --quiet -');
                    break;
            }

            // Stop/clear any current playback before starting
            let stopped = await this.stopAll();

            if (stopped) {
                // Player type?
                if (process.env.PLAYER === 'omxplayer') {
                    if (this.playing === null) {
                        // Update stats
                        let stats = {
                            player: process.env.PLAYER,
                            status: 'playing',
                            videoId: this.playerOptions.videoId,
                            lastUpdated: new Date(),
                        };

                        console.log('exctracting youtube URL...');
                        let youtubeURL = await this.extracYoutubeURL(videoUrl);
                        console.log('starting omxplayer...');
                        await this.startPlayer(youtubeURL);
                        await Server.setPlayerStats(stats);
                        this.io.emit('PLAYER_MESSAGE', stats);

                        this.initPlaybackSession(videoUrl);
                        resolve(this.playerOptions);
                    }
                } else {
                    if (player_playlist) {
                        this.playlist(this.playerOptions.list);
                        player_playlist = '/tmp/playlist.pls';
                    }
                }

            } else {
                console.log('WARNING, can\'t stop the beat I can\'t stop. Retrying...');
                this.play(this.playerOptions);
            }

        }).catch(async result => {
            console.log('ERROR, can\'t stop the beat I can\'t stop. Retrying...');
            await this.play(this.playerOptions);
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

    startPlayer(playableURL): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // OMXPLAYER won't pipe anything to stdout, only to stderr if option -I or --info is used
            // --alpha 0 
            this.playing = exec(`${process.env.PLAYER} -b -o both --vol -1200 --threshold 30 --audio_fifo 30 -I "${playableURL}"`);
            this.playing.stderr.once('data', (data) => {
                resolve(true);
            });
        });

    }

    async initPlaybackSession(videoUrl) {

        if (process.env.PLAYER === 'cvlc -I cli' && (typeof this.playing !== 'undefined')) {
            let ytb = execSync('youtube-dl -g ' + videoUrl);
            this.playing.stdin.write('add ' + ytb.toString().split('\n')[1], () => {
                this.playing.stdin.write('stop\n', () => {
                    console.log(process.env.PLAYER, 'STOP (cleanup)');
                    this.playing.stdin.write('clear\n', () => {
                        this.playing.stdin.write('play\n', () => {
                            console.log(process.env.PLAYER, 'PLAY (cleanup)');
                        });
                    });
                });
            });
        }

        // this.playing.stdout.on('data', (data) => {

        //     if (process.env.NODE_ENV === 'development') {
        //         console.log('Starting playback with ' + (JSON.stringify(this.playerOptions) || 'no options.'));
        //         return true;
        //     }
        //     return false;
        //     // console.log(`stdout: ${data}`);

        //     // Check if connection is stuck (for now only mpv / mplayer)
        //     // this.retryPlayback(data);
        // });

        // this.playing.stderr.on('data', data => {
        //     if (process.env.NODE_ENV === 'development') {
        //         // will print stuff continuously...
        //     }
        //     // console.log(`stderr: ${data}`);
        // });

        this.playing.on('exit', code => {
            if (process.env.NODE_ENV === 'development') {
                console.log(`Player exited with code ${code}`);
            }
            if (this.playerOptions.playlist === true) {
                this.playNext(this.playerOptions);
            }
        });

        // this.playing.on('disconnect', code => {
        //     if (process.env.NODE_ENV === 'development') {
        //         console.log(`Player disconnected with code ${code}`);
        //     }

        // });

        // Close when video finished (I don't want a playlist, understand?)
        this.playing.on('close', code => {
            if (process.env.NODE_ENV === 'development') {
                // console.log(`Player finshed playing with code ${code}`);
            }

            if (process.env.PLAYER === 'cvlc -I cli') {
                this.playing.stdin.write("stop\n");
                this.playing.kill('SIGINT');
            }

            // Update stats
            let stats = {
                player: process.env.PLAYER,
                status: 'stopped',
                videoId: this.playerOptions.videoId,
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
