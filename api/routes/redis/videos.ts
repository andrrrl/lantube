import * as express from 'express';
import * as request from 'request';
import { Videos } from './../../controllers/redis/videos';
import { Search } from './../../controllers/redis/search';

let router = express.Router();

export = (io) => {

    let VideosCtrl = new Videos(io);
    let SearchCtrl = new Search();

    router.route('/api/videos')

        .get(async (req, res, next) => {
            let videos = await VideosCtrl.getAll('videos');
            res.json(videos);
        });

    router.route('/api/videos/add/:video')
        .get(async (req, res, next) => {

            let ytId = VideosCtrl.getVideoId(req.params.video);

            if (!ytId) {
                res.json({
                    result: 'error',
                    error: 'No video ID.'
                });
            }

            let added = await VideosCtrl.add('videos', ytId);

            if (added) {
                res.json(added);
            } else {
                res.json({
                    message: 'Can\'t add video'
                });
            }

        });

    router.route('/api/videos/delete/:videoId')
        .delete(async (req, res, next) => {
            let deleted = await VideosCtrl.delete(req.params.videoId);
            res.json(deleted);
        });

    router.route('/api/videos/search/:term')
        .get(async (req, res, next) => {
            let videos = await SearchCtrl.search(req.params.term);
            res.json(videos);
        });

    return router;

};
