'use strict';

var os = require('os');
var request = require('request');
var mongoose = require('mongoose');

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
	video_order: Number,
	video_title: String,
	video_url: String,
	player: String,
	player_playlist: String,
	player_fullscreen: String
}, {
    collection: process.env.MONGO_STATS_COLL
});

ServerStatsSchema.statics.updateStats = function(status, order, title, url) {
	
	var stats = {
		type: os.type(),
		platform: os.platform(),
		arch: os.arch(),
		release: os.release(),
		uptime: os.uptime(),
		loadaverage: os.loadavg(),
		totalmem: os.totalmem(),
		freemem: os.freemem(),
		status: status,
		video_order: order,
		video_title: title,
		video_url: url,
		player: process.env.PLAYER || false,
		player_playlist: process.env.PLAYER_PLAYLIST || false,
		player_fullscreen: process.env.PLAYER_FULLSCREEN || false
	}
	
	return stats;
};

ServerStatsSchema.statics.getPlayer = function(player) {
	
	//Server.findOne({ host: process.env.HOST_NAME }).exec(function(err, player){
		
		var env = {
			player: player.player || process.env.PLAYER || false,
			player_playlist: player.player_playlist || process.env.PLAYER_PLAYLIST || false,
			player_fullscreen: player.player_fullscreen || process.env.PLAYER_FULLSCREEN || false
		}
		return env;
	//});
	
}

var Server = mongoose.model(process.env.MONGO_STATS_COLL || 'serverStats', ServerStatsSchema);

var serverSchema = {
    'Server': Server
}

module.exports = serverSchema;