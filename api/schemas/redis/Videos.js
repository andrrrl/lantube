"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
'use strict';
const request = require('request'), mongoose = require('mongoose'), spawn = require('child_process').spawn, exec = require('child_process').exec, EventEmitter = require('events'), stopEmitter = new EventEmitter(), volumeEmitter = new EventEmitter(), pauseEmitter = new EventEmitter();
// Load Server Model
var server_schema = require('./Server');
var Server = server_schema.Server;
let VideosSchema = {};
var volumeChange = '';
VideosSchema.isValid = function (id) {
    return mongoose.Types.ObjectId.isValid(id);
};
VideosSchema.stopAll = function (cb) {
    stopEmitter.emit('stopEvent');
    return cb;
};
VideosSchema.pause = function (cb) {
    pauseEmitter.emit('pauseEvent');
    return cb;
};
VideosSchema.volume = function (volume, cb) {
    volumeChange = volume;
    volumeEmitter.emit('volumeEvent');
    return cb;
};
VideosSchema.playThis = function (player_options, cb) {
    console.log('PLAY!');
    stopEmitter.emit('stopEvent');
    let player = player_options.player || process.env.PLAYER;
    var video_url = player_options.url || '';
    let player_playlist = player_options.player_playlist === true ? process.env.PLAYER_PLAYLIST : process.env.PLAYER_NO_PLAYLIST;
    let player_mode = player_options.player_mode || process.env.PLAYER_MODE || 'windowed';
    let player_mode_arg = '';
    let playing;
    // Switch?
    if (player_mode == 'windowed') {
        player_mode_arg = process.env.PLAYER_NO_PLAYLIST;
    }
    if (player_mode == 'fullscreen') {
        player_mode_arg = process.env.PLAYER_MODE_FULLSCREEN_ARG;
    }
    if (player_mode == 'audio-only') {
        player_mode_arg = process.env.PLAYER_MODE_AUDIO_ONLY_ARG;
        let playing;
    }
    if (player_mode == 'chromecast') {
        playing = child_process_1.execSync(process.env.YOUTUBE_DL + ' -o - ' + video_url + ' | castnow --quiet -');
    }
    else {
        if (process.env.PLAYER === 'omxplayer') {
            //var playing = spawn(process.env.PLAYER, ['-o', 'hdmi', video_url]);
            playing = exec(process.env.PLAYER + ' -b -o both $(' + process.env.YOUTUBE_DL + ' -g ' + video_url + ')');
            //playing = spawn(process.env.PLAYER, ['-o', 'both', '-b', '$(' + process.env.YOUTUBE_DL + ' -g ' + video_url + ')']);
        }
        else {
            // playing = execSync(process.env.YOUTUBE_DL + ' -o - ' + video_url + ' | ' + process.env.PLAYER + ' -');
            playing = spawn(process.env.PLAYER, [player_mode_arg, player_playlist, video_url]);
            // playing = spawn( process.env.YOUTUBE_DL, [' -o - ' + video_url + ' | ' + process.env.PLAYER + ' -'], { stdio: 'inherit' } );
        }
    }
    // Counter for retrying (if slow connection, etc)
    var stuck = 0;
    // Play video!
    playing.stdout.on('data', data => {
        console.log('Starting playback with ' + (JSON.stringify(player_options) || 'no options.'));
        console.log(`stdout: ${data}`);
        // Check if connection is stuck (for now only mpv / mplayer)
        if (data.toString().match(/Cache is not responding/)) {
            stuck++;
            // If video is stuck after 20 retries, stop it and play again
            if (stuck == 20) {
                setTimeout(function () {
                    // // Videos.stopAll(function () {
                    // //   Videos.playThis(player_options, function () {
                    // //     console.log('Connection stuck, retrying...');
                    // //   });
                    // });
                }, 5000);
            }
        }
        return cb;
    });
    playing.stderr.on('data', data => {
        // uncomment for debugging (will print stuff continuously...)
        // console.log( `stderr: ${data}` );
    });
    stopEmitter.on('stopEvent', () => {
        if (process.env.PLAYER !== 'omxplayer') {
            playing.kill('SIGINT');
        }
        else {
            playing.stdin.write("q");
        }
        console.log('Playback stopped!');
    });
    pauseEmitter.on('pauseEvent', () => {
        playing.stdin.write("p");
        console.log('Playback paused!');
    });
    volumeEmitter.on('volumeEvent', () => {
        playing.stdin.write(volumeChange);
        console.log('Volume: ' + volumeChange);
    });
    // Close when video finished (I don't want to generates a playlist, understand?)
    playing.on('close', code => {
        console.log(`Player finshed playing with code ${code}`);
        // child_process('killall youtube-dl castnow');
        playing.kill('SIGINT');
        // Update stats
        let server_stats = Server.setPlayerStats('stopped', 0);
        // Server.findOneAndUpdate({
        //     host: process.env.HOST_NAME
        //   }, {
        //     $set: server_stats
        //   }, {
        //     upsert: true,
        //     new: true
        //   })
        //   .exec(function (err, stats) {
        //     console.log('Player closed.');
        //   });
    });
    return cb;
};
module.exports = VideosSchema;
//# sourceMappingURL=Videos.js.map