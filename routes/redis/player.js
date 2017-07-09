'use strict';

var express = require('express');
var router = express.Router();
const redis = require('../../db/redis');

router.get('/api/player', function (req, res, next) {
  redis.hgetall('player_stats', function (err, player_stats) {
    res.json(player_stats);
  });
});

// Get player options
router.route('/api/videos/player')
  .get(function (req, res, next) {
    redis.hgetall('player', function (err, player_stats) {
      res.json(player_stats);
    });
  })
  .put(function (req, res, next) {

    redis.hset(['player', 'player', process.env.PLAYER]);
    redis.hset(['player', 'player_mode', req.body.video_mode], function (err, player) {
      res.json(player);
    });
  });


module.exports = router;
