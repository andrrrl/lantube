import * as os from 'os';
import { PlayerStats } from '../../interfaces/PlayerStats';
import { Youtube } from './youtube';
import redis from '../../connections/redis';

class LantubeServer {
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
        lastUpdated: new Date(),
    };

    playerStats: PlayerStats = {
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
    public async getPlayerStats(): Promise<PlayerStats> {
        const stats = await redis.get('playerStats');
        this.playerStats = JSON.parse(stats);
        if (this.playerStats && !this.playerStats.volume) {
            this.playerStats.volume = this.initialVol;
        }
        if (this.playerStats && !this.playerStats.videoInfo) {
            let YoutubeCtrl = new Youtube(null);
            const count = await YoutubeCtrl.count('videos');
            console.log(count);
            this.playerStats.videoInfo = await YoutubeCtrl.getById(
                'videos',
                `video${count}`
            );
        }
        if (this.playerStats && this.playerStats.status) {
            return this.playerStats;
        } else {
            return { ...this.playerStats, status: 'stopped' };
        }
    }

    public async setPlayerStats(stats: PlayerStats) {
        await redis.set('playerStats', JSON.stringify(stats));
        const updatedStats = await redis.get('playerStats');
        return JSON.stringify(updatedStats);
    }

    public async setServerStats() {
        let sstats = this.serverStats;
        await redis.set('serverStats', JSON.stringify(sstats));
        return sstats;
    }

    async getServerStats(cb) {
        const stats = redis.get('serverStats');
        if (stats) {
            return cb(stats);
        } else {
            return cb(JSON.stringify(this.serverStats));
        }
    }

}

export default LantubeServer;
