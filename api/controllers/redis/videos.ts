import { execSync } from "child_process";
import { EventEmitter } from 'events';
import * as ChildProcess from 'child_process';
import * as request from 'request';
import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as ServerSchema from '../../schemas/redis/Server';
import { IVideo } from './../../interfaces/IVideo.interface';
import * as redis from '../../connections/redis';
import { IRedisFormattedVideo } from "../../interfaces/IRedisFormattedVideo.interface";

const
    spawn = ChildProcess.spawn,
    exec = ChildProcess.exec;

// Load Server
let Server = new ServerSchema.Server();

export class Videos {

    constructor(private io: any) {
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
            }, (error, response, body) => {
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

    get(key, videoId) {
        return new Promise((resolve, reject) => {
            redis.hget(key, videoId, (err, video) => {
                if (err) {
                    reject(err);
                }
                resolve(video);
            });
        });
    }



    getAll(key): any {
        return new Promise(async (resolve, reject) => {

            console.log('Video count: ', await this.count('videos'));

            if (await this.count('videos') === 0) {
                resolve([]);
            }

            let videos = [];
            redis.hgetall(key, (err, videosRedis) => {

                if (err) {
                    resolve(err);
                }

                if (videosRedis) {
                    Object.keys(videosRedis).forEach(video => {
                        videos.push(JSON.parse(videosRedis[video]));
                    });
                    resolve(videos);
                } else {
                    resolve([]);
                }
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
        return '{ "_id": "' + videoId + '",' +
            '"title": "' + title + '",' +
            '"url": "' + videoUri + '",' +
            '"img": "' + thumb + '",' +
            '"order": ' + order + '}';
    }

    add(key, ytId) {
        return new Promise(async (resolve, reject) => {

            // this.reorderAll(key).then(async () => {

            let videoData: any = await this.getVideoInfo(ytId);
            let redisFormatted = await this.formatForRedis('videos', ytId, videoData);
            console.log('f', redisFormatted);
            redis.hmset(key, redisFormatted.videoId, redisFormatted.videoString, async (err) => {
                if (err) {
                    reject(err);
                }
                let addedVideo = await this.get('videos', redisFormatted.videoId);
                resolve(addedVideo);
            });
        });

        // });
    }

    delete(videoId) {
        return new Promise((resolve, reject) => {
            redis.hdel('videos', videoId, async (err, reply) => {
                if (err) {
                    reject(err);
                }
                if (reply === 1) {
                    await this.reorderAll('videos');
                    let added = await this.get('videos', videoId);
                    resolve(added);
                } else {
                    resolve({
                        message: reply
                    });
                }
            });
        });
    }

    reorderAll(key) {
        return new Promise(async (resolve, reject) => {
            let videos = await this.getAll(key);

            videos.sort((a, b) => {
                return parseInt(a._id.replace(/video/, '')) - parseInt(b._id.replace(/video/, ''));
            });

            let i = 1;
            for (let video of videos) {
                let videoId = 'video' + i;
                let title = video.title.replace(/"/g, '');
                let thumb = video.thumbnail_url;
                let ytbURL = video.url;
                let videoString = this.generateRedisString(videoId, title, ytbURL, thumb, i);

                redis.hmset(key, videoId, videoString, (err, reply) => {
                    if (err) {
                        reject(err);
                    }
                });
                i++;
            }

            let orderedVideos = await this.getAll(key);
            resolve(orderedVideos);

        });
    }

    getPrevOrNext(key, currentOrder, prevOrNext) {
        return new Promise((resolve, reject) => {

            redis.hgetall(key, (err, videosRedis) => {

                if (err) {
                    reject(err);
                }

                let videos = [];
                Object.keys(videosRedis).forEach(video => {
                    videos.push(JSON.parse(videosRedis[video]));
                });

                if (videos.length > 0) {
                    videos.sort(function (a, b) {
                        return parseInt(a._id.replace(/video/, '')) - parseInt(b._id.replace(/video/, ''));
                    });

                    let nextVideo = videos.find(x => {
                        return Number(x.order) === Number(currentOrder) + (prevOrNext === 'prev' ? - 1 : + 1);
                    });

                    resolve({
                        player: process.env.PLAYER,
                        playerMode: process.env.PLAYER_MODE,
                        _id: nextVideo._id,
                        url: nextVideo.url,
                        img: nextVideo.img,
                        order: nextVideo.order,
                        status: 'playing'
                    });
                } else {
                    resolve([]);
                }
            });
        });
    }

}
