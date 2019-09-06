import { Socket } from 'net';
import { ChildProcess, exec } from 'child_process';
import * as relayCtrl from '../relay/relay';

export class CoreTemp {
    thermal: ChildProcess;
    relayStarted = false;
    relay;
    temperature: number;


    constructor(private io: Socket) {
        this.io = io;
        this.relay = new relayCtrl.Relay();

        setInterval(() => {

            this.thermal = exec('cat /sys/class/thermal/thermal_zone0/temp');
            console.log('Leyendo temperatura del core...')
            this.thermal.stdout.once('data', (data) => {
                console.log('stdout');

                this.temperature = Math.round(Number(data) / 1000);

                console.log(this.temperature);

                const coreTemp = {
                    sensor: 'coreTemp',
                    value: `${this.temperature}°C`
                }

                this.sendCoreTemp();

                console.log('emit temp');
                this.io.emit('SENSOR_MESSAGE', coreTemp);

            });

            this.thermal.once('exit', () => {
                console.log('exit');

                if (!this.relayStarted && this.temperature > 60) {
                    this.relay.relayON();
                    this.relayStarted = true;
                }

                if (this.relayStarted && this.temperature <= 58) {
                    this.relay.relayOFF();
                    this.relayStarted = false;
                }

                this.thermal = null;

            });
        }, 10000);

        process.on('SIGINT', () => {
            console.log('Relay shutdown');
            this.relay.unexport();
        });

    };

    sendCoreTemp() {
        return new Promise(async (resolve, reject) => {
            console.log('send temp');
            return resolve({
                sensor: {
                    name: 'thermal_zone0',
                    dataTypes: ['temperatura'],
                    value: this.temperature
                }
            });

        });
    }
}
