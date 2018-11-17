"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const express = require("express");
const videos_1 = require("./../../controllers/redis/videos");
const search_1 = require("./../../controllers/redis/search");
let router = express.Router();
module.exports = (io) => {
    let VideosCtrl = new videos_1.Videos(io);
    let SearchCtrl = new search_1.Search();
    router.route('/api/videos')
        .get((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let videos = yield VideosCtrl.getAll('videos');
        res.json(videos);
    }));
    router.route('/api/videos/add/:video')
        .get((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let ytId = VideosCtrl.getVideoId(req.params.video);
        if (!ytId) {
            res.json({
                result: 'error',
                error: 'No video ID.'
            });
        }
        let added = yield VideosCtrl.add('videos', ytId);
        if (added) {
            res.json(added);
        }
        else {
            res.json({
                message: 'Can\'t add video'
            });
        }
    }));
    router.route('/api/videos/delete/:videoId')
        .delete((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let deleted = yield VideosCtrl.delete(req.params.videoId);
        res.json(deleted);
    }));
    router.route('/api/videos/search/:term')
        .get((req, res, next) => __awaiter(this, void 0, void 0, function* () {
        let videos = yield SearchCtrl.search(req.params.term);
        res.json(videos);
    }));
    return router;
};
//# sourceMappingURL=videos.js.map