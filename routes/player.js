'use strict';

var express = require('express');
var router = express.Router();
var request = require('request');
var server_schema = require('../models/Server');

var Server = server_schema.Server;

router.get('/api/player', function(req, res, next) {
	res.json({ api: 'player' });
	res.end();
});

/**
 * VOLUME
 */
router.get('/api/player/volume', function(req, res, next) {
	Server.getVolume('player_volume', function(vol) {
		res.json({
			serverVol: vol,
			serverVolStep: process.env.PLAYER_VOLUME_STEP
		});
		res.end();
	});
});

router.get('/api/player/volume/:action', function(req, res, next) {

	if (req.params.action == '')
		next();

	Server.setVolume({ action: req.params.action }, function(vol) {
		res.json({
			player_volume: vol.player_volume,
			player_volume_step: process.env.PLAYER_VOLUME_STEP,
			player_is_muted: vol.isMuted
		});
		res.end();
	});


});

module.exports = router;
