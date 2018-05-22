import { execSync } from "child_process";
import { EventEmitter } from 'events';
import * as ChildProcess from 'child_process';
import * as request from 'request';
import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as ServerSchema from '../../schemas/redis/Server';
import { Videos } from './../../controllers/redis/videos';
import { IPlayerOptions } from './../../interfaces/IPlayerOptions.interface';
import { kill } from "process";

const
    spawn = ChildProcess.spawn,
    exec = ChildProcess.exec;

// Load Server
let Server = new ServerSchema.Server();

export class Player {
    playerOptions: IPlayerOptions;

    currentStatus: any = 'idle';
    volumeChange: any;

    videosCtrl;

    private playing: ChildProcess.ChildProcess;
    private chromecast: Buffer;

    constructor(private io: any) {
        this.io = io;
        this.videosCtrl = new Videos(this.io);

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
        return new Promise((resolve, reject) => {
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
                videoId: this.playerOptions._id,
                lastUpdated: new Date(),
            };

            Server.setPlayerStats(stats);

            this.io.emit('USER_MESSAGE', { signal: 'paused' });

            resolve(true);
        })
    }

    playPrev() {
        return new Promise((resolve, reject) => {

            this.videosCtrl.getPrevOrNext('videos', this.playerOptions.order, 'prev').then(prevVideo => {
                this.playerOptions = prevVideo;
                this.play(this.playerOptions).then(result => {
                    // Update stats
                    let stats = {
                        player: process.env.PLAYER,
                        status: 'paused',
                        videoId: this.playerOptions._id,
                        lastUpdated: new Date(),
                    };

                    Server.setPlayerStats(stats);
                    this.io.emit('USER_MESSAGE', { signal: 'prev' });
                    resolve(true);
                });
            });

        });
    }


    playNext() {
        return new Promise((resolve, reject) => {

            this.videosCtrl.getPrevOrNext('videos', this.playerOptions.order, 'next').then(nextVideo => {
                this.playerOptions = nextVideo;
                this.play(this.playerOptions).then(result => {
                    // Update stats
                    let stats = {
                        player: process.env.PLAYER,
                        status: 'paused',
                        videoId: this.playerOptions._id,
                        lastUpdated: new Date(),
                    };

                    Server.setPlayerStats(stats);
                    this.io.emit('USER_MESSAGE', { signal: 'next' });
                    resolve(true);
                });
            });

        });
    }

    // Only for omxplayer for now
    volume(volume, emitSignal = true) {
        return new Promise((resolve, reject) => {

            if (process.env.PLAYER !== 'omxplayer') {
                console.info('Volumen change not supported!');
                reject('Volume change not supported!')
            } else {
                this.playing.stdin.write(this.volumeChange);
                console.info('Volume: ' + this.volumeChange);
            }

            if (volume === 'down') {
                this.volumeChange = '-';
            } else if (volume === 'up') {
                this.volumeChange = '+';
            }
            if (emitSignal === true) {
                this.io.emit('USER_MESSAGE', { signal: 'volume changed' });
            }
            resolve(this.volumeChange);
        });
    }

    stopAll(emitSignal = true) {
        return new Promise(async (resolve, reject) => {
            if (process.env.PLAYER !== 'omxplayer') {
                if (process.env.PLAYER !== 'cvlc -I cli') {
                    this.playing.kill('SIGINT');
                } else {
                    this.playing.stdin.write("stop\n");
                    this.playing.stdin.write('clear\n');
                }
                console.log(process.env.PLAYER, 'STOP (stop button)');
            } else {
                if (this.playing && this.playing.pid) {
                    // this.playing.kill('SIGINT');
                    // kill(this.playing.pid);
                    this.playing.stdin.write("q");
                    // resolve(this.playing.killed);
                }
            }
            this.playing = null;
            resolve(true);

            // resolve(await this.deletePlaylist());

        });
    }


    play(playerOptions) {

        return new Promise((resolve, reject) => {

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

            let formats = ' -f 34/18/43/35/44/22/45/37/46';

            // Stop/clear any current playback before starting
            this.stopAll(false).then(stopped => {

                console.log(this.playing ? this.playing.pid : this.playing);

                if (stopped) {
                    // Player type?
                    if (process.env.PLAYER === 'omxplayer') {
                        if (this.playing === null) {
                            console.log('starting omxplayer...')
                            this.playing = exec(process.env.PLAYER + ' -b -o both --vol -1200 $(' + process.env.YOUTUBE_DL + formats + ' -g ' + videoUrl + ')');
                        }
                    } else {
                        if (player_playlist) {
                            this.playlist(this.playerOptions.list);
                            player_playlist = '/tmp/playlist.pls';
                        }
                        // this.playing = spawn(process.env.PLAYER, [playerModeArg, player_playlist, videoUrl]);
                        // ' ' + playerModeArg + ' ' + player_playlist +
                        // if (!this.playing.pid) {
                        //     if (process.env.PLAYER !== 'cvlc -I cli') {
                        //         // this.playing = exec(process.env.PLAYER + ' ' + playerModeArg + ' $(' + process.env.YOUTUBE_DL + formats + ' -g ' + videoUrl + ')');
                        //     } else {
                        //         this.playing = exec(process.env.PLAYER);
                        //     }
                        // }
                    }
                    this.initPlaybackSession(videoUrl);
                    resolve(true);
                } else {
                    // console.log(this.playing.pid);
                    // console.log(this.playing.killed);
                    // console.log(this.playing.stdin.writable);
                }

            }).catch(result => {
                console.log('ERROR, can\'t stop the beat I can\'t stop.');
            });

        });
    }

    // retryPlayback(data, retryTimes = 20) {
    //     // Counter for retrying (if slow connection, etc)
    //     let stuck = 0;
    //     if (data.toString().match(/Cache is not responding/)) {

    //         stuck++;

    //         // If video is stuck after 20 retries, stop it and play again
    //         if (stuck == retryTimes) {
    //             setTimeout(async () => {

    //                 if (process.env.NODE_ENV === 'development') {
    //                     console.log('Connection stuck, retrying...');
    //                 }
    //                 this.stopAll(false);
    //                 this.play(this.playerOptions);

    //             }, 5000);
    //         }
    //     } else {
    //         let stats = {
    //             player: process.env.PLAYER,
    //             status: this.playerOptions.status || 'idle',
    //             videoId: this.playerOptions._id,
    //             lastUpdated: new Date(),
    //         };
    //         Server.setPlayerStats(stats);
    //     }
    // }

    async initPlaybackSession(videoUrl) {

        this.io.emit('USER_MESSAGE', { signal: ((this.playerOptions.playlist === true) ? 'playlist' : 'playing') });

        if (process.env.PLAYER === 'cvlc -I cli' && (typeof this.playing !== 'undefined')) {
            let ytb = execSync('youtube-dl -g ' + videoUrl);
            this.playing.stdin.write('add ' + ytb.toString().split('\n')[1], () => {
                this.playing.stdin.write('stop\n', () => {
                    console.log(process.env.PLAYER, 'STOP (cleanup)');
                    this.playing.stdin.write('clear\n', () => {
                        this.playing.stdin.write('play\n', () => {
                            console.log(process.env.PLAYER, 'PLAY (cleanup)');
                            // console.log(this.playing);
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

        // this.playing.on('exit', code => {
        //     if (process.env.NODE_ENV === 'development') {
        //         console.log(`Player exited with code ${code}`);
        //     }

        // });
        // this.playing.on('disconnect', code => {
        //     if (process.env.NODE_ENV === 'development') {
        //         console.log(`Player disconnected with code ${code}`);
        //     }

        // });

        // Close when video finished (I don't want a playlist, understand?)
        this.playing.on('close', code => {
            if (process.env.NODE_ENV === 'development') {
                console.log(`Player finshed playing with code ${code}`);
            }

            // future chromecast
            // child_process('killall youtube-dl castnow');

            if (process.env.PLAYER === 'cvlc -I cli') {
                this.playing.stdin.write("stop\n");
                this.playing.kill('SIGINT');
            }

            // Update stats
            let stats = {
                player: process.env.PLAYER,
                status: 'idle',
                videoId: null,
                lastUpdated: new Date(),
            };

            this.io.emit('USER_MESSAGE', { signal: 'stopped' });
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
            return parseInt(a._id.replace(/video/, '')) - parseInt(b._id.replace(/video/, ''));
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
