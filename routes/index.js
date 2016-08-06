var express = require('express');
var router = express.Router();
var request = require('request');
var schemas = require('../db/mongo');

const
	spawn = require( 'child_process' ).spawn;

var 
	Videos = schemas.Videos;

/* GET home page. */

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
	
	console.log(yt_id);
	
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
                url: req.body.video,
                order: req.body.order
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

})

// PLAY
router.route('/api/videos/:order/play')

.get(function(req, res, next) {
	
	Videos.findOne({
        'order': req.params.order
    }).exec(function(err, video) {

        if (err) {
            console.log(err);
        } else {

            if ( typeof video == 'undefined' || typeof video.url == 'undefined' ) {
                res.json({
                    error: 'No hay banda!'
                });
                res.end();
            }

			// Play video!
			const mpv = spawn( 'mpv', [ video.url ] );

			mpv.stdout.on( 'data', data => {
				console.log( `stdout: ${data}` );
			});

			mpv.stderr.on( 'data', data => {
				//console.log( `stderr: ${data}` );
			});

			// Close when video finished (I don't want to generates a playlist, understand?)
			mpv.on( 'close', code => {
				console.log( `mpv finshed playing with code ${code}` );
				mpv.kill('SIGINT');
				res.json({
					next_order: parseInt(req.params.order) + 1
				});
				res.end();
			});

        }
    });
	
});


module.exports = router;
