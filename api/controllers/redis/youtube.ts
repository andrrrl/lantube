import * as redis from "../../connections/redis";
import { IVideo } from "../../interfaces/IVideo.interface";
import { IRedisFormattedVideo } from "../../interfaces/IRedisFormattedVideo.interface";
import { Socket } from "net";
import * as yts from "yt-search";

export class Youtube {
    constructor(private io: Socket) {
        this.io = io;
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

    count(key) {
        return new Promise((resolve, reject) => {
            redis.HGETALL(key, (err, videosCount) => {
                if (err) {
                    return reject(err);
                }
                if (videosCount) {
                    return resolve(Object.keys(videosCount).length);
                } else {
                    return resolve(0);
                }
            });
        });
    }

    getById(key, videoId) {
        return new Promise((resolve, reject) => {
            redis.HGET(key, videoId, (err, video) => {
                if (err) {
                    return reject(err);
                }
                return resolve(JSON.parse(video));
            });
        });
    }

    // Converts video info to String, so it can be saved to Redis
    // calculates Redis ID
    formatForRedis(key, videoUri, videoData): Promise<IRedisFormattedVideo> {
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
            const videoRedis: IRedisFormattedVideo = {
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

    add(key, videoId) {
        return new Promise(async (resolve, reject) => {
            const videoData: any = await yts({ videoId });

            if (!videoData) {
                return resolve(false);
            }
            const redisFormatted = await this.formatForRedis(
                "videos",
                videoId,
                videoData
            );
            redis.HMSET(
                key,
                redisFormatted.videoId,
                redisFormatted.videoString,
                async (err) => {
                    if (err) {
                        return reject(err);
                    }
                    const addedVideo = await this.getById(
                        "videos",
                        redisFormatted.videoId
                    );
                    return resolve(addedVideo);
                }
            );
            this.io.emit("VIDEOS_MESSAGE", { message: "added" });
        });
    }

    delete(videoId) {
        return new Promise((resolve, reject) => {
            redis.HDEL("videos", String(videoId), async (err, reply) => {
                if (err) {
                    return reject(err);
                }
                // Redis reply "1" means OK
                if (reply === 1) {
                    await this.reorderAll("videos");
                    const updatedList = await this.getById("videos", videoId);

                    this.io.emit("VIDEOS_MESSAGE", { message: "deleted" });

                    return resolve(updatedList);
                } else {
                    return resolve({
                        message: reply,
                    });
                }
            });
        });
    }

    getAll(key): any {
        return new Promise(async (resolve, reject) => {
            if ((await this.count("videos")) === 0) {
                return resolve([]);
            }

            let videos = [];
            redis.HGETALL(key, async (err, videosRedis) => {
                if (err) {
                    return reject(err);
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

                    return resolve(videos);
                } else {
                    return resolve([]);
                }
            });
        });
    }

    reorderAll(key, videoId = null) {
        return new Promise(async (resolve, reject) => {
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
                const newTopIndex = videos.findIndex(
                    (x) => x.videoId === videoId
                );
                const newTop = videos[newTopIndex];

                videos.splice(newTopIndex, 1);
                videos = [...videos, newTop];
            }

            console.log(videos);

            // 1. Delete all videos (I know)
            redis.HDEL(
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

                await redis.HSET(key, videoId, videoString, (err, reply) => {
                    if (err) {
                        return reject(err);
                    }
                });

                i++;
            }

            const orderedVideos = await this.getAll(key);
            return resolve(orderedVideos);
        });
    }

    getPrev(key, videoOrder): Promise<IVideo> {
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
