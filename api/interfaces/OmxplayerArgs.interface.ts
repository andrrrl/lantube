
export interface OmxplayerArguments {
    volume: { arg: '--vol', val: '-600' };
    output: { arg: '-o', val: 'both' };
    info: { arg: '-I', val: null };
    fullscreen: { arg: '-b', val: null };
    noVideo: { arg: '--alpha', val: '0' };
}

// `${process.env.PLAYER} -b -o both --vol -600 --threshold 30 --audio_fifo 30 -I "${extractedURI}"`);
