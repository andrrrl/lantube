import * as request from 'request';
import { IVideo } from './../../interfaces/IVideo.interface';
import * as redis from '../../connections/redis';
import { IRedisFormattedVideo } from "../../interfaces/IRedisFormattedVideo.interface";
import { Socket } from 'net';


export class Videos {

    constructor(private io: Socket) {
        this.io = io;
    };

    getVideoId(youtubeId) {
        // Extract Youtube video ID
        let ytId = youtubeId.trim().replace(/http(s?):\/\/(w{3}?)(\.?)youtube\.com\/watch\?v=/, '');

        // Check ID
        if (ytId === '') {
            return false;
        } else {
            if (ytId.indexOf('http') === -1 && ytId.indexOf('youtube') > -1) {
                ytId = 'https://www.' + ytId;

            } else if (ytId.indexOf('youtube') === -1) {
                ytId = 'https://www.youtube.com/watch?v=' + ytId;
            }
        }

        return ytId
    }

    getVideoInfo(videoId) {
        return new Promise((resolve, reject) => {
            // Get video data from Youtube embed API
            request({
                url: 'http://www.youtube.com/oembed?url=' + videoId + '&format=json',
                json: true
            }, (error, response, body: any) => {
                if (error) {
                    reject(error);
                }
                resolve(body);
            });
        })
    }

    count(key) {
        return new Promise((resolve, reject) => {
            redis.hgetall(key, (err, videosCount) => {
                if (err) {
                    reject(err);
                }
                if (videosCount) {
                    resolve(Object.keys(videosCount).length);
                } else {
                    resolve(0);
                }
            });
        });
    }

    getById(key, videoId) {
        return new Promise((resolve, reject) => {
            redis.hget(key, videoId, (err, video) => {
                if (err) {
                    reject(err);
                }
                resolve(JSON.parse(video));
            });
        });
    }

    // converts video info to String, so it can be saved to Redis
    // calculates Redis ID
    formatForRedis(key, videoUri, videoData): Promise<IRedisFormattedVideo> {
        return new Promise(async (resolve, reject) => {
            let videosCount: any = await this.count(key);
            let videoId = 'video' + Number(videosCount + 1);
            let title = videoData.title.replace(/"/g, '');
            let thumb = videoData.thumbnail_url;
            let duration = videoData.duration;

            // Redis no acepta objetos JSON aun... ¬_¬
            let videoString = this.generateRedisString(videoId, title, videoUri, thumb, videosCount + 1);
            let videoRedis: IRedisFormattedVideo = {
                videoId: videoId,
                videoString: videoString
            };

            resolve(videoRedis);
        });
    }

    generateRedisString(videoId, title, videoUri, thumb, order) {
        return `{"videoId":"${videoId}","videoInfo":{"videoId":"${videoId}","title":"${title}","url":"${videoUri}","img":"${thumb}"},"order":${order}}`;
    }

    add(key, ytId) {
        return new Promise(async (resolve, reject) => {

            let videoData: any = await this.getVideoInfo(ytId);
            let redisFormatted = await this.formatForRedis('videos', ytId, videoData);
            // console.log('f', redisFormatted);
            redis.hmset(key, redisFormatted.videoId, redisFormatted.videoString, async (err) => {
                if (err) {
                    reject(err);
                }
                let addedVideo = await this.getById('videos', redisFormatted.videoId);
                resolve(addedVideo);
            });
            this.io.emit('VIDEOS_MESSAGE', { message: 'added' });
        });

    }

    delete(videoId) {
        return new Promise((resolve, reject) => {
            redis.HDEL('videos', String(videoId), async (err, reply) => {
                if (err) {
                    reject(err);
                }
                if (reply === 1) {
                    let v = await this.getAll('videos');
                    await this.reorderAll('videos');
                    let added = await this.getById('videos', videoId);
                    resolve(added);
                } else {
                    resolve({
                        message: reply
                    });
                }
                this.io.emit('VIDEOS_MESSAGE', { message: 'deleted' });
            });
        });
    }

    getAll(key): any {
        return new Promise(async (resolve, reject) => {

            if (await this.count('videos') === 0) {
                resolve([]);
            }

            let videos = [];
            redis.hgetall(key, async (err, videosRedis) => {

                if (err) {
                    resolve(err);
                }

                if (videosRedis) {
                    Object.keys(videosRedis).forEach(video => {
                        videos.push(JSON.parse(videosRedis[video]));
                    });

                    videos.sort((a, b) => {
                        return parseInt(a.videoId.replace(/video/, '')) - parseInt(b.videoId.replace(/video/, ''));
                    });

                    resolve(videos);
                } else {
                    resolve([]);
                }

            });
        });
    }

    reorderAll(key, videoId = null) {
        return new Promise(async (resolve, reject) => {
            let videos = await this.getAll(key);

            videos.sort((a, b) => {
                return parseInt(a.videoId.replace(/video/, '')) - parseInt(b.videoId.replace(/video/, ''));
            });

            if (videoId !== null) {
                console.log(videoId, 'ES NULL');
                let newTopIndex = videos.findIndex(x => x.videoId === videoId);
                let newTop = videos[newTopIndex];
                videos.splice(newTopIndex, 1);
                videos = [...videos, newTop];
            }

            redis.hdel('videos', videos.map(x => x.videoId));

            let i = 1;
            for (let video of videos) {
                let videoId = 'video' + i;
                let title = video.videoInfo.title.replace(/"/g, '');
                let thumb = video.videoInfo.img;

                let ytbURL = video.videoInfo.url;
                if (ytbURL === 'undefined') {
                    ytbURL = await this.getVideoInfo(video.videoInfo.url);
                }
                let videoString = this.generateRedisString(videoId, title, ytbURL, thumb, i);

                await redis.hset(key, videoId, videoString, (err, reply) => {
                    if (err) {
                        reject(err);
                    }
                });

                console.log(i);

                i++;
            }

            let orderedVideos = await this.getAll(key);
            resolve(orderedVideos);

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
                    video = await this.getById('videos', `video${videoCount}`);
                } else {
                    video = await this.getById('videos', `video${videoOrder}`);
                }
                resolve(video);
            } else {
                resolve(null);
            }
        });
    }

    getNext(key, videoOrder) {
        return new Promise(async (resolve, reject) => {

            console.log({ videoOrder });
            videoOrder = videoOrder ? videoOrder + 1 : 1;

            let video: any;
            let videoCount = await this.count(key);

            // Any videos?
            if (videoCount > 0) {
                // Is it last video?
                if (videoOrder > videoCount) {
                    video = await this.getById('videos', `video1`);
                } else {
                    video = await this.getById('videos', `video${videoOrder}`);
                }
                resolve(video);
            } else {
                resolve(null);
            }
        });
    }

}
