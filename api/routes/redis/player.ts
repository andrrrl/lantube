import * as redis from '../../connections/redis';
import * as express from 'express';
import { Player } from './../../controllers/redis/player';

export = (io) => {
    let router = express.Router();
    let app = express();

    let PlayerCtrl = new Player(io);

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
                redis.hget('videos', id, async (err, video: any) => {

                    video = JSON.parse(video);

                    if (err) {
                        console.log(err);
                        res.end();
                    } else {
                        if (video == null) {
                            res.json({
                                error: 'No hay banda!'
                            });
                        } else {
                            // Play video!
                            PlayerCtrl.play({
                                player: process.env.PLAYER,
                                playerMode: process.env.PLAYER_MODE,
                                _id: video._id,
                                url: video.url,
                                img: video.img,
                                order: video.order,
                                status: 'playing'
                            });

                            res.json({
                                result: 'playing',
                                url: video.url,
                                title: video.title,
                                _id: video._id,
                                order: video.order
                            });

                        }

                    }
                });
            });

        });

    // PAUSE
    router.route('/api/player/pause')
        .get(async (req, res, next) => {
            await PlayerCtrl.pause();
            res.json({
                result: 'paused'
            });

        });

    router.route('/api/player/stop')
        .get(async (req, res, next) => {
            await PlayerCtrl.stopAll(true);
            res.json({
                result: 'stopped'
            });
        });

    router.route('/api/player/next')
        .get(async (req, res, next) => {
            let nextVideo = await PlayerCtrl.playNext();
            res.json(nextVideo);
        });




    router.route('/api/player/volume/:volume')
        .get(async (req, res, next) => {

            let volumeChanged = await PlayerCtrl.volume(req.params.volume);
            res.json({
                volume: volumeChanged
            });

        });


    router.route('/api/player/pls')
        .get((req, res, next) => {
            redis.hgetall('videos', (err, videos_redis) => {

                if (err) {
                    console.log(err);
                    res.end();
                }

                let playlist = PlayerCtrl.playlist(videos_redis);

                res.setHeader('Accept-charset', 'utf-8');
                res.setHeader('Content-type', 'audio/x-scpls');
                res.setHeader('Media-type', 'audio/x-scpls');
                res.send(playlist);
                res.end();
            });
        });

    router.route('/api/player/playlist')
        .get((req, res, next) => {

            redis.hgetall('videos', (err, videos_redis) => {
                if (err) {
                    res.end(err);
                } else {

                    if (videos_redis == null) {
                        res.json({
                            result: 'error',
                            error: 'No hay nada en la lista!'
                        });
                    } else {

                        // Play PLS playlist!
                        PlayerCtrl.play({
                            player: process.env.PLAYER,
                            playerMode: process.env.PLAYER_MODE,
                            playlist: true,
                            list: videos_redis
                        });
                        res.json({
                            result: 'playlist'
                        });

                    }
                }
            });
        });


    // /**
    //  * Server ans Player status
    //  */
    router.route('/api/player/stats')
        .get(async (req, res, next) => {

            redis.get('player_stats', (err, player_stats) => {
                res.json(JSON.parse(player_stats));
            });
        });


    return router;
};
