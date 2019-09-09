import { Socket } from 'net';
import { ChildProcess, exec } from 'child_process';
import { FanRelay } from '../../controllers/relay/relay';
export class CoreTemp {
    thermal: ChildProcess;
    relayStarted = false;
    temperature: number;
    dangerTempLimit = 70;
    coolTempLimit = 65;

    constructor(private io: Socket) {
        this.io = io;

        setInterval(() => {

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
        }, 10000);

        process.on('exit', () => {
            if (this.thermal && !this.thermal.killed) {
                this.thermal.kill();
            }
        });

    };

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
