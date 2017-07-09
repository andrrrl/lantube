'use strict';

const
	os = require('os'),
	request = require('request'),
	mongoose = require('mongoose');
	require('./Player');

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
	video_img: String,
	player: [{ 
		type: mongoose.Schema.Types.ObjectId, 
		ref: 'Player' 
	}]
}, {
	collection: process.env.MONGO_STATS_COLL
});

ServerStatsSchema.statics.getStat = function(stat, cb) {
	Server.findOne(
		{ host: process.env.HOST_NAME } )
		.exec(function(err, server_stat) {
			if (err) {
				console.log(err);
			}
			return cb(server_stat[stat]);
		});
};

ServerStatsSchema.statics.updateStats = function(status, id, title, url, img) {

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
		video_img: img
	}

	return stats;
};



var Server = mongoose.model(process.env.MONGO_STATS_COLL || 'serverStats', ServerStatsSchema);

var serverSchema = {
	'Server': Server
}

module.exports = serverSchema;