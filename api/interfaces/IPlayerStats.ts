import { IVideo } from "./IVideo.interface";

export interface IPlayerStats {
    player?: string;
    status?: 'idle' | 'stopped' | 'playing' | 'paused' | 'loading';
    action?: 'idle' | 'stop' | 'play' | 'pause' | 'next' | 'prev' | 'volup' | 'voldown';
    videoId?: string;
    videoInfo?: any;
    audioOnly?: boolean;
    playlist: boolean;
    lastUpdated?: Date;
}
