"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
let redis = require('../../connections/redis');
class Server {
    constructor() {
        this.serverStats = {
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
        this.playerStats = {
            player: process.env.PLAYER || 'mpv',
            status: 'idle',
            videoId: '0',
            title: '',
            last_updated: new Date(),
        };
    }
    // Player
    // status, videoId, video_title
    getPlayerStats() {
        return new Promise((resolve, reject) => {
            redis.get('playerStats', (err, stats) => {
                console.log({ stats });
                this.playerStats = JSON.parse(stats);
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
            }
            else {
                return cb(JSON.stringify(this.serverStats));
            }
        });
    }
}
exports.Server = Server;
//# sourceMappingURL=Server.js.map