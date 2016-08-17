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

	let ip = req.headers["X-Forwarded-For"] || req.headers["x-forwarded-for"] || req.client.remoteAddress;

	if ( ip.match( '192.168.' ) || ip == '::1' || ip == '::ffff:127.0.0.1' ) {
		//console.log('Hi you "' + ip + '"');
		next();
	} else {
		res.status(401);
		res.send( 'Yikes! ' + ip + ' is unallowed.');
		res.end();
	}

});

function eventStreamResponse(res, stats) {
	res.setHeader('Content-type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.write('id: ' + (new Date().getMilliseconds()) + '\n');
	res.write('retry: 1000\n');
	res.write('data:' + JSON.stringify(stats) + '\n\n'); // Note the extra newline
	res.end()
}


// Server stats
router.route('/api/videos/stats')
	.get(function(req, res, next){

		Server.findOne({ host: process.env.HOST_NAME || 'localhost' })
			.exec(function(err, stats){

				if ( err )
					console.log(err);

				eventStreamResponse(res, stats);
			});

	});

// GET and render homepage
router.get('/', function(req, res, next) {

	// Render index
	Videos.find({})
	.exec(function(err, videos) {
		if (err) {
			console.log(err);
		} else {
			res.render('index', {
				title: 'Lantube',
				lang: req.headers['accept-language'].slice(0, 2) || 'es',
				videos: videos || {}
			});
			res.end();
		}
	});
	
});

// GET all
router.route('/api/videos')

	// GET ALL VIDEOS
	.get(function(req, res, next) {

	    Videos.find({})
	    .sort({ 'order': 1 })
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
		if ( yt_id == '' ) {
			res.json({
				result: 'error',
				error: 'No video.'
			});
			res.end();
		}
		
		// Get video data from Youtube
	    request({
	        url: 'http://www.youtube.com/oembed?url=' + req.body.video + '&format=json',
	        json: true
	    }, function (error, response, body) {

	        if (!error && response.statusCode === 200) {
	            
	            var video = new Videos({
	                title: body.title,
	                url: req.body.video
	            });
				
	            video.save(function(err, result) {
	                if (err) {
	                    console.log(err);
	                } else {
	                    res.json({
	                        result: 'ok',
	                        _id: result._id,
	                        title: body.title,
	                        url: result.url,
	                        order: result.order
	                    });
	                    res.end();
	                }
	            });
	        }
	    });

});


// parameter middleware that will run before the next routes
router.param('option', function(req, res, next, option) {

    // if numeric, force order to be an integer
    var modified = typeof option == 'number' ? parseInt(option) : option;

    // save id to the request
    req.option = modified;

    next();
});


// GET (load)
router.route('/api/videos/:option')

	.get(function(req, res, next) {
		
		// Filter options
		if ( req.params.option == 'stop' )
			return next();
		if ( req.params.option == 'pls' )
			return next();
		if ( req.params.option == 'playlist' )
			return next();
		if ( req.params.option == 'stats' )
			return next();

		// Default is "order"
	    Videos.findOne({
	        'order': req.params.option || 0
	    }).exec(function(err, video) {

	        if (err) {
	            console.log(err);
	        } else {

	            res.json(video);
	            res.end();
	        }
	    });
	
});


// PLAY
router.route('/api/videos/:order/play')

	.get(function(req, res, next) {
		
		let order = req.params.order == 'last' ? '-order' : req.params.order;
		
		Videos.findOne(
			( order == '-order' ? {} : { order: req.params.order } )
		)
		.sort(order)
		.exec(function(err, video) {

	        if (err) {
	            console.log(err);
	            res.end();
	        } else {

	            if ( video == null ) {
	                res.json({
	                    error: 'No hay banda!'
	                });
					res.end();
	            } else {
					
					// Update stats
					let server_stats = Server.updateStats('playing', video.order, video.title, video.url);
					Server.findOneAndUpdate({ host: process.env.HOST_NAME || 'localhost' }, { $set: server_stats }, { upsert: true, new: true })
						.exec(function(err, stats){});
					
	    			// Play video!
	    			let player = process.env.PLAYER || 'mpv';
	    			let player_option = process.env.PLAYER_OPTION || (player == 'mpv' ? '--fs' : '--');
					video.playThis( player, player_option, video.url, function(err){
						res.json({
							result: 'playing',
							playing: video.url,
							order: video.order
						});
					});
					res.end();
	            }

	        }
	    });
	
});

router.route('/api/videos/stop')
	.get(function(req, res, next){
		
		Videos.stopAll();

		// Update stats
		let server_stats = Server.updateStats('stopped', 0, '', '');
		Server.findOneAndUpdate({ host: process.env.HOST_NAME || 'localhost' }, { $set: server_stats }, { upsert: true, new: true })
			.exec(function(err, stats){});

		res.json({
			result: 'stopped'
		});
		res.end();

	});


router.route('/api/videos/pls')
	.get(function(req, res, next) {
		
		Videos.find({}).exec(function(err, videos){
			
			if ( err ) {
				console.log(err); 
				res.end(); 
			}

			// Generate and serve PLS playlist
			let playlist = '[playlist]\n\n';
			let i = 1;
			videos.forEach(function(video, index){
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
				
				if ( video == null ) {
	                res.json({
						result: 'error',
	                    error: 'No hay lista!'
	                });
	            } else {
				
					// Update stats
					let server_stats = Server.updateStats('playing', 0, 'Full PLS Playlist', '/api/videos/pls');
					Server.findOneAndUpdate({ host: process.env.HOST_NAME || 'localhost' }, { $set: server_stats }, { upsert: true, new: true })
						.exec(function(err, stats){});
				
					// Play PLS playlist!
					let player = process.env.PLAYER || 'mpv';
					let player_option = process.env.PLAYER_OPTION || (player == 'mpv' ? '--fs' : '--');
					let playlist_option = '--playlist';
					video[0].playThis( player, playlist_option, 'http://localhost:3000/api/videos/pls');
						res.json({
							result: 'playlist',
							order: req.params.order
						});
				}
			}
		});
	})

module.exports = router;
