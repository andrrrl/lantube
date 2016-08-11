'use strict';

var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');
const spawn = require( 'child_process' ).spawn;

var VideosSchema = new mongoose.Schema({
	url: {
		type: String,
		required: true
	},
	title: String,
    order: Number
}, {
    collection: 'videos'
});


VideosSchema.methods.stopAll = function(cb) {
	stopEmitter.emit('stopEvent');	
	return cb;
}


const EventEmitter = require('events');
const stopEmitter = new EventEmitter();

VideosSchema.methods.playThis = function(player, player_options, video_url, cb) {
	
	// Play video!
	const playing = spawn( player, [ player_options, video_url ] );
	
	console.log('Starting ' + process.env.PLAYER + ' with ' + ( player_options || 'no options.'));
	
	playing.stdout.on( 'data', data => {
		console.log( `stdout: ${data}` );
	});
	
	playing.stderr.on( 'data', data => {
		//console.log( `stderr: ${data}` );
	});
	
	stopEmitter.on('stopEvent', () => {
		playing.kill('SIGINT');
		console.log('Playback stopped!');
	});
	
	// Close when video finished (I don't want to generates a playlist, understand?)
	playing.on( 'close', code => {
		console.log( `Player finshed playing with code ${code}` );
		playing.kill('SIGINT');
	});
	
	return cb;
	
};

var Videos = mongoose.model('videos', VideosSchema);

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
