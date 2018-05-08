import { execSync } from "child_process";
import { EventEmitter } from 'events';
import * as ChildProcess from 'child_process';
import * as request from 'request';
import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as ServerSchema from '../../schemas/redis/Server';
import { IVideo } from './../../interfaces/IVideo.interface';
import * as redis from '../../connections/redis';

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

    // converts video info to String, so it can be saved to Redis
    // calculates Redis ID
    async formatForRedis(key, videoId, videoData) {

        let videosCount: any = await this.count(key);
        let video_id = 'video' + Number(videosCount + 1);
        let title = videoData.title.replace(/"/g, '');

        // Redis no acepta objetos JSON aun... ¬_¬
        let video_string = '{ "_id": "' + video_id + '",' +
            '"title": "' + title + '",' +
            '"url": "' + videoId + '",' +
            '"img": "' + videoData.thumbnail_url + '",' +
            '"order": ' + String(videosCount + 1) + '}';

        return {
            videoId: video_id,
            videoString: video_string
        }
    }

    count(key) {
        return new Promise((resolve, reject) => {
            redis.hlen(key, (err, count) => {
                if (err) {
                    reject(err);
                }
                resolve(count);
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

    getNext(key, currentOrder) {
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
                        return Number(x.order) === Number(currentOrder) + 1;
                        // console.log(x.order, currentOrder);
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

    getAll(key) {
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
                    resolve(videos);
                } else {
                    resolve([]);
                }
            });
        });
    }

    add(key, ytId) {
        return new Promise(async (resolve, reject) => {
            let videoData: any = await this.getVideoInfo(ytId);
            let redisFormatted = await this.formatForRedis('videos', ytId, videoData);
            redis.hmset(key, redisFormatted.videoId, redisFormatted.videoString, async (err) => {
                if (err) {
                    reject(err);
                }
                let addedVideo = await this.get('videos', redisFormatted.videoId);
                resolve(addedVideo);
            });
        });
    }

    delete(videoId) {
        return new Promise((resolve, reject) => {
            redis.hdel('videos', videoId, async (err, reply) => {
                if (err) {
                    reject(err);
                }
                if (reply === 1) {
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


}
