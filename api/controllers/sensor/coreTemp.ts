import { Socket } from 'net';
import { ChildProcess, exec } from 'child_process';
import { FanRelay } from '../relay/relay';
import { LCD } from '../lcd/lcd';
export class CoreTemp {

    thermal: ChildProcess;
    relayStarted = false;
    temperature: number;
    dangerTempLimit = 70;
    coolTempLimit = 65

    constructor(private io: Socket) {
        this.io = io;

        this.initCoreTemp();

        process.on('exit', () => {
            if (this.thermal && !this.thermal.killed) {
                this.thermal.kill();
            }
        });

    };

    initCoreTemp() {
        this.thermal = null;
        this.thermal = exec('cat /sys/class/thermal/thermal_zone0/temp');

        this.thermal.stdout.once('data', (data) => {
            this.temperature = Math.round(Number(data) / 1000);
            console.log(`Core temp: ${this.temperature}°C`);
            this.sendCoreTemp();
        });

        this.thermal.on('exit', () => {

            // Acceptable temperature is between 65 and 70 deg C
            if (!this.relayStarted && this.temperature > this.dangerTempLimit) {
                console.log('Call FanRelay.relayON()');
                FanRelay.relayON();
                this.relayStarted = true;
            }

            // Try to cool it down to 60 deg C
            if (this.relayStarted && this.temperature <= this.coolTempLimit) {
                console.log('Call FanRelay.relayOFF()');
                FanRelay.relayOFF();
                this.relayStarted = false;
            }

            this.thermal = null;
        });
        setTimeout(() => {
            this.initCoreTemp();
        }, 10000);


    }

    sendCoreTemp() {
        return new Promise(async (resolve, reject) => {

            const coreTemp = {
                sensor: 'core',
                type: 'temperature',
                unit: '°C',
                value: `${this.temperature}`,
                dangerTempLimit: this.dangerTempLimit,
                coolTempLimit: this.coolTempLimit
            }

            this.io.emit('SENSOR_MESSAGE', coreTemp);

            let line1: string = '';
            let line2: string = '';
            let lines: any;

            // Temperatura de Core
            line1 = `Temp core: ${coreTemp.value} C`;

            // Mensaje NORMAL
            if (this.temperature < this.coolTempLimit) {
                line2 = `Status: NORMAL`;
            }

            // Mensaje WARNING
            if (this.temperature > this.coolTempLimit) {
                line2 = `Status: WARNING!`;
            }

            // Mensaje DANGER
            if (this.temperature > this.dangerTempLimit) {
                line2 = `Status: !!DANGER!!`;
            }

            lines = {
                line1,
                line2
            }

            LCD.init();
            LCD.queueMessage(lines);

            return resolve({
                sensor: {
                    name: 'thermal_zone0',
                    dataTypes: ['temperature'],
                    value: coreTemp.value,
                    fanStatus: this.relayStarted
                }
            });

        });
    }
}
