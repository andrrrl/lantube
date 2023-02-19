import * as express from "express";
import { Youtube } from "../../controllers/lantube/youtube";

const router = express.Router();

export = (io) => {

    const YoutubeCtrl = new Youtube(io);
    router.route('/api/videos/:id/edit').put(async (req, res, next) => {
        const videoId = req.params.id;
        const video = await YoutubeCtrl.getById('videos', videoId);
        res.json(video);
    });

    return router;
};
