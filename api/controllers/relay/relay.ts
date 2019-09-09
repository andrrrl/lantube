import * as onoff from 'onoff';

export class FanRelay {
    static relay: onoff.Gpio;

    private static cleanUp() {
        process.on('SIGINT', () => {
            console.log('FanRelay shutdown');
            this.relay.unexport();
            console.log('Lantube shutdown');
            process.exit();
        });
    }

    static relayON() {
        console.log('ON');
        if (this.relay) {
            this.relay.unexport();
        }
        this.relay = new onoff.Gpio(23, 'out');
        this.cleanUp();

        this.relay.writeSync(onoff.Gpio.HIGH);
    }

    static relayOFF() {
        console.log('OFF');
        if (this.relay) {
            this.relay.unexport();
        }
        this.relay = new onoff.Gpio(23, 'out');
        this.cleanUp();

        this.relay.writeSync(onoff.Gpio.LOW);
    }

}