"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import * as redisClient from 'redis';
const express = require("express");
let redis = require('../../connections/redis');
let router = express.Router();
// let redis = redisClient.createClient();
// redis.on("error", function (err) {
//   console.log("Error " + err);
// });
// redis.once('connect', () => {
//   console.log('Redis connected!');
// });
router.route('/api/player/:player?')
    .get((req, res, next) => {
    redis.hget('players', req.params.player, (err, redis_player) => {
        res.json(JSON.parse(redis_player));
    });
})
    .put((req, res, next) => {
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
    .get((req, res, next) => {
    redis.hgetall('players', (err, players) => {
        res.json(players);
    });
});
module.exports = router;
//# sourceMappingURL=player.js.map