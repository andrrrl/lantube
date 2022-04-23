import * as open from 'open';
import { Socket } from 'net';

export class Browser {


    static io: Socket;
    static browserBinary = '/usr/bin/chromium-browser';
    static status: 'open' | 'closed' | 'error' | null = null;

    constructor(private io: Socket) {
        Browser.io = io;
    }

    public static async openInBrowser(url) {
        console.log(`Opening ${url}`);
        await open(url, { app: '/usr/bin/chromium-browser' });
        this.status = 'open';
        Browser.io.emit('URL_SHARE_MESSAGE', { status: this.status });
    }
}