import * as ChildProcess from 'child_process';

// tslint:disable-next-line:no-console
process.on('unhandledRejection', r => console.log(r));

export class Player {

    private playing: ChildProcess.ChildProcess;
    exec: typeof ChildProcess.exec;

    formats: string = ' -f 34/18/43/35/44/22/45/37/46';
    volumeChange: string;
    stopped = true;

    constructor() {
        this.exec = ChildProcess.exec;
    };

    // Only for omxplayer for now
    pause() {
        return new Promise(async (resolve, reject) => {
            this.playing.stdin.write("pause");
        });
    }

    // Only for omxplayer for now
    volume(volume, emitSignal = true) {
        return new Promise(async (resolve, reject) => {

            if (volume === 'down') {
                this.volumeChange = '-';
            } else if (volume === 'up') {
                this.volumeChange = '+';
            }

            this.playing.stdin.write(this.volumeChange);
            console.info('Volume: ' + this.volumeChange);

        });
    }

    stop(userTriggered = true): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if (this.playing && this.playing.pid) {
                if (this.playing.stdin.writable) {
                    this.playing.stdin.write("q");
                    if (!this.playing.killed) {
                        this.playing.kill();
                        if (this.playing.killed) {
                            resolve(true);
                        }
                    }
                } else {
                    this.playing = null;
                    resolve(true);
                }
            }
            this.playing = null;
            resolve(true);
        });
    }

    async play(videoURL) {
        return new Promise(async (resolve, reject) => {

            // Stop/clear any current playback before starting
            this.stopped = await this.stop(false);

            if (this.stopped) {
                // Player type?
                if (this.playing === null) {

                    console.log('Extracting Youtube URL...');
                    let youtubeURL = await this.extracYoutubeURL(videoURL);

                    console.log(`Starting ${process.env.PLAYER.toLocaleUpperCase()}...`);
                    this.playing = await this.startPlayer(youtubeURL);

                    resolve(true);
                }

            }
            else {
                // console.log('WARNING, can\'t stop the beat I can\'t stop.');
                await this.play({});
            }

        }).catch(async result => {
            // console.log('ERROR, can\'t stop the beat I can\'t stop.');
            // await this.play(this.playerOptions);
        });
    }

    // Play previous video (always user triggered)
    playPrev(userTriggered = true) {
        return new Promise(async (resolve, reject) => {
            this.play({}).then(result => {
                resolve(true);
            }).catch(() => {
                reject(false);
            });

        });
    }

    // Play next video (can be user triggered or if player stats "playlist" value is true)
    playNext(userTriggered = false) {
        return new Promise(async (resolve, reject) => {
            this.play({}).then(() => {
                resolve(true);
            }).catch(() => {
                reject(false);
            });
        });
    }

    async initPlaybackSession() {
        this.playing.on('disconnect', () => { });
        this.playing.on('exit', () => { });
        this.playing.on('close', () => { this.finishPlayback(); });
    }

    finishPlayback() {
        this.stopped = true;

        console.log('User triggered?');
        console.log('Playlist mode?');
    }

    extracYoutubeURL(videoURL) {
        return new Promise((resolve, reject) => {
            let video = this.exec(`${process.env.YOUTUBE_DL} ${this.formats} -g ${videoURL}`);
            video.stdout.once('data', (data) => {
                data = data.toString().replace('\n', '').replace('\n', '').replace('\n', '');
                resolve(data);
            });
        });
    }

    startPlayer(extractedURI): Promise<ChildProcess.ChildProcess> {
        return new Promise((resolve, reject) => {
            // OMXPLAYER won't pipe anything to stdout, only to stderr, if option -I or --info is used
            // Use "--alpha 0" for audio only mode

            this.playing = this.exec(process.env.PLAYER + ' ' + extractedURI);

            this.playing.stderr.once('data', (data) => {
                resolve(this.playing);
            });
            this.playing.stdout.once('data', (data) => {
                resolve(this.playing);
            });
        });

    }

}
