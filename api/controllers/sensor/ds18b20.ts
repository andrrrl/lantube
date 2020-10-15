import * as ds10b20 from 'ds18b20-raspi';
import { Socket } from 'net';
import { LCD } from '../lcd/lcd';

export class DS18B20 {

    // Optional, for a specific 1-Wire device id
    static deviceId = '';

    // Sensor name
    static sensorName = 'DS18B20'
    static io: Socket;


    // DS18B20 => Raspberry Pi3 B+ pinout:

    /**
     *   ___
     *  /   \
     *  |    |
     *  ╰┬┬┬╯
     *  / | \
     *  | | |
     *  1 2 3
     * 
     * 1 Ground (negro)     => Pin 6 (ground)
     * 2 Signal (amarillo)  => Pin 7 (data)
     * 3 Vcc (rojo)         => Pin 2 (3.3v)
     * 
     */

    constructor(private io: Socket) {
        DS18B20.io = io;
    };

    static initSensor() {
        return new Promise((resolve, reject) => {
            console.log(`Leyendo datos del sensor ${this.sensorName}...`)

            ds10b20.readSimpleC((err, temperature) => {

                if (err) {
                    return reject(err);
                }

                const temperatura = {
                    sensor: `${this.sensorName}`,
                    type: 'temperature',
                    unit: '°C',
                    value: temperature
                }

                DS18B20.io.emit('SENSOR_MESSAGE', temperatura);
                console.log(`Temperatura: ${temperature}°C`);

                LCD.init();
                LCD.queueMessage({
                    line1: `Temp amb: ${temperature}°C`,
                    line2: ''
                });

                setTimeout(() => {
                    DS18B20.initSensor();
                }, 3000);
                return resolve(temperature);
            });

        });
    }
}