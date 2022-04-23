import * as onoff from 'onoff';

export class FanRelay {
    static relay: onoff.Gpio;
    static gpioPin = 23;

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

        // Raspberry Pi3 B+ pinout
        this.relay = new onoff.Gpio(this.gpioPin, 'out');
        this.cleanUp();

        this.relay.writeSync(onoff.Gpio.HIGH);
    }

    static relayOFF() {
        console.log('OFF');
        if (this.relay) {
            this.relay.unexport();
        }
        // Raspberry Pi3 B+ pinout
        this.relay = new onoff.Gpio(this.gpioPin, 'out');
        this.cleanUp();

        this.relay.writeSync(onoff.Gpio.LOW);
    }

}