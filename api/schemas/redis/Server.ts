import * as os from 'os';
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
    public getPlayerStats(cb) {
        // this.playerStats = {
        //     player: process.env.PLAYER || 'mpv',
        //     status: status || 'idle',
        //     video_id: video_id || 0,
        //     video_title: video_title || '',
        //     last_updated: new Date(),
        // }
        redis.get('playerStats', (err, stats) => {
            return cb(JSON.stringify(this.playerStats));
        });
    }

    setPlayerStats(stats) {
        redis.set('playerStats', JSON.stringify(stats), () => {
            redis.get('playerStats', (err, stats) => {
                return stats;
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