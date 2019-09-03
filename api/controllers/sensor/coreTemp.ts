import { Socket } from 'net';
import { ChildProcess, exec } from 'child_process';

export class CoreTemp {

    constructor(private io: Socket) {
        this.io = io;
    };

    readSensor() {
        return new Promise(async (resolve, reject) => {

            let coreTemp: ChildProcess = exec('cat /sys/class/thermal/thermal_zone0/temp');


            // coreTemp.on('exit', (code, signal) => {
            //     console.log(code, signal);
            // });

            coreTemp.stdout.once('data', (temperature) => {
                console.log(Number(temperature));
                this.io.emit('SENSOR_MESSAGE', temperature)
                resolve(temperature);
            });

        });
    }
}