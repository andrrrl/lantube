import { execSync } from "child_process";
import { EventEmitter } from 'events';
import * as ChildProcess from 'child_process';
import * as request from 'request';
import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as ServerSchema from '../../schemas/redis/Server';
import { IPlayerOptions } from './../../interfaces/IPlayerOptions.interface';

const
    spawn = ChildProcess.spawn,
    exec = ChildProcess.exec;

// Load Server
let Server = new ServerSchema.Server();

export class Player {
    playerOptions: IPlayerOptions;

    volumeChange: any;

    volumeEmitter = new EventEmitter();
    pauseEmitter = new EventEmitter();
    stopEmitter = new EventEmitter();

    private playing: ChildProcess.ChildProcess;
    private chromecast: Buffer;

    constructor(private io: any) {
        this.io = io;
    };

    /**
     * 
     * @param id string
     */
    isValid(id) {
        return mongoose.Types.ObjectId.isValid(id);
    }

    stopAll(emitSignal = true) {
        return new Promise((resolve, reject) => {
            this.stopEmitter.emit('stopEvent');
            if (emitSignal === true) {
                this.io.emit('USER_MESSAGE', { signal: 'stopped' });
            }
            resolve(true);
        });
    }

    // Only for omxplayer for now
    pause() {
        return new Promise((resolve, reject) => {
            this.pauseEmitter.emit('pauseEvent');

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

    // Only for omxplayer for now
    volume(volume) {
        this.volumeChange = volume;
        this.volumeEmitter.emit('volumeEvent');
    }

    play(playerOptions) {

        this.playerOptions = playerOptions;

        // Stop/clear any current playback before starting
        this.stopAll(false);

        let player = playerOptions.player || process.env.PLAYER;
        var video_url = playerOptions.url || '';

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
                this.chromecast = execSync(process.env.YOUTUBE_DL + ' -o - ' + video_url + ' | castnow --quiet -');
                break;
        }

        // Player type?
        if (process.env.PLAYER === 'omxplayer') {
            let formats = ' -f 34/18/43/35/44/22/45/37/46';
            this.playing = exec(process.env.PLAYER + ' -b -o both $(' + process.env.YOUTUBE_DL + formats + ' -g ' + video_url + ')');
        } else {
            if (player_playlist) {
                this.playlist(this.playerOptions.list);
                player_playlist = '/tmp/playlist.pls';
            }
            // this.playing = spawn(process.env.PLAYER, [playerModeArg, player_playlist, video_url]);
            this.playing = exec(process.env.PLAYER + ' ' + playerModeArg + ' ' + player_playlist + ' ' + video_url);
        }

        this.initPlaybackSession();

    }

    initPlaybackSession() {

        this.io.emit('USER_MESSAGE', { signal: ((this.playerOptions.playlist === true) ? 'playlist' : 'playing') });

        // Counter for retrying (if slow connection, etc)
        let stuck = 0;

        // Play video!
        this.playing.stdout.on('data', data => {

            if (process.env.NODE_ENV === 'development') {
                console.log('Starting playback with ' + (JSON.stringify(this.playerOptions) || 'no options.'));
                console.log(`stdout: ${data}`);
            }

            // Check if connection is stuck (for now only mpv / mplayer)
            if (data.toString().match(/Cache is not responding/)) {

                stuck++;

                // If video is stuck after 20 retries, stop it and play again
                if (stuck == 20) {
                    setTimeout(() => {

                        if (process.env.NODE_ENV === 'development') {
                            console.log('Connection stuck, retrying...');
                        }
                        this.stopAll(false);
                        this.play(this.playerOptions);

                    }, 5000);
                }
            } else {
                let stats = {
                    player: process.env.PLAYER,
                    status: this.playerOptions.status || 'idle',
                    videoId: this.playerOptions._id,
                    lastUpdated: new Date(),
                };
                Server.setPlayerStats(stats);
            }


        });

        this.playing.stderr.on('data', data => {
            if (process.env.NODE_ENV === 'development') {
                // will print stuff continuously...
                console.log(`stderr: ${data}`);
            }
        });

        this.stopEmitter.on('stopEvent', () => {

            if (process.env.PLAYER !== 'omxplayer') {
                // this.playing.kill('SIGINT');
                this.playing.stdin.write("SPACE");
            } else {
                this.playing.stdin.write("q");
            }
            this.deletePlaylist();
            console.info('Playback stopped!');
        });

        this.pauseEmitter.on('pauseEvent', () => {
            if (process.env.PLAYER !== 'omxplayer') {
                this.playing.stdin.write("p");
            } else {
                console.info('Pause not supported!');
            }
            console.info('Playback paused!');
        });

        this.volumeEmitter.on('volumeEvent', () => {
            if (process.env.PLAYER !== 'omxplayer') {
                this.playing.stdin.write(this.volumeChange);
                console.info('Volume: ' + this.volumeChange);
            } else {
                console.info('Volumen change not supported!');
            }

        });

        // Close when video finished (I don't want a playlist, understand?)
        this.playing.on('close', code => {
            if (process.env.NODE_ENV === 'development') {
                console.log(`Player finshed playing with code ${code}`);
            }

            // future chromecast
            // child_process('killall youtube-dl castnow');

            this.playing.kill('SIGINT');

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

        fs.writeFileSync('/tmp/playlist.pls', playlist)

    }

    deletePlaylist() {
        fs.stat('/tmp/playlist.pls', (err) => {
            if (!err) {
                fs.unlinkSync('/tmp/playlist.pls');
            }
        });
    }
}
