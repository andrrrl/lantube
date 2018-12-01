"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const redis = require("../../connections/redis");
const express = require("express");
const player_1 = require("./../../controllers/redis/player");
const videos_1 = require("../../controllers/redis/videos");
const Server_1 = require("../../schemas/redis/Server");
module.exports = (io) => {
    let router = express.Router();
    let app = express();
    let PlayerCtrl = new player_1.Player(io);
    let VideosCtrl = new videos_1.Videos(io);
    let ServerCtrl = new Server_1.Server();
    // router.route('/api/player/:player?')
    //     .get((req, res, next) => {
    //         redis.hget('players', req.params.player, (err, redis_player) => {
    //             res.json(JSON.parse(redis_player));
    //         });
    //     })
    //     .put((req, res, next) => {
    //         // let player = JSON.stringify(req.body);
    //         let player = {
    //             player: req.body.player,
    //             playerMode: req.body.player_mode,
    //             playerVolume: req.body.player_volume,
    //             playerVolumeStep: req.body.player_volume_step,
    //             playerIsMuted: req.body.player_is_muted
    //         };
    //         redis.hmset('players', req.body.player, JSON.stringify(player), (err) => {
    //             redis.hget('player', req.body.player, (err, redis_player) => {
    //                 res.json(JSON.parse(redis_player));
    //             });
    //         });
    //     });
    // Get all players
    // router.route('/api/players')
    //     .get((req, res, next) => {
    //         redis.hgetall('players', (err, players) => {
    //             res.json(players);
    //         });
    //     });
    // PLAY
    router.route('/api/player/:id/play')
        .get((req, res, next) => {
        let order = !req.params.id.match(/[a-zA-Z]/g) ? parseInt(req.params.id) : false;
        let id = req.params.id;
        if (!isNaN(parseInt(id))) {
            id = 'video' + id;
        }
        redis.hlen('videos', (err, videos_count) => {
            if (err) {
                console.log(err);
            }
            if (id === 'last') {
                id = 'video' + videos_count;
            }
            redis.hget('videos', id, (err, video) => __awaiter(this, void 0, void 0, function* () {
                video = JSON.parse(video);
                if (err) {
                    console.log(err);
                    res.end();
                }
                else {
                    if (video == null) {
                        res.json({
                            error: 'No hay banda!'
                        });
                    }
                    else {
                        // Play video!
                        PlayerCtrl.play({
                            player: process.env.PLAYER,
                            playerMode: process.env.PLAYER_MODE,
                            videoId: video.videoId,
                            url: video.url,
                            img: video.img,
                            order: video.order,
                            status: 'playing'
                        }).then(() => {
                            res.json({
                                result: 'playing',
                                url: video.url,
                                title: video.title,
                                videoId: video.videoId,
                                order: video.order
                            });
                        }).catch(() => {
                            res.json({
                                result: 'error'
                            });
                        });
                    }
                }
            }));
        });
    });
    // PAUSE
    router.route('/api/player/pause')
        .get((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        yield PlayerCtrl.pause();
        res.json({
            result: 'paused'
        });
    }));
    router.route('/api/player/stop')
        .get((req, res, next) => {
        PlayerCtrl.stopAll().then(result => {
            res.json({
                result: 'stopped'
            });
        }).catch(err => {
            res.json({
                result: 'error'
            });
        });
    });
    router.route('/api/player/prev')
        .get((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let prevVideo = yield PlayerCtrl.playPrev(yield ServerCtrl.getPlayerStats());
        res.json(prevVideo);
    }));
    router.route('/api/player/next')
        .get((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let nextVideo = yield PlayerCtrl.playNext(yield ServerCtrl.getPlayerStats());
        res.json(nextVideo);
    }));
    router.route('/api/player/volume/:volume')
        .get((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let volumeChanged = yield PlayerCtrl.volume(req.params.volume);
        res.json({
            volume: volumeChanged
        });
    }));
    router.route('/api/player/pls')
        .get((req, res, next) => {
        VideosCtrl.getAll('videos').then(videosRedis => {
            let playlist = PlayerCtrl.playlist(videosRedis);
            res.setHeader('Accept-charset', 'utf-8');
            res.setHeader('Content-type', 'audio/x-scpls');
            res.setHeader('Media-type', 'audio/x-scpls');
            res.send(playlist);
            res.end();
        }).catch(err => {
            res.json({
                result: 'error',
                error: err
            });
        });
    });
    router.route('/api/player/playall')
        .get((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let videosRedis = yield VideosCtrl.getAll('videos');
        videosRedis.sort((a, b) => a.order - b.order);
        let firstOrder = videosRedis[0];
        // Play All!
        PlayerCtrl.play({
            player: process.env.PLAYER,
            playerMode: process.env.PLAYER_MODE,
            videoId: firstOrder.videoId,
            url: firstOrder.url,
            img: firstOrder.img,
            order: firstOrder.order - 1,
            status: 'playing'
        }).then(() => {
            res.json({
                result: 'playing',
                url: firstOrder.url,
                title: firstOrder.title,
                videoId: firstOrder.videoId,
                order: firstOrder.order,
                status: 'playing'
            });
        }).catch(() => {
            res.json({
                result: 'error'
            });
        });
    }));
    // /**
    //  * Server ans Player status
    //  */
    router.route('/api/player/stats')
        .get((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        redis.get('playerStats', (err, player_stats) => {
            res.json(JSON.parse(player_stats));
        });
    }));
    return router;
};
//# sourceMappingURL=player.js.map