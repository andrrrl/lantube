export interface IPlayerStats {
    player?: string;
    status?: 'idle' | 'stopped' | 'playing' | 'paused';
    videoId?: string;
    title?: string;
    last_updated?: Date;
}
