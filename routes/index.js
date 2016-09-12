'use strict';

var express = require('express');
var router = express.Router();
var request = require('request');
var schema = require('../models/Videos');
var server_schema = require('../models/Server');

var Videos = schema.Videos;
var Server = server_schema.Server;

// Disallow non-LAN or Local IPs
router.use(function(req, res, next) {

	let ip = req.headers['X-Forwarded-For'] || req.headers['x-forwarded-for'] || req.client.remoteAddress;

	if (ip.match('192.168.') || ip == '::1' || ip == '::ffff:127.0.0.1') {
		next();
	} else {
		res.status(401);
		res.send('Yikes! ' + ip + ' is NOT allowed.');
		res.end();
	}

});

function eventStreamResponse(type, res, results) {
	// Headers
	res.setHeader('Content-type', 	'text/event-stream');
	res.setHeader('Cache-Control', 	'no-cache');
	res.setHeader('Connection', 	'keep-alive');

	// Message
	res.write('id: ' + (new Date().getMilliseconds()) + '\n');
	res.write('retry: 1000\n');

	if (type === 'stats') {
		res.write('data:' + JSON.stringify(results) + '\n\n'); // Note the extra newline
	} else if (type === 'added') {
		res.write('data:' + JSON.stringify(results) + '\n\n'); // Note the extra newline
	}
	res.end();
}

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

/**
 * Server stats
 */
router.route('/api/videos/stats')
	.get(function(req, res, next) {

		Server.findOne({ host: process.env.HOST_NAME || 'localhost' })
			.exec(function(err, stats) {
				if (err) console.log(err);
				// Send stats to client
				eventStreamResponse('stats', res, stats);
			});

	})
	.patch(function(req, res, next) {

		Server.findOneAndUpdate({ host: process.env.HOST_NAME }, { player_mode: req.body.player_mode }, { upsert: true })
			.exec(function(err, env_player) {
				res.json({
					player_options: env_player
				});
				res.end();
			});

	});


// Get player options
router.route('/api/videos/player')
	.get(function(req, res, next) {
		Server.findOne({ host: process.env.HOST_NAME || 'localhost' })
			.exec(function(err, player) {

				if (err) {
					console.log(err);
				} else {
					res.json(player);
					res.end();
				}

			});
	})
	.put(function(req, res, next) {
		Server.findOneAndUpdate({ host: process.env.HOST_NAME }, { player_mode: req.body.video_mode }, { new: true })
			.exec(function(err, player) {
				res.json(player.player_mode);
				res.end();
			});
	});

// GET and render homepage
router.get('/', function(req, res, next) {

	Server.findOneAndUpdate(
		{ host: process.env.HOST_NAME }, 
		{ player: process.env.PLAYER, player_mode: process.env.PLAYER_MODE, player_playlist: process.env.PLAYER_PLAYLIST }, 
		{ upsert: true })
		.exec(function(err, env_player) {

			// Render index
			Videos.find().exec(function(err, videos) {
				if (err) {
					console.log(err);
				} else {
					res.render('index', {
						title: 'Lantube',
						lang: req.headers['accept-language'].slice(0, 2) || 'es',
						player_options: env_player
					});
					res.end();
				}
			});

		});

});

// GET all
router.route('/api/videos/')

// GET ALL VIDEOS
.get(function(req, res, next) {

	Videos.find({})
		.sort({ _id: 1 })
		.exec(function(err, videos) {
			if (err) {
				console.log(err);
			} else {
				res.json(videos);
				res.end();
			}

		});
})

// POST (insert)
.post(function(req, res, next) {

	// Extract Youtube video ID
	var yt_id = req.body.video.trim().replace(/http(s?):\/\/(w{3}?)(\.?)youtube\.com\/watch\?v=/, '');

	// Check ID
	if (yt_id == '') {
		res.json({
			result: 'error',
			error: 'No video.'
		});
		res.end();
	}

	// Get video data from Youtube embed API
	request({
		url: 'http://www.youtube.com/oembed?url=' + req.body.video + '&format=json',
		json: true
	}, function(error, response, body) {

		if (!error && response.statusCode === 200) {

			var video = new Videos({
				title: body.title,
				url: req.body.video,
				img: body.thumbnail_url
			});

			video.save(function(err, result) {
				if (err) {
					console.log(err);
				} else {

					Videos.reorder(function() {
						res.json({
							result: 'ok',
							_id: result._id,
							title: body.title,
							url: result.url,
							img: result.img,
							order: result.order
						});
					});

				}
			});
		}
	});

	next();

});


// parameter middleware that will run before the next routes
router.param('id', function(req, res, next, option) {

	// TODO: Add some checks
	req.option = option;


	next();
});


// GET (load)
router.route('/api/videos/:option')

.get(function(req, res, next) {

	// Filter options
	if (req.params.option == 'list')
		return next();
	if (req.params.option == 'stop')
		return next();
	if (req.params.option == 'pls')
		return next();
	if (req.params.option == 'playlist')
		return next();
	if (req.params.option == 'stats')
		return next();
	if (req.params.option == 'player')
		return next();
	if (req.params.option == 'delete')
		return next();

	// Default is "_id"
	Videos.findOne({
		_id: req.params.option
	}).exec(function(err, video) {

		if (err) {
			console.log(err);
		} else {
			res.json(video);
			res.end();
		}

		next();

	});

});


// LIST
router.route('/api/videos/list')
	.get(function(req, res, next) {

		Videos.find({})
			.sort({ _id: 1 })
			.exec(function(err, videos) {
				if (err) {
					console.log(err);
				} else {
					res.json(videos);
					res.end();
				}

			});
	});


// PLAY
router.route('/api/videos/:id/play')

.get(function(req, res, next) {

	let order = !req.params.id.match(/[a-zA-Z]/g) ? parseInt(req.params.id) : false;
	let id = Videos.isValid(req.params.id) ? req.params.id : false;
	let query = {};
	let sort = '-order';

	if (order > 0) {
		query = { order: order };
	} else if (Videos.isValid(id)) {
		query = { _id: id };
	}


	Videos
		.findOne(query)
		.sort(sort)
		.exec(function(err, video) {

			if (err) {
				console.log(err);
				res.end();
			} else {
				if (video == null) {
					res.json({
						error: 'No hay banda!'
					});
					res.end();
				} else {

					// Update stats
					let server_stats = Server.updateStats('playing', video._id, video.title, video.url, video.img);
					Server.findOneAndUpdate({ host: process.env.HOST_NAME || 'localhost' }, { $set: server_stats }, { upsert: true, new: true })
						.exec(function(err, stats) {

							// Play video!
							video.playThis({
								player: stats.player,
								player_mode: stats.player_mode,
								player_playlist: '',
								url: video.url,
								img: video.img
							});

							res.json({
								result: 'playing',
								playing: video.url,
								title: video.title,
								_id: video._id
							});
							res.end();

						});

				}

			}
		});

});

router.route('/api/videos/stop')
	.get(function(req, res, next) {

		Videos.stopAll();

		// Update stats
		let server_stats = Server.updateStats('stopped', 0, '', '', '');
		Server.findOneAndUpdate({ host: process.env.HOST_NAME || 'localhost' }, { $set: server_stats }, { upsert: true, new: true })
			.exec(function(err, stats) {

				res.json({
					result: 'stopped'
				});
				res.end();

			});

	});


router.route('/api/videos/pls')
	.get(function(req, res, next) {

		Videos.find({}).exec(function(err, videos) {

			if (err) {
				console.log(err);
				res.end();
			}

			// Generate and serve PLS playlist
			let playlist = '[playlist]\n\n';
			let i = 1;
			videos.forEach(function(video, index) {
				playlist += 'Title' + i + '=' + video.title + '\n';
				playlist += 'File' + i + '=' + video.url + '\n\n';
				i++;
			});

			playlist += 'NumberOfEntries=' + videos.length;

			res.setHeader('Accept-charset', 'utf-8');
			res.setHeader('Content-type', 'audio/x-scpls');
			res.setHeader('Media-type', 'audio/x-scpls');
			res.send(playlist);
			res.end();

		});

	});

router.route('/api/videos/playlist')
	.get(function(req, res, next) {

		Videos.find({}).exec(function(err, video) {
			if (err) {
				console.log(err);
				res.end();
			} else {

				if (video == null) {
					res.json({
						result: 'error',
						error: 'No hay lista!'
					});
				} else {

					// Update stats
					let server_stats = Server.updateStats('playing', 0, 'Full PLS Playlist', '/api/videos/pls', '');
					Server.findOneAndUpdate({ host: process.env.HOST_NAME || 'localhost' }, { $set: server_stats }, { upsert: true, new: true })
						.exec(function(err, stats) {

							// Play PLS playlist!
							video[0].playThis({
								player: stats.player,
								player_mode: stats.player_mode,
								playlist: true,
								url: 'http://localhost:3000/api/videos/pls'
							});
							res.json({
								result: 'playlist',
								_id: req.params.id
							});

						});

				}
			}
		});
	});

// Not implemented yet!
router.route('/api/videos/delete/:order')
	.get(function(req, res, next) {

		Videos.remove(req.params).exec(function(err, removed) {
			Videos.reorder(function(next) {
				//res.json(req);
				res.end();
				next();
			});
		});

	});

module.exports = router;