'use strict';

var os = require('os');
var request = require('request');
var mongoose = require('mongoose');

var ServerStatsSchema = new mongoose.Schema({
	hostname: {
		type: String,
		required: true
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
	video_order: Number
}, {
    collection: 'serverStats'
});

ServerStatsSchema.statics.updateStats = function(status, order) {
	
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
		video_order: order
	}
	
	return stats;
};

var Server = mongoose.model('serverStats', ServerStatsSchema);

var serverSchema = {
    'Server': Server
}

module.exports = serverSchema;