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
            video_id: 0,
            video_title: '',
            last_updated: new Date(),
        };
    }
    // Player
    getPlayerStats(status, video_id, video_title) {
        this.playerStats = {
            player: process.env.PLAYER || 'mpv',
            status: status || 'idle',
            video_id: video_id || 0,
            video_title: video_title || '',
            last_updated: new Date(),
        };
        redis.get('playerStats', (err, stats) => {
            return JSON.stringify(this.playerStats);
        });
    }
    setPlayerStatss(status, video_id, video_title) {
        let pstats = this.getPlayerStats(status, video_id, video_title);
        redis.set('playerStats', JSON.stringify(pstats), () => {
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
            }
            else {
                return cb(JSON.stringify(this.serverStats));
            }
        });
    }
}
module.exports = Server;
//# sourceMappingURL=Server.js.map