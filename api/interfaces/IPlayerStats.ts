import { IVideo } from "./IVideo.interface";

export interface IPlayerStats {
    player?: string;
    status?: 'idle' | 'stopped' | 'playing' | 'paused' | 'loading';
    videoId?: string;
    videoInfo?: any;
    playlist: boolean;
    lastUpdated?: Date;
}
