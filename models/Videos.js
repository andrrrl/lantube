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

VideosSchema.methods.playThis = function(player, player_options, video_url, cb) {
	
	// Play video!
	const playing = spawn( player, [ player_options, video_url ] );
	
    player_options = player_options == '--' ? null : player_options;
	
	var stuck = 0;
	
	playing.stdout.on( 'data', data => {
        console.log( 'Starting ' + process.env.PLAYER + ' with ' + ( player_options || 'no options.') );
		console.log( `stdout: ${data}` );
		
		// Check if connection is stuck (only mpv / mplayer)
		if ( data.toString().match(/Cache is not responding/) ) {
		
			stuck++;
		
			// If video is stuck after 20 retries, stop it and play again
			if ( stuck == 20 ) {
				setTimeout(function(){
				
					Videos.stopAll(function(){
						
						Videos.playThis(player, player_options, video_url, function(){
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
