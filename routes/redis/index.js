'use strict';

var express = require('express');
var router = express.Router();
var request = require('request');

var schema = require('../../models/' + process.env.DB_TYPE + '/Videos');
var Videos = schema;

var server_schema = require('../../models/' + process.env.DB_TYPE + '/Server');
var Server = server_schema.Server;

const redis = require('../../db/redis');

var player = require('./player');

// Disallow non-LAN or Local IPs
router.use(function (req, res, next) {

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
  res.setHeader('Content-type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

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

/**
 * Server stats
 */
router.route('/api/videos/stats')
  .get(function (req, res, next) {

    // Server.findOne({
    //     host: process.env.HOST_NAME || 'localhost'
    //   })
    //   .exec(function (err, stats) {
    //     if (err) console.log(err);
    //     // Send stats to client
    //     eventStreamResponse('stats', res, stats);
    //   });

    redis.hgetall(process.env.HOST_NAME, function (err, stats) {
      if (err) console.log(err);
      // Send stats to client
      eventStreamResponse('stats', res, stats);
    });

  })
  .patch(function (req, res, next) {

    redis.hmset(process.env.HOST_NAME, {
      player_mode: req.body.player_mode
    });

    redis.hgetall(process.env.HOST_NAME, function (err, stats) {

      res.json({
        player_options: stats
      });
    })


  });

// GET and render homepage
router.get('/', function (req, res, next) {

  redis.hmset(process.env.HOST_NAME, {
    player: process.env.PLAYER,
    player_mode: process.env.PLAYER_MODE,
    player_playlist: process.env.PLAYER_PLAYLIST
  });

  redis.hgetall(process.env.HOST_NAME, function (err, env_player) {
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


// GET all
router.route('/api/videos/')

  // GET ALL VIDEOS
  .get(function (req, res, next) {

    redis.hgetall('videos', function (err, videos_redis) {
      let videos = [];
      let i = 1;
      for (let video in videos_redis) {
        videos.push(JSON.parse(videos_redis[String('video' + i)]));
        i++;
      }
      res.json(videos);
      res.end();
    });

  })

  // POST (insert)
  .post(function (req, res, next) {

    // Extract Youtube video ID
    var yt_id = req.body.video.trim().replace(/http(s?):\/\/(w{3}?)(\.?)youtube\.com\/watch\?v=/, '');

    // Check ID
    if (yt_id === '') {
      res.json({
        result: 'error',
        error: 'No video.'
      });
    } else {
      if (yt_id.indexOf('http') === -1 && yt_id.indexOf('youtube') > -1) {
        yt_id = 'https://www.' + yt_id;

      } else if (yt_id.indexOf('youtube') === -1) {
        yt_id = 'https://www.youtube.com/watch?v=' + yt_id;
      }
    }

    // Get video data from Youtube embed API
    request({
      url: 'http://www.youtube.com/oembed?url=' + req.body.video + '&format=json',
      json: true
    }, function (error, response, body) {

      if (!error && response.statusCode === 200) {

        redis.hlen('videos', (err, videos_count) => {
          if (err) {
            console.log(err);
          }
          let video_id = 'video' + Number(videos_count + 1);
          let title = body.title.replace(/"/g, '');

          //   console.log({
          //     _id: video_id,
          //     title: body.title,
          //     url: req.body.video,
          //     img: body.thumbnail_url,
          //     order: videos_count + 1
          //   });
          //   res.end();



          // Redis no acepta objetos JSON aun... ¬_¬
          let video_string = '{ "_id": "' + video_id + '",' +
            '"title": "' + title + '" ,' +
            '"url": "' + yt_id + '",' +
            '"img": "' + body.thumbnail_url + '",' +
            '"order": ' + String(videos_count + 1) + '}';

          redis.hmset('videos', String(video_id), video_string, (err) => {
            redis.hget('videos', video_id, (err, video) => {

              // console.log(JSON.parse(video));

              // res.end(JSON.parse(video));

              let vid = JSON.parse(video);
              res.json({
                result: 'ok',
                _id: vid._id,
                title: vid.title,
                url: vid.url,
                img: vid.img,
                order: vid.order
              });

            });
          });


        });
      }


    });
  });


// parameter middleware that will run before the next routes
router.param('id', function (req, res, next, option) {

  // TODO: Add some checks
  req.option = option;


  next();
});


// GET (load)
router.route('/api/videos/:option')

  .get(function (req, res, next) {

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
    redis.hgetall(req.params.option, function (err, video) {

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
  .get(function (req, res, next) {

    Videos.find({})
      .sort({
        _id: 1
      })
      .exec(function (err, videos) {
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

  .get(function (req, res, next) {

    let order = !req.params.id.match(/[a-zA-Z]/g) ? parseInt(req.params.id) : false;
    let id = req.params.id;

    redis.hlen('videos', (err, videos_count) => {
      if (err) {
        console.log(err);
      }
      if (id === 'last') {
        id = 'video' + videos_count;
      }
      redis.hget('videos', id, function (err, video) {

        video = JSON.parse(video);

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
            //   let server_stats = Server.updateStats('playing', video._id, video.title, video.url, video.img);

            // Play video!
            Videos.playThis({
              player: process.env.PLAYER,
              player_mode: process.env.PLAYER_MODE,
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


          }

        }
      });
    });



  });

router.route('/api/videos/stop')
  .get(function (req, res, next) {

    Videos.stopAll();

    // Update stats
    let server_stats = Server.updateStats('stopped', 0, '', '', '');

    res.json({
      result: 'stopped'
    });

  });


router.route('/api/videos/pls')
  .get(function (req, res, next) {

    redis.hgetall('videos', function (err, videos_redis) {

      if (err) {
        console.log(err);
        res.end();
      }

      // Generate and serve PLS playlist
      let playlist = '[playlist]\n\n';
      let i = 1;

      let videos = [];
      for (let video in videos_redis) {
        videos.push(JSON.parse(videos_redis[video]));
      }

      videos.forEach(function (video, index) {
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
  .get(function (req, res, next) {

    redis.hgetall('videos', function (err, videos_redis) {
      if (err) {
        console.log(err);
        res.end();
      } else {

        let videos = [];
        for (let video in videos_redis) {
          videos.push(JSON.parse(videos_redis[video]));
        }

        if (videos == null) {
          res.json({
            result: 'error',
            error: 'No hay nada en la lista!'
          });
        } else {

          // Update stats
          let server_stats = Server.updateStats('playing', 0, 'Full PLS Playlist', '/api/videos/pls', '');


          // Play PLS playlist!
          Videos.playThis({
            player: process.env.PLAYER,
            player_mode: process.env.PLAYER_MODE,
            playlist: true,
            url: 'http://localhost:3000/api/videos/pls'
          });
          res.json({
            result: 'playlist',
            _id: req.params.id
          });


        }
      }
    });
  });

// Not implemented yet!
router.route('/api/videos/delete/:order')
  .get(function (req, res, next) {

    Videos.remove(req.params).exec(function (err, removed) {
      Videos.reorder(function (next) {
        //res.json(req);
        res.end();
        next();
      });
    });

  });

module.exports = router;
