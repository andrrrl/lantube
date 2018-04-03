import * as express from 'express';
import * as request from 'request';
import * as redis from '../../connections/redis';
let router = express.Router();

export = (io) => {

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
        .get((req, res, next) => {

            console.log('req.params.video', req.params.video);

            // Extract Youtube video ID
            let yt_id = req.params.video.trim().replace(/http(s?):\/\/(w{3}?)(\.?)youtube\.com\/watch\?v=/, '');

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
                url: 'http://www.youtube.com/oembed?url=' + yt_id + '&format=json',
                json: true
            }, (error, response, body) => {

                if (!error && response.statusCode === 200) {

                    redis.hlen('videos', (err, videos_count) => {
                        if (err) {
                            console.log(err);
                        }
                        let video_id = 'video' + Number(videos_count + 1);
                        let title = body.title.replace(/"/g, '');

                        // Redis no acepta objetos JSON aun... ¬_¬
                        let video_string = '{ "_id": "' + video_id + '",' +
                            '"title": "' + title + '",' +
                            '"url": "' + yt_id + '",' +
                            '"img": "' + body.thumbnail_url + '",' +
                            '"order": ' + String(videos_count + 1) + '}';


                        // res.end(JSON.parse(video_string));

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
                }


            });
        });

    return router;

};
