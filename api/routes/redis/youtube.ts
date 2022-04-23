import * as express from "express";
import { Youtube } from "../../controllers/redis/youtube";
import { Search } from "../../controllers/redis/search";

const router = express.Router();

export = (io) => {
    const YoutubeCtrl = new Youtube(io);
    const SearchCtrl = new Search();

    router
        .route("/api/videos")

        .get(async (req, res, next) => {
            const videos = await YoutubeCtrl.getAll("videos");
            res.json(videos);
        });

    router
        .route("/api/videos/:id")

        .get(async (req, res, next) => {
            const videoId = req.params.id;
            const videos = await YoutubeCtrl.getById("videos", videoId);
            res.json(videos);
        });

    router.route("/api/videos/add/:video").get(async (req, res, next) => {
        if (!req.params.video) {
            res.json({
                result: "error",
                error: "No video ID.",
            });
        }

        const ytId = req.params.video;
        console.log({ ytId });

        if (!ytId) {
            res.json({
                result: "error",
                error: "Invalid video ID.",
            });
        }

        const added = await YoutubeCtrl.add("videos", ytId);

        if (added) {
            res.json(added);
        } else {
            res.json({
                result: "error",
                error: "Can't add video",
            });
        }
    });

    router
        .route("/api/videos/delete/:videoId")
        .delete(async (req, res, next) => {
            const deleted = await YoutubeCtrl.delete(req.params.videoId);
            res.json(deleted);
        });

    router.route("/api/videos/search/:term").get(async (req, res, next) => {
        const videos = await SearchCtrl.search(req.params.term);
        res.json(videos);
    });

    return router;
};
