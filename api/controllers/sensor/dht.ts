import * as dht from 'pigpio-dht';
import { Socket } from 'net';

export class DHT11 {

    // Optional, default 11 (lightblue hw component), the other type is 22 (white hw component)
    dhtType = 11;


    // DHT-11 => Raspberry Pi3 B+ pinout:

    /**
     *  ╭────╮
     * 
     *   DHT11
     * 
     *  ╰┬┬┬┬╯
     *   1234
     * 
     * 1 Vcc (rojo)       => Pin 2 (5v)
     * 2 Signal (blanco)  => Pin 7 (data)
     * 3 [sin uso]
     * 4 Ground (negro)   => Pin 6 (ground)
     * 
     */
    dataPin = 4;

    constructor(private io: Socket) {
        this.io = io;
    };

    readSensor(sensor) {
        console.log('Leyendo datos del sensor...')
        sensor.read();
        // warning: the sensor can only be red every 2 seconds
        // 1000 ms * 60 * 5 === leer cada 5 minutos
        setTimeout(() => {
            sensor.read();
        }, 3000);
    }

    initSensor() {
        return new Promise((resolve, reject) => {

            const sensor = dht(this.dataPin, this.dhtType);

            this.readSensor(sensor);

            sensor.on('result', data => {

                const temperatura = {
                    sensor: `dht-${this.dhtType}`,
                    value: `${data.temperature}°C`
                }

                const humedad = {
                    sensor: `dht-${this.dhtType}`,
                    value: `${data.humidity}%`
                }

                this.io.emit('SENSOR_MESSAGE', { temperatura, humedad });
                console.log(`temperatura: ${data.temperature}°C`);
                console.log(`humedad: ${data.humidity}%`);

                return resolve({
                    sensor: {
                        name: `dht-${this.dhtType}`,
                        dataTypes: ['temperatura', 'humedad'],
                        temperatura,
                        humedad
                    }
                });
            });

            sensor.on('badChecksum', () => {
                this.io.emit('SENSOR_MESSAGE', { message: 'checksum failed' });
                console.log('checksum failed');
                return reject({ message: 'Error: comprobar conexión del componente.' });
            });
        });
    }
}