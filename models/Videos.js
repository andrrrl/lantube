'use strict';

const
    request = require('request'),
    mongoose = require('mongoose'),
    spawn = require('child_process').spawn;

// Load Server Model
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

VideosSchema.statics.isValid = function(id) {
	return mongoose.Types.ObjectId.isValid(id);
}

VideosSchema.statics.stopAll = function(cb) {
	stopEmitter.emit('stopEvent');
	return cb;
}

// TODO
// VideosSchema.methods.togglePause = function(player) {
//   How the hell am I gonna accomplish this? <_<
// }

VideosSchema.methods.playThis = function(player_options, cb) {

	stopEmitter.emit('stopEvent');

	let player = player_options.player || process.env.PLAYER;
	let video_url = player_options.url || '';

	let player_playlist = player_options.player_playlist === true ? process.env.PLAYER_PLAYLIST : process.env.PLAYER_NO_PLAYLIST;
	let player_mode = player_options.player_mode || process.env.PLAYER_MODE || 'windowed';

	let player_mode_arg = '';

	// Switch?
	if (player_mode == 'windowed') {
		player_mode_arg = process.env.PLAYER_NO_PLAYLIST;
	}
	if (player_mode == 'fullscreen') {
		player_mode_arg = process.env.PLAYER_MODE_FULLSCREEN_ARG;
	}
	if (player_mode == 'audio-only') {
		player_mode_arg = process.env.PLAYER_MODE_AUDIO_ONLY_ARG;
	}

	var playing = spawn(player, [player_mode_arg, player_playlist, video_url]);

	// Counter for retrying (if slow connection, etc)
	var stuck = 0;

	// Play video!
	playing.stdout.on('data', data => {
		console.log('Starting playback with ' + (JSON.stringify(player_options) || 'no options.'));
		console.log(`stdout: ${data}`);

		// Check if connection is stuck (only mpv / mplayer)
		if (data.toString().match(/Cache is not responding/)) {

			stuck++;

			// If video is stuck after 20 retries, stop it and play again
			if (stuck == 20) {
				setTimeout(function() {

					Videos.stopAll(function() {

						Videos.playThis(player_options, function() {
							console.log('Connection stuck, retrying...');
						});

					});

				}, 5000);
			}
		}

	});

	playing.stderr.on('data', data => {
		// will print stuff continuously...
		// console.log( `stderr: ${data}` );
	});

	stopEmitter.on('stopEvent', () => {
		playing.kill('SIGINT');
		console.log('Playback stopped!');
	});

	// Close when video finished (I don't want to generates a playlist, understand?)
	playing.on('close', code => {
		console.log(`Player finshed playing with code ${code}`);
		playing.kill('SIGINT');

		// Update stats
		let server_stats = Server.updateStats('stopped', 0);
		Server.findOneAndUpdate({ host: process.env.HOST_NAME }, { $set: server_stats }, { upsert: true, new: true })
			.exec(function(err, stats) {
				console.log('Player closed.');
			});

	});

	return cb;

};


VideosSchema.post('save', function(next) {
    Videos
        .find()
        .sort({ _id: 1 })
        .exec(function(err, videos){
            
            for ( let i = 0; i < videos.length; i++ ) {
                Videos
                    .findOneAndUpdate({ id: videos[i]._id })
                    .set({ order: i+i })
                    .exec(function(err, video){
                        
                        if (err) console.log(err);
                        
                        // Reordered ok
                    });
            }
            
        });
});

VideosSchema.post('remove', function(next) {
    Videos
        .find()
        .sort({ _id: 1 })
        .exec(function(err, videos){
            
            for ( let i = 0; i < videos.length; i++ ) {
                Videos
                    .findOneAndUpdate({ id: videos[i]._id })
                    .set({ order: i+i })
                    .exec(function(err, video){
                        
                        if (err) console.log(err);
                        
                        // Reordered ok
                    });
            }
            
        });
        
});

var Videos = mongoose.model(process.env.MONGO_VIDEOS_COLL || 'videos', VideosSchema);


var schemas = {
	'Videos': Videos
}

module.exports = schemas;
