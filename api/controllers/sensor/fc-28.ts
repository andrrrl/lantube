import { Socket } from 'net';
import { Gpio } from 'onoff';
import AbortController from 'node-abort-controller';

/**
 * Detecta presencia de agua (mucha humedad) en un medio
 * 
 * 0: empapade
 * 1: seque
 */
export class FC28 {

    static controller = new AbortController();
    static signal = FC28.controller.signal;

    static sensorName = 'FC28'
    static sensor;
    static sensorValue;
    static io: Socket;

    constructor(private io: Socket) {
        process.on('SIGINT', _ => {
            FC28.sensor.unexport();
        });
        FC28.sensor = new Gpio(21, 'in');
        FC28.io = io;
    }

    static readSensor() {
        return new Promise((resolve, reject) => {

            this.sensorValue = this.sensor.readSync();
            const moisture = {
                sensorValue: this.sensorValue,
                waterNeeded: this.isWaterNeeded(this.sensorValue)
            }

            this.signal.addEventListener('abort', () => {
                return reject({ error: 'Aborted' });
            });

            if (this.signal.aborted) {
                return Promise.reject({ error: 'Aborted' });
            }

            FC28.io.emit('SENSOR_MESSAGE', moisture);
            console.log(`Valor de humedad en medio: ${this.sensorValue}°C`);

            return resolve(moisture);
        });
    }

    static isWaterNeeded(value) {
        return !Boolean(value);
    }

    static abortRead() {
        this.controller.abort();
        return { signal: 'Aborted' };
    }

}


