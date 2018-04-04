import * as express from 'express';
import * as request from 'request';
import * as redis from '../../connections/redis';
import { Videos } from './../../controllers/redis/videos';

let router = express.Router();

export = (io) => {

    let VideosCtrl = new Videos(io);

    router.route('/api/videos')

        // GET ALL VIDEOS
        .get((req, res, next) => {

            redis.hgetall('videos', (err, videos_redis) => {
                let videos = [];
                let i = 1;
                for (let video in videos_redis) {
                    videos.push(JSON.parse(videos_redis[String('video' + i)]));
                    i++;
                }
                if (videos.length > 0) {
                    res.json(videos);
                } else {
                    res.json([]);
                }
            });

        });

    router.route('/api/videos/add/:video')
        .get(async (req, res, next) => {

            let ytId = VideosCtrl.getVideoId(req.params.video);

            if (!ytId) {
                res.json({
                    result: 'error',
                    error: 'No video.'
                });
            }

            let body: any = await VideosCtrl.getVideoInfo(ytId);

            redis.hlen('videos', (err, videos_count) => {
                if (err) {
                    console.log(err);
                }

                let videoForRedis = VideosCtrl.redisVideoString(ytId, videos_count, body);

                redis.hmset('videos', String(videoForRedis.videoId), videoForRedis.videoString, (err) => {
                    redis.hget('videos', videoForRedis.videoId, (err, video) => {

                        let vid = JSON.parse(video);
                        res.json({
                            _id: vid._id,
                            title: vid.title,
                            url: vid.url,
                            img: vid.img,
                            order: vid.order
                        });

                    });
                });


            });

        });

    return router;

};
