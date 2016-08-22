'use strict';

var request = require('request');
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
const spawn = require( 'child_process' ).spawn;

var server_schema = require('./Server');
var Server = server_schema.Server;

var VideosSchema = new mongoose.Schema({
	url: {
		type: String,
		required: true
	},
	title: String,
    order: Number
}, {
    collection: process.env.MONGO_VIDEOS_COLL || 'videos'
});

const EventEmitter = require('events');
const stopEmitter = new EventEmitter();

VideosSchema.statics.stopAll = function(cb) {
	stopEmitter.emit('stopEvent');
	return cb;
}

// VideosSchema.methods.pause() = function( current_video_order ) {
// 	// TODO
// }

VideosSchema.methods.playThis = function(player_options, cb) {
	
	let player = player_options.player || process.env.PLAYR || 'mpv';
	let player_only_audio = player_options.only_audio || process.env.PLAYER_ONLY_AUDIO || '--';
	let player_playlist = player_options.player_playlist ? process.env.PLAYER_PLAYLIST : '';
	let player_fullscreen = player_options.player_fullscreen || process.env.PLAYER_FULLSCREEN || '';
	let video_url = player_options.url || '';
	
	// (sigh) Need to split the options if they have spaces for now...
	if ( player == 'mpv' || player == 'mplayer' ) {
		player_only_audio = player_only_audio.split(' ');
		var playing = spawn( player, [ player_only_audio[0], player_only_audio[1], player_playlist, player_fullscreen, video_url ] );
	} else {
		var playing = spawn( player, [ player_only_audio, player_playlist, player_fullscreen, video_url ] );
	}
	
	// Play video!
	
	var stuck = 0;
	
	playing.stdout.on( 'data', data => {
        console.log( 'Starting playback ' + 'with ' + ( JSON.stringify(player_options) || 'no options.') );
		console.log( `stdout: ${data}` );
		
		// Check if connection is stuck (only mpv / mplayer)
		if ( data.toString().match(/Cache is not responding/) ) {
		
			stuck++;
		
			// If video is stuck after 20 retries, stop it and play again
			if ( stuck == 20 ) {
				setTimeout(function(){
				
					Videos.stopAll(function(){
						
						Videos.playThis(player_options, function(){
							console.log( 'Connection stuck, retrying...' );
						});
						
					});
				
				}, 5000);
			}
		}
		
	});
	
	playing.stderr.on( 'data', data => {
        // will print stuff continuously...
		// console.log( `stderr: ${data}` );
	});
	
	stopEmitter.on('stopEvent', () => {
		playing.kill('SIGINT');
		console.log('Playback stopped!');
	});
	
	// Close when video finished (I don't want to generates a playlist, understand?)
	playing.on( 'close', code => {
		console.log( `Player finshed playing with code ${code}` );
		playing.kill('SIGINT');
		
		// Update stats
		let server_stats = Server.updateStats('stopped', 0);
		Server.findOneAndUpdate({ host: process.env.HOST_NAME }, { $set: server_stats }, { upsert: true, new: true })
			.exec(function(err, stats){});
		
	});
	
	return cb;
	
};

var Videos = mongoose.model(process.env.MONGO_VIDEOS_COLL || 'videos', VideosSchema);

VideosSchema.plugin(autoIncrement.plugin, {
    model: 'Videos',
    field: 'order',
    startAt: 1,
    incrementBy: 1
});

var schemas = {
    'Videos': Videos
}

module.exports = schemas;
