import { Socket } from 'net';
import { ChildProcess, exec } from 'child_process';

export class CoreTemp {
    thermal: ChildProcess;

    constructor(private io: Socket) {
        this.io = io;
    };

    readSensor() {
        console.log('Leyendo datos del sensor thermal temp...')
        setTimeout(() => {
            this.thermal = null;
            this.thermal = exec('cat /sys/class/thermal/thermal_zone0/temp');;
        }, 300000);
    }

    initSensor() {
        return new Promise(async (resolve, reject) => {

            this.thermal = exec('cat /sys/class/thermal/thermal_zone0/temp');;
            this.readSensor();

            this.thermal.stdout.on('data', (data) => {
                const coreTemp = {
                    sensor: 'coreTemp',
                    value: `${Math.round(Number(data) / 1000)}°C`
                }
                console.log('Emitiendo....');
                this.io.emit('SENSOR_MESSAGE', coreTemp);

                resolve({
                    sensor: {
                        name: 'thermal_zone0',
                        dataTypes: ['temperatura'],
                        value: coreTemp
                    }
                });
            });

        });
    }
}