import * as dht from 'pigpio-dht';
import { Socket } from 'net';

export class DHT11 {

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
        }, 300000);
    }

    initSensor() {
        return new Promise(async (resolve, reject) => {

            const dataPin = 4;
            const dhtType = 11; //optional
            const sensor = dht(dataPin, dhtType);

            this.readSensor(sensor);

            sensor.on('result', data => {

                const temperatura = {
                    sensor: 'dht-11',
                    value: `${data.temperature}°C`
                }

                const humedad = {
                    sensor: 'dht-11',
                    value: `${data.humidity}%`
                }

                this.io.emit('SENSOR_MESSAGE', { temperatura, humedad });
                console.log(`temperatura: ${data.temperature}°C`);
                console.log(`humedad: ${data.humidity}%`);
                resolve({
                    sensor: {
                        name: 'dht-11',
                        dataTypes: ['temperatura', 'humedad']
                    }
                });
            });

            sensor.on('badChecksum', () => {
                this.io.emit('SENSOR_MESSAGE', { message: 'checksum failed' });
                console.log('checksum failed');
            });


        });
    }
}