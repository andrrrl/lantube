import * as os from 'os';
import { reject } from 'bluebird';
let redis = require('../../connections/redis');


export class Server {

    constructor() {

    }

    serverStats: any = {
        host: process.env.HOST_NAME,
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime(),
        loadaverage: os.loadavg(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        last_updated: new Date()
    };

    playerStats: any = {
        player: process.env.PLAYER || 'mpv',
        status: 'idle',
        video_id: 0,
        video_title: '',
        last_updated: new Date(),
    };

    // Player
    // status, video_id, video_title
    public getPlayerStats() {
        return new Promise((resolve, reject) => {
            redis.get('playerStats', (err, stats) => {
                console.log(stats);
                this.playerStats = stats;
                resolve(this.playerStats);
            });
        });
    }

    setPlayerStats(stats) {
        return new Promise((resolve, reject) => {
            redis.set('playerStats', JSON.stringify(stats), () => {
                redis.get('playerStats', (err, stats) => {
                    resolve(JSON.stringify(stats));
                });
            });
        });

    }

    setServerStats() {
        let sstats = this.serverStats;
        redis.set('serverStats', JSON.stringify(sstats));
        return sstats;
    }

    getServerStats(cb) {
        redis.get('serverStats', (err, stats) => {
            if (stats) {
                return cb(stats);
            } else {
                return cb(JSON.stringify(this.serverStats));
            }
        });
    }

}
