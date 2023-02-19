import { Video } from "../../interfaces/Video.interface";
import { RedisFormattedVideo } from "../../interfaces/RedisFormattedVideo.interface";
import { Socket } from "net";
import * as yts from "yt-search";
import redis from "../../connections/redis";

export class Youtube {
    constructor(private io: Socket) {
        this.io = io;
    }

    async getVideo(req: any) {
        let id = req.params.id;

        if (!isNaN(Number(id))) {
            id = 'video' + id;
        }

        const videos_count = redis.hLen('videos');

        if (!videos_count) {
            return 0;
        }
        if (id === 'last') {
            id = 'video' + videos_count;
        }

        const video = JSON.parse(await redis.hGet('videos', id));
        if (!video) {
            return false;
        } else {
            if (video == null) {
                return {
                    error: 'No hay banda!',
                };
            } else {
                return {
                    player: process.env.PLAYER,
                    playerMode: process.env.PLAYER_MODE,
                    action: 'play',
                    status: 'playing',
                    ...video,
                };
            }
        }
    }

    getVideoId(youtubeId) {
        // Extract Youtube video ID
        let ytId = youtubeId
            .trim()
            .replace(/http(s?):\/\/(w{3}?)(\.?)youtube\.com\/watch\?v=/, "");

        // Check ID
        if (ytId === "") {
            return false;
        } else {
            if (ytId.indexOf("http") === -1 && ytId.indexOf("youtube") > -1) {
                ytId = "https://www." + ytId;
            } else if (ytId.indexOf("youtube") === -1) {
                ytId = "https://www.youtube.com/watch?v=" + ytId;
            }
        }

        return ytId;
    }

    async count(key) {
        const videosCount = await redis.hLen(key);
        if (!videosCount) {
            return videosCount;
        }
        if (videosCount) {
            return videosCount;
        } else {
            return 0;
        }
    }

    async getById(key, videoId) {
        const video = await redis.hGet(key, videoId);
        if (!video) {
            return video;
        }
        return JSON.parse(video);
    }

    // Converts video info to String, so it can be saved to Redis
    // calculates Redis ID
    formatForRedis(key, videoUri, videoData): Promise<RedisFormattedVideo> {
        return new Promise(async (resolve, reject) => {
            const videosCount: any = await this.count(key);
            const videoId = "video" + Number(videosCount + 1);
            const title = videoData.title;
            const thumb = videoData.thumbnail;
            // console.log(videoData.all);
            const duration = videoData.duration.timestamp;

            // Redis no acepta objetos JSON aun... ¬_¬
            const videoString = this.generateRedisString(
                videoId,
                title,
                videoUri,
                thumb,
                duration,
                videosCount + 1
            );
            const videoRedis: RedisFormattedVideo = {
                videoId: videoId,
                videoString: videoString,
            };

            return resolve(videoRedis);
        });
    }

    generateRedisString(videoId, title, url, img, duration, order): string {
        return JSON.stringify({
            videoId: videoId,
            videoInfo: {
                videoId,
                title,
                url,
                img,
                duration,
            },
            order,
        });
    }

    async add(key, videoId) {
        const videoData: any = await yts({ videoId });

        if (!videoData) {
            return false;
        }
        const redisFormatted = await this.formatForRedis(
            "videos",
            videoId,
            videoData
        );
        const addVideo = await redis.hSet(
            key,
            redisFormatted.videoId,
            redisFormatted.videoString
        );
        if (addVideo) {
            const addedVideo = await this.getById(
                "videos",
                redisFormatted.videoId
            );
            this.io.emit("VIDEOS_MESSAGE", { message: "added" });
            return addedVideo;
        } else {
            return false;
        }
    }

    async delete(videoId) {
        const deleteVideo = await redis.hDel("videos", String(videoId));

        if (!deleteVideo) {
            return false;
        }
        if (deleteVideo) {
            await this.reorderAll("videos");
            const updatedList = await this.getById("videos", videoId);

            this.io.emit("VIDEOS_MESSAGE", { message: "deleted" });

            return updatedList;
        } else {
            return {
                message: deleteVideo,
            };
        }
    }

    async getAll(key): Promise<any> {
        if ((await this.count(key)) === 0) {
            return [];
        }

        let videos = [];
        const videosRedis = await redis.hGetAll(key);

        if (!videosRedis) {
            return false;
        }

        if (videosRedis) {
            Object.keys(videosRedis).forEach((video) => {
                videos.push(JSON.parse(videosRedis[video]));
            });

            videos.sort((a, b) => {
                return (
                    parseInt(a.videoId.replace(/video/, "")) -
                    parseInt(b.videoId.replace(/video/, ""))
                );
            });

            return videos;
        } else {
            return [];
        }
    }

    async reorderAll(key, videoId = null) {
        // Get all videos
        let videos = await this.getAll(key);

        // (Re-)sort them by order
        videos.sort((a, b) => {
            return (
                parseInt(a.videoId.replace(/video/, "")) -
                parseInt(b.videoId.replace(/video/, ""))
            );
        });

        // ID not present?
        if (videoId !== null) {
            const newTopIndex = videos.findIndex((x) => x.videoId === videoId);
            const newTop = videos[newTopIndex];

            videos.splice(newTopIndex, 1);
            videos = [...videos, newTop];
        }

        // 1. Delete all videos (I know)
        redis.hDel(
            "videos",
            videos.map((x) => x.videoId)
        );

        // 2. Re-insert all videos (I know 2)
        let i = 1;
        for (const video of videos) {
            const videoId = "video" + i;
            const title = video.videoInfo.title.replace(/"/g, "");
            const thumb = video.videoInfo.img;
            const duration = video.duration;

            let ytbURL = video.videoInfo.url;
            if (ytbURL === "undefined") {
                ytbURL = await yts({ videoId: video.videoInfo.url });
            }

            const videoString = this.generateRedisString(
                videoId,
                title,
                ytbURL,
                thumb,
                duration,
                i
            );

            const reorder = await redis.hSet(key, videoId, videoString);
            if (!reorder) {
                return false;
            }
            i++;
        }

        const orderedVideos = await this.getAll(key);
        return orderedVideos;
    }

    getPrev(key, videoOrder): Promise<Video> {
        return new Promise(async (resolve, reject) => {
            videoOrder = videoOrder ? videoOrder - 1 : 1;

            let video: any;
            let videoCount = await this.count(key);

            // Any videos?
            if (videoCount > 0) {
                // Is it first video?
                if (videoOrder === 0) {
                    video = await this.getById("videos", `video${videoCount}`);
                } else {
                    video = await this.getById("videos", `video${videoOrder}`);
                }
                return resolve(video);
            } else {
                return resolve(null);
            }
        });
    }

    getNext(key, videoOrder) {
        return new Promise(async (resolve, reject) => {
            videoOrder = videoOrder ? videoOrder + 1 : 1;

            let video: any;
            let videoCount = await this.count(key);

            // Any videos?
            if (videoCount > 0) {
                // Is it last video?
                if (videoOrder > videoCount) {
                    video = await this.getById("videos", `video1`);
                } else {
                    video = await this.getById("videos", `video${videoOrder}`);
                }
                return resolve(video);
            } else {
                return resolve(null);
            }
        });
    }
}
