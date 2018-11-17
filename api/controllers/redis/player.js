"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const ChildProcess = require("child_process");
const mongoose = require("mongoose");
const fs = require("fs");
const ServerSchema = require("../../schemas/redis/Server");
const videos_1 = require("./../../controllers/redis/videos");
const exec = ChildProcess.exec;
// Load Server
let Server = new ServerSchema.Server();
// tslint:disable-next-line:no-console
process.on('unhandledRejection', r => console.log(r));
class Player {
    constructor(io) {
        this.io = io;
        this.formats = ' -f 34/18/43/35/44/22/45/37/46';
        this.currentStatus = 'idle';
        this.io = io;
        this.videosCtrl = new videos_1.Videos(this.io);
    }
    ;
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
                }
                else {
                    this.playing.stdin.write("pause\n");
                }
            }
            else {
                if (this.playing && this.playing.pid) {
                    this.playing.stdin.write("p");
                }
                else {
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
            this.io.emit('USER_MESSAGE', stats);
            resolve(true);
        });
    }
    playPrev() {
        return new Promise((resolve, reject) => {
            this.videosCtrl.getPrevOrNext('videos', this.playerOptions.order || 0, 'prev').then(prevVideo => {
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
                    this.io.emit('USER_MESSAGE', stats);
                    resolve(true);
                });
            });
        });
    }
    playNext() {
        return new Promise((resolve, reject) => {
            this.videosCtrl.getPrevOrNext('videos', this.playerOptions.order || 0, 'next').then(nextVideo => {
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
                    this.io.emit('USER_MESSAGE', stats);
                    resolve(true);
                });
            });
        });
    }
    // Only for omxplayer for now
    volume(volume, emitSignal = true) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (volume === 'down') {
                this.volumeChange = '-';
            }
            else if (volume === 'up') {
                this.volumeChange = '+';
            }
            if (process.env.PLAYER !== 'omxplayer') {
                console.info('Volumen change not supported!');
                reject('Volume change not supported!');
            }
            else {
                this.playing.stdin.write(this.volumeChange);
                console.info('Volume: ' + this.volumeChange);
            }
            if (emitSignal === true) {
                this.io.emit('PLAYER_MESSAGE', yield Server.getPlayerStats());
            }
            resolve(this.volumeChange);
        }));
    }
    stopAll() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (process.env.PLAYER !== 'omxplayer') {
                if (process.env.PLAYER !== 'cvlc -I cli') {
                    if (!this.playing.killed) {
                        this.playing.kill('SIGINT');
                        // kill(this.playing.pid, 'SIGINT');
                    }
                }
                else {
                    this.playing.stdin.write("stop\n");
                    this.playing.stdin.write('clear\n');
                }
                console.log(process.env.PLAYER, 'STOP (stop button)');
            }
            else {
                if (this.playing && this.playing.pid) {
                    if (this.playing.stdin.writable) {
                        this.playing.stdin.write("q");
                    }
                    else {
                        reject();
                    }
                    reject();
                }
            }
            this.playing = null;
            resolve(true);
        }));
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
                    this.chromecast = child_process_1.execSync(process.env.YOUTUBE_DL + ' -o - ' + videoUrl + ' | castnow --quiet -');
                    break;
            }
            // Stop/clear any current playback before starting
            this.stopAll().then((stopped) => __awaiter(this, void 0, void 0, function* () {
                if (stopped) {
                    // Player type?
                    if (process.env.PLAYER === 'omxplayer') {
                        if (this.playing === null) {
                            console.log('exctracting youtube URL...');
                            let youtubeURL = yield this.extracYoutubeURL(videoUrl);
                            console.log('starting omxplayer...');
                            yield this.startPlayer(youtubeURL);
                            // Update stats
                            let stats = {
                                player: process.env.PLAYER,
                                status: 'playing',
                                videoId: this.playerOptions._id,
                                lastUpdated: new Date(),
                            };
                            this.io.emit('USER_MESSAGE', stats);
                            yield Server.setPlayerStats(stats);
                            this.initPlaybackSession(videoUrl);
                            resolve(true);
                        }
                    }
                    else {
                        if (player_playlist) {
                            this.playlist(this.playerOptions.list);
                            player_playlist = '/tmp/playlist.pls';
                        }
                    }
                }
            })).catch(result => {
                console.log('ERROR, can\'t stop the beat I can\'t stop. Retrying...');
                this.play(this.playerOptions);
            });
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
    startPlayer(playableURL) {
        return new Promise((resolve, reject) => {
            // OMXPLAYER won't pipe anything to stdout, only to stderr if option -I or --info is used
            this.playing = exec(`${process.env.PLAYER} -b -o both --vol -1200 --threshold 30 --audio_fifo 30 -I "${playableURL}"`);
            this.playing.stderr.once('data', (data) => {
                resolve(true);
            });
        });
    }
    initPlaybackSession(videoUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (process.env.PLAYER === 'cvlc -I cli' && (typeof this.playing !== 'undefined')) {
                let ytb = child_process_1.execSync('youtube-dl -g ' + videoUrl);
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
                    // console.log(`Player exited with code ${code}`);
                }
                if (this.playerOptions.playlist === true) {
                    this.playNext();
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
                    videoId: null,
                    lastUpdated: new Date(),
                };
                this.io.emit('USER_MESSAGE', stats);
                // Update player stats
                Server.setPlayerStats(stats);
            });
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
            }
            else {
                resolve(false);
            }
        });
    }
    getStats(cb) {
        return new Promise((resolve, reject) => {
            resolve(cb);
        });
    }
}
exports.Player = Player;
//# sourceMappingURL=player.js.map