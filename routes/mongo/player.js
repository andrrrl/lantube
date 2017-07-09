'use strict';

var express = require('express');
var router = express.Router();

var player_schema = require('../../models/' + process.env.DB_TYPE + '/Player');
var Player = player_schema.Player;

router.get('/api/player', function (req, res, next) {
  Player.findOne({})
    .exec((err, player_stats) => {
      res.json(player_stats);
      res.end();
    });
});

// Get player options
router.route('/api/videos/player')
  .get(function (req, res, next) {
    Player.findOne({})
      .exec(function (err, player) {

        if (err) {
          console.log(err);
        } else {
          res.json(player);
          res.end();
        }

      });
  })
  .put(function (req, res, next) {
    Player.findOneAndUpdate({
        player: process.env.PLAYER
      }, {
        player_mode: req.body.video_mode
      }, {
        new: true
      })
      .exec(function (err, player) {

        console.log(player);

        //res.json(player.player_mode);
        res.end();
      });
  });

/**
 * VOLUME
 */
router.get('/api/player/volume', function (req, res, next) {
  Player.getVolume('player_volume', function (vol) {
    res.json({
      serverVol: vol,
      serverVolStep: process.env.PLAYER_VOLUME_STEP
    });
    res.end();
  });
});

router.get('/api/player/volume/:action', function (req, res, next) {

  if (req.params.action == '')
    Player.getVolume('player_volume', function (vol) {
      res.json({
        serverVol: vol,
        serverVolStep: process.env.PLAYER_VOLUME_STEP
      });
      res.end();
    });

  Player.setVolume({
    action: req.params.action
  }, function (vol) {
    res.json({
      player_volume: vol.player_volume,
      player_volume_step: process.env.PLAYER_VOLUME_STEP,
      player_is_muted: vol.isMuted
    });
    res.end();
  });


});

module.exports = router;
