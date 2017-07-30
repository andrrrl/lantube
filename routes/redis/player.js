'use strict';

var express = require('express');
var router = express.Router();
const redis = require('../../db/redis');

router.route('/api/player/:player?')
  .get(function (req, res, next) {
    redis.hget('players', req.params.player, function (err, redis_player) {
      res.json(JSON.parse(redis_player));
    });
  })
  .put(function (req, res, next) {

    // let player = JSON.stringify(req.body);
    let player = {
      player: req.body.player,
      player_mode: req.body.player_mode,
      player_volume: req.body.player_volume,
      player_volume_step: req.body.player_volume_step,
      player_is_muted: req.body.player_is_muted
    };

    redis.hmset('players', req.body.player, JSON.stringify(player), (err) => {
      redis.hget('player', req.body.player, (err, redis_player) => {
        res.json(JSON.parse(redis_player));
      });
    });
  });

// Get all players
router.route('/api/players')
  .get(function (req, res, next) {
    redis.hgetall('players', function (err, players) {
      res.json(players);
    });
  });

module.exports = router;
