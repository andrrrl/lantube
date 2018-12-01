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
        Server.getPlayerStats().then(playerStats => {
            this.playerStats = playerStats;
        });
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
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
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
                videoId: this.playerOptions.videoId,
                lastUpdated: new Date(),
            };
            yield Server.setPlayerStats(stats);
            this.io.emit('PLAYER_MESSAGE', stats);
            resolve(true);
        }));
    }
    // If videoId is null, let's consider 'video1' as starting ponit
    getVideoOrder(videoId = 'video0') {
        return Number(videoId.replace('video', ''));
    }
    playPrev(playerOptions) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let order = this.getVideoOrder(playerOptions.videoId);
            let prevVideo = yield this.videosCtrl.getPrev('videos', order);
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
        }));
    }
    playNext(playerOptions) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            playerOptions = yield Server.getPlayerStats();
            console.log({ playerOptions });
            let order = this.getVideoOrder(playerOptions.videoId);
            let nextVideo = yield this.videosCtrl.getNext('videos', order);
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
        }));
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
                let stats = yield Server.getPlayerStats();
                this.io.emit('PLAYER_MESSAGE', stats);
            }
            resolve(this.volumeChange);
        }));
    }
    stopAll() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
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
                        if (!this.playing.killed) {
                            this.playing.kill();
                        }
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                }
                else {
                    resolve(true);
                }
            }
            this.playing = null;
            resolve(true);
        }));
    }
    play(playerOptions) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
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
            let stopped = yield this.stopAll();
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
                        let youtubeURL = yield this.extracYoutubeURL(videoUrl);
                        console.log('starting omxplayer...');
                        yield this.startPlayer(youtubeURL);
                        yield Server.setPlayerStats(stats);
                        this.io.emit('PLAYER_MESSAGE', stats);
                        this.initPlaybackSession(videoUrl);
                        resolve(this.playerOptions);
                    }
                }
                else {
                    if (player_playlist) {
                        this.playlist(this.playerOptions.list);
                        player_playlist = '/tmp/playlist.pls';
                    }
                }
            }
            else {
                console.log('WARNING, can\'t stop the beat I can\'t stop. Retrying...');
                this.play(this.playerOptions);
            }
        })).catch((result) => __awaiter(this, void 0, void 0, function* () {
            console.log('ERROR, can\'t stop the beat I can\'t stop. Retrying...');
            yield this.play(this.playerOptions);
        }));
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
            // --alpha 0 
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