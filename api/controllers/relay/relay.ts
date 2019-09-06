import * as onoff from 'onoff';

export class Relay {
    relay: onoff.Gpio;

    constructor() {
        console.log('Relay intance');
    }

    relayON() {
        console.log('ON');
        this.relay = new onoff.Gpio(23, 'out');
        this.relay.write(onoff.Gpio.HIGH);
    }

    relayOFF() {
        console.log('OFF');
        this.relay = new onoff.Gpio(23, 'out');
        this.relay.write(onoff.Gpio.LOW);
    }

}