import * as os from 'os';
import { IPlayerStats } from '../../interfaces/IPlayerStats';
import { Youtube } from '../../controllers/redis/youtube';
const redis = require('../../connections/redis');

export class Server {

    constructor() {
    }

    initialVol = -1600;

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
        lastUpdated: new Date()
    };

    playerStats: IPlayerStats = {
        player: process.env.PLAYER || 'mpv',
        action: 'idle',
        status: 'idle',
        videoId: '0',
        playlist: false,
        audioOnly: false,
        volume: -1600,
        lastUpdated: new Date(),
    };

    // Player
    // status, videoId, video_title
    public getPlayerStats(): Promise<IPlayerStats> {
        return new Promise((resolve, reject) => {
            redis.get('playerStats', async (err, stats) => {
                this.playerStats = JSON.parse(stats);
                if (this.playerStats && !this.playerStats.volume) {
                    this.playerStats.volume = this.initialVol;
                }
                if (this.playerStats && !this.playerStats.videoInfo) {
                    let YoutubeCtrl = new Youtube(null);
                    const count = await YoutubeCtrl.count('videos');
                    console.log(count);
                    this.playerStats.videoInfo = await YoutubeCtrl.getById('videos', `video${count}`);
                }
                if (this.playerStats && this.playerStats.status) {
                    resolve(this.playerStats);
                } else {
                    resolve({ ...this.playerStats, status: 'stopped' });
                }
            });
        });
    }

    public setPlayerStats(stats: IPlayerStats) {
        return new Promise((resolve, reject) => {
            redis.set('playerStats', JSON.stringify(stats), () => {
                redis.get('playerStats', (err, stats) => {
                    return resolve(JSON.stringify(stats));
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
