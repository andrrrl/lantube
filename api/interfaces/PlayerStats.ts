import { Video } from "./Video.interface";

export interface PlayerStats {
    player?: string;
    status?: 'idle' | 'stopped' | 'playing' | 'paused' | 'loading';
    action?: 'idle' | 'stop' | 'play' | 'pause' | 'next' | 'prev' | 'volup' | 'voldown';
    videoId?: string;
    videoInfo?: any;
    audioOnly?: boolean;
    volume?: number;
    playlist: boolean;
    lastUpdated?: Date;
}
