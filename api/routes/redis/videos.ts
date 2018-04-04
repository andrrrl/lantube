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
                let video_id = 'video' + Number(videos_count + 1);
                let title = body.title.replace(/"/g, '');

                // Redis no acepta objetos JSON aun... ¬_¬
                let video_string = '{ "_id": "' + video_id + '",' +
                    '"title": "' + title + '",' +
                    '"url": "' + ytId + '",' +
                    '"img": "' + body.thumbnail_url + '",' +
                    '"order": ' + String(videos_count + 1) + '}';

                redis.hmset('videos', String(video_id), video_string, (err) => {
                    redis.hget('videos', video_id, (err, video) => {

                        let vid = JSON.parse(video);
                        res.json({
                            _id: vid._id,
                            title: vid.title,
                            url: vid.url,
                            img: vid.img
                        });

                    });
                });


            });

        });

    return router;

};
