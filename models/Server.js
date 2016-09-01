'use strict';

const 
	os = require('os'),
	request = require('request'),
	mongoose = require('mongoose'),
	exec = require('child_process').exec;

var ServerStatsSchema = new mongoose.Schema({
	host: {
		type: String,
		required: true,
		default: process.env.HOST_NAME || 'localhost'
	},
	os_type: String,
	platform: String,
	arch: String,
	release: String,
	uptime: Date,
	loadaverage: String,
	totalmem: String,
	freemem: String,
	status: {
		type: String,
		enum: ['playing', 'stopped', 'idle'],
		default: 'idle'
	},
	video_id: String,
	video_title: String,
	video_url: String,
	player: String,
	player_mode: String,
	player_volume: {
		type: Number,
		default: 50
	},
	player_is_muted: { 
		type: Boolean, 
		default: false 
	}
}, {
	collection: process.env.MONGO_STATS_COLL
});

ServerStatsSchema.statics.updateStats = function(status, id, title, url) {

	let stats = {
		type: os.type(),
		platform: os.platform(),
		arch: os.arch(),
		release: os.release(),
		uptime: os.uptime(),
		loadaverage: os.loadavg(),
		totalmem: os.totalmem(),
		freemem: os.freemem(),
		status: status,
		video_id: id || 0,
		video_title: title,
		video_url: url,
		player: process.env.PLAYER || '',
		player_playlist: process.env.PLAYER_PLAYLIST || ''
	}

	return stats;
};

ServerStatsSchema.statics.getPlayer = function(player) {

	let env = {
		player: process.env.PLAYER || false,
		player_playlist: process.env.PLAYER_PLAYLIST || false,
		player_mode: process.env.PLAYER_MODE || 'windowed'
	}
	return env;

}

// Config Sys Vol
ServerStatsSchema.statics.configVolume = function(options) 
{
	let volume = {
		player_volume: options.volume,
		player_is_muted: options.isMuted
	}
	
	return volume;
	
}

// Get Sys Vol
ServerStatsSchema.statics.getVolume = function(volume_value, cb) {
	Server.findOne(
		{ host: process.env.HOST_NAME }, 
		{ player_volume: 1, player_is_muted: 1 }
	)
	.exec(function(err, server_volume){
		
		if (err) console.log(err);
		
		cb(server_volume[volume_value]);
	});
}

// Set Sys Vol
// 
// We're talking about dB (decibel) so have in mind that:
// 0. dB values are in hexadecimal
// 1. 0dB is max volume
// 2. -64dB is min volume (mute)
ServerStatsSchema.statics.setVolume = function(options, cb) {

	// Get current volume value
	Server.getVolume('player_volume', function(serverVol){
		
		// serverVol = serverVol || 50;
		
		let stepVol = parseInt( process.env.PLAYER_VOLUME_STEP || 4 );
		
		switch (options.action) {
			case 'up':
				if ( serverVol < 0 ) {
					exec('amixer -c 0 set Master ' + stepVol + 'DB+');
					serverVol += stepVol;
				} else {
					exec('amixer -c 0 set Master 0DB');
					serverVol = 0;
				}
			break;
			case 'down':
				if ( serverVol > -100 ) {
					exec('amixer -c 0 set Master ' + stepVol + 'DB-');
					serverVol -= stepVol;
				} else {
					exec('amixer -c 0 set Master -64DB');
					serverVol = -100;
				}
			break;
			case 'mute':
				exec('amixer -c 0 set Master -64DB');
			break;
			case 'unmute':
				exec('amixer -c 0 set Master ' + serverVol + 'DB+')
			break;
				
		}
		
		// Update stats
		let server_stats = Server.configVolume({ volume: serverVol, isMuted: options.isMuted });
		Server.findOneAndUpdate({ host: process.env.HOST_NAME }, { $set: server_stats }, { upsert: true, new: true })
			.exec(function(err, stats) {
				return cb(stats);
			});
		
	});

}

var Server = mongoose.model(process.env.MONGO_STATS_COLL || 'serverStats', ServerStatsSchema);

var serverSchema = {
	'Server': Server
}

module.exports = serverSchema;