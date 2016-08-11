'use strict';

var express = require('express');
var router = express.Router();
var request = require('request');
var schemas = require('../models/Videos');

var Videos = schemas.Videos;


// Disallow non-LAN or Local IPs
router.use(function(req, res, next) {
	
	let ip = req.headers["X-Forwarded-For"] || req.headers["x-forwarded-for"] || req.client.remoteAddress;
	
	if ( ip.match( '192.168.' ) || ip == '::1' || ip == '::ffff:127.0.0.1' ) {
		console.log('Hi ' + ip);
		next();
	} else {
		res.status(401);
		res.send( ip + ' is unallowed.');
		res.end();
	}

});

// GET and render homepage
router.get('/', function(req, res, next) {

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
	        }
	    });
	
});

// GET all
router.route('/api/videos')

	// GET ALL
	.get(function(req, res, next) {

	    Videos.find({})
	    .sort({ 'order': -1 })
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

		var yt_id = req.body.video.trim().replace(/http(s?):\/\/(w{3}?)(\.?)youtube\.com\/watch\?v=/, '');
		
		if ( yt_id == '' ) {
			res.json({
				result: 'error',
				message: 'No video.'
			});
			res.end();
		}
		
	    var yt_json = 'http://www.youtube.com/oembed?url=' + req.body.video + '&format=json';
		
	    request({
	        url: yt_json,
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
router.param('id', function(req, res, next, id) {

    // check if the Bordado with that id exists
    // TODO: do some validations
    var modified = id.toString();

    // save id to the request
    req.id = modified;

    next();
});


// GET (load)
router.route('/api/videos/:id')

	.get(function(req, res, next) {

		if ( req.params.id == 'stop' )
			return next();
		if ( req.params.id == 'pls' )
			return next();
		if ( req.params.id == 'playlist' )
			return next();

	    Videos.findOne({
	        '_id': req.params.id
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
	            } else {
	    			// Play video!
	    			let player = process.env.PLAYER || 'mpv';
	    			let player_option = process.env.PLAYER_OPTION || ' ';
					video.playThis( player, player_option, video.url );
					res.json({
						playing: video.url,
						order: video.order
					});
	            }

				res.end();
	        }
	    });
	
});

router.route('/api/videos/stop')
	.get(function(req, res, next){
		
		let video_stop = new Videos();
		res.send(video_stop.stopAll());
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
	                    error: 'No hay lista!'
	                });
	            } else {
				
					console.log(process.env.PLAYER_OPTION);
				
					// Play PLS playlist!
					let player = process.env.PLAYER || 'mpv';
					let player_option = process.env.PLAYER_OPTION || ' ';
					let playlist_option = '--playlist';
					video[0].playThis( player, playlist_option, 'http://127.0.0.1:3000/api/videos/pls');
						res.json({
							playing: 'PLS playlist',
							order: req.params.order
						});
				}
			}
		});
	})

module.exports = router;
