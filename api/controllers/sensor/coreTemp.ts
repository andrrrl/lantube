import { Socket } from 'net';
import { ChildProcess, exec } from 'child_process';
import { FanRelay } from '../relay/relay';
import { LCD } from '../lcd/lcd';
export class CoreTemp {

    static thermal: ChildProcess;
    static relayStarted = false;
    static temperature: number;
    static dangerTempLimit = 70;
    static coolTempLimit = 65
    static sensorName = 'thermal_zone0';
    static io: Socket;

    constructor(private io: Socket) {
        console.log(`Inciando ${CoreTemp.sensorName}`);

        CoreTemp.io = io;

        CoreTemp.initCoreTemp();

        process.on('exit', () => {
            if (CoreTemp.thermal && !CoreTemp.thermal.killed) {
                CoreTemp.thermal.kill();
            }
        });

    };

    static initCoreTemp() {

        console.log(`Leyendo datos del sensor ${CoreTemp.sensorName}...`);

        this.thermal = null;
        this.thermal = exec('cat /sys/class/thermal/thermal_zone0/temp');

        this.thermal.stdout.once('data', (data) => {
            this.temperature = Math.round(Number(data) / 1000);
            console.log(`Core temp: ${this.temperature}°C`);
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

            if (this.thermal && !this.thermal.killed) {
                this.thermal.kill();
            }

        });


    }

    static sendCoreTemp() {
        return new Promise(async (resolve, reject) => {

            if (!this.temperature) {
                return;
            }

            const coreTemp = {
                sensor: 'core',
                type: 'temperature',
                temperature: {
                    unit: '°C',
                    value: `${this.temperature}`,
                    dangerTempLimit: this.dangerTempLimit,
                    coolTempLimit: this.coolTempLimit
                }
            }

            CoreTemp.io.emit('SENSOR_MESSAGE', coreTemp);

            let line1: string = '';
            let line2: string = null;
            let lines: any;

            // Temperatura de Core
            line1 = `Temp core: ${this.temperature}C`;

            // Si la temp es NORMAL, no se muestra mensaje

            // Mensaje WARNING
            if (this.temperature > this.coolTempLimit) {
                line2 = `Status: WARNING!`;
            }

            // Mensaje DANGER
            if (this.temperature > this.dangerTempLimit) {
                line2 = `Status: !!DANGER!!`;
            }

            lines = {
                type: 'coreTemp',
                line1,
                line2
            }

            LCD.init();
            LCD.queueMessage(lines);

            return resolve(coreTemp);

        });
    }
}
