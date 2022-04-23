import * as ds18b20 from 'ds18b20-raspi';
import { Socket } from 'net';
import { LCD } from '../lcd/lcd';

export class DS18B20 {

    // Optional, for a specific 1-Wire device id
    static deviceId = '28-0000096f75b2';

    // Sensor name
    static sensorName = 'DS18B20'
    static io: Socket;

    static dangerTempLimit: 30;
    static coolTempLimit: 25;

    static ds18b20Temp;

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
        console.log(`Inciando ${DS18B20.sensorName}`);
        // process.on('warning', e => console.warn(e.stack));
        DS18B20.io = io;
    };

    static readSensor() {
        console.log(`Leyendo datos del sensor ${this.sensorName}...`);
        return new Promise(async (resolve, reject) => {

            this.ds18b20Temp = await ds18b20.readSimpleC(this.deviceId, 2);
            const temperatura = {
                sensor: `${this.sensorName}`,
                type: 'temperature',
                temperature: {
                    unit: '°C',
                    value: this.ds18b20Temp,
                    dangerTempLimit: this.dangerTempLimit,
                    coolTempLimit: this.coolTempLimit
                }
            }

            DS18B20.io.emit('SENSOR_MESSAGE', temperatura);
            console.log(`Temperatura ambiente: ${this.ds18b20Temp}°C`);

            LCD.init();
            LCD.queueMessage({
                type: 'roomTemp',
                line1: `Temp amb: ${this.ds18b20Temp}C`,
                line2: null
            });

            return resolve(temperatura);
        });
    }

}