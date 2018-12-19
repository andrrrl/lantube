import * as redis from '../../connections/redis';
import * as express from 'express';
import { Player } from './../../controllers/redis/player';
import { Videos } from '../../controllers/redis/videos';
import { Server } from '../../schemas/redis/Server';

export = (io) => {
    let router = express.Router();
    let app = express();

    let PlayerCtrl = new Player(io);
    let VideosCtrl = new Videos(io);
    let ServerCtrl = new Server();


    // PLAY
    router.route('/api/player/:id/play')

        .get((req, res, next) => {

            // let order = !req.params.id.match(/[a-zA-Z]/g) ? Number(req.params.id) : false;
            let id = req.params.id;

            if (!isNaN(Number(id))) {
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
                                status: 'playing',
                                ...video
                            }).then(() => {
                                res.json({
                                    result: 'playing'
                                });
                            }).catch(() => {
                                res.json({
                                    result: 'error'
                                });
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

    // STOP
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
        .get(async (req, res, next) => {
            await PlayerCtrl.stopAll();
            const prevVideo = await PlayerCtrl.playPrev(true);
            res.json(prevVideo);
        });

    router.route('/api/player/next')
        .get(async (req, res, next) => {
            await PlayerCtrl.stopAll();
            const nextVideo = await PlayerCtrl.playNext(true);
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
        .get(async (req, res, next) => {

            let videosRedis = await VideosCtrl.getAll('videos');
            videosRedis.sort((a, b) => a.order - b.order);
            let firstOrder = videosRedis[0];

            // Play All!
            PlayerCtrl.play({
                player: process.env.PLAYER,
                playerMode: process.env.PLAYER_MODE,
                videoId: firstOrder.videoId,
                videoInfo: {
                    videoId: firstOrder.videoId,
                    url: firstOrder.url,
                    img: firstOrder.img,
                    title: firstOrder.title,
                },
                order: firstOrder.order - 1,
                status: 'playing'
            }).then(() => {
                res.json({
                    videoId: firstOrder.videoId,
                    url: firstOrder.url,
                    title: firstOrder.title,
                    img: firstOrder.img,
                    order: firstOrder.order,
                    status: 'playing'
                });
            }).catch(() => {
                res.json({
                    result: 'error'
                });
            });
        });

    router.route('/api/player/playlist')
        .patch(async (req, res, next) => {
            let stats = await ServerCtrl.getPlayerStats();
            stats.playlist = !stats.playlist;
            ServerCtrl.setPlayerStats(stats);
            res.json(stats);
        });


    // /**
    //  * Server ans Player status
    //  */
    router.route('/api/player/stats')
        .get(async (req, res, next) => {
            let stats = await ServerCtrl.getPlayerStats();
            res.json(stats);
        });


    return router;
};
