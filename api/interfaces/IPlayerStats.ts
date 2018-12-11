import { IVideo } from "./IVideo.interface";

export interface IPlayerStats {
    player?: string;
    status?: 'idle' | 'stopped' | 'playing' | 'paused' | 'loading';
    videoId?: string;
    videoInfo?: IVideo;
    playlist: boolean;
    lastUpdated?: Date;
}
