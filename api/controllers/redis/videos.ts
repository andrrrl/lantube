import { execSync } from "child_process";
import { EventEmitter } from 'events';
import * as ChildProcess from 'child_process';
import * as request from 'request';
import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as ServerSchema from '../../schemas/redis/Server';
import { IVideo } from './../../interfaces/IVideo.interface';

const
    spawn = ChildProcess.spawn,
    exec = ChildProcess.exec;

// Load Server
let Server = new ServerSchema.Server();

export class Videos {


    constructor(private io: any) {
        this.io = io;
    };

    getVideoId(video) {
        // Extract Youtube video ID
        let ytId = video.trim().replace(/http(s?):\/\/(w{3}?)(\.?)youtube\.com\/watch\?v=/, '');

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
    redisVideoString(videoId, videosCount, video) {
        let video_id = 'video' + Number(videosCount + 1);
        let title = video.title.replace(/"/g, '');

        // Redis no acepta objetos JSON aun... ¬_¬
        let video_string = '{ "_id": "' + video_id + '",' +
            '"title": "' + title + '",' +
            '"url": "' + videoId + '",' +
            '"img": "' + video.thumbnail_url + '",' +
            '"order": ' + String(videosCount + 1) + '}';

        return {
            videoId: video_id,
            videoString: video_string
        }
    }

}
