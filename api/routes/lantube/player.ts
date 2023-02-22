import * as express from "express";
import { Player } from "../../controllers/lantube/player";
import { Youtube } from "../../controllers/lantube/youtube";
import { PlayerStats } from "../../interfaces/PlayerStats";
import LantubeServer from "../../controllers/lantube/server";

export = (io) => {
    const router = express.Router();

    const PlayerCtrl = new Player(io);
    const YoutubeCtrl = new Youtube(io);
    const ServerCtrl = new LantubeServer();

    // PLAY YT VIDEO
    router.route("/api/player/:id/play")
        .get(async (req, res, next) => {
            const playerOptions: any = await YoutubeCtrl.getVideo(req);
            const playing: PlayerStats = await PlayerCtrl.play(playerOptions);
            res.json({
                result: 'playing',
                video: playing.videoInfo
            });
        });

    // PLAY FILE
    router.route("/api/player/playfile").post(async (req, res, next) => {
        const filePath = req.body.path;
        const status = await PlayerCtrl.playFile(filePath);
        res.json({
            result: status,
        });
    });

    // PAUSE
    router.route("/api/player/pause").get(async (req, res, next) => {
        const status = await PlayerCtrl.pause();
        res.json({
            result: status,
        });
    });

    // STOP
    router.route("/api/player/stop").get((req, res, next) => {
        PlayerCtrl.stopAll()
            .then((result) => {
                res.json({
                    result: "stopped",
                });
            })
            .catch((err) => {
                res.json({
                    result: "error",
                });
            });
    });

    router.route("/api/player/prev").get(async (req, res, next) => {
        await PlayerCtrl.stopAll();
        const prevVideo = await PlayerCtrl.playPrev(true);
        res.json(prevVideo);
    });

    router.route("/api/player/next").get(async (req, res, next) => {
        await PlayerCtrl.stopAll();
        const nextVideo = await PlayerCtrl.playNext(true);
        res.json(nextVideo);
    });

    router.route("/api/player/volume/:volume").get(async (req, res, next) => {
        let volumeChanged = await PlayerCtrl.volume(req.params.volume);
        res.json({
            volume: volumeChanged,
        });
    });

    router.route("/api/player/pls").get((req, res, next) => {
        YoutubeCtrl.getAll("videos")
            .then((videosRedis) => {
                let playlist = PlayerCtrl.playlist(videosRedis);

                res.setHeader("Accept-charset", "utf-8");
                res.setHeader("Content-type", "audio/x-scpls");
                res.setHeader("Media-type", "audio/x-scpls");
                res.send(playlist);
                res.end();
            })
            .catch((err) => {
                res.json({
                    result: "error",
                    error: err,
                });
            });
    });

    router.route("/api/player/playall").get(async (req, res, next) => {
        let videosRedis = await YoutubeCtrl.getAll("videos");
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
            status: "playing",
        })
            .then(() => {
                res.json({
                    videoId: firstOrder.videoId,
                    url: firstOrder.url,
                    title: firstOrder.title,
                    img: firstOrder.img,
                    order: firstOrder.order,
                    status: "playing",
                });
            })
            .catch(() => {
                res.json({
                    result: "error",
                });
            });
    });

    router.route("/api/player/playlist").patch(async (req, res, next) => {
        const stats = await PlayerCtrl.togglePlaylist();
        res.json(stats);
    });

    router.route("/api/player/audioonly").patch(async (req, res, next) => {
        let stats = await ServerCtrl.getPlayerStats();
        stats.audioOnly = !stats.audioOnly;
        ServerCtrl.setPlayerStats(stats);
        res.json(stats);
    });

    // /**
    //  * Server and Player status
    //  */
    router.route("/api/player/stats").get(async (req, res, next) => {
        const stats = await ServerCtrl.getPlayerStats();
        io.emit("PLAYER_MESSAGE", stats);
        console.log("/api/player/stats");
        res.json(stats);
    });

    router
        .route("/api/player/stats/update/:videoId")
        .put(async (req, res, next) => {
            const videoId = req.params.videoId;
            YoutubeCtrl.reorderAll("videos", videoId);

            const stats = await ServerCtrl.getPlayerStats();
            res.json(stats);
        });

    return router;
};
