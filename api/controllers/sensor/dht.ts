import * as dht from 'pigpio-dht';
import { Socket } from 'net';

export class DHT11 {

    static sensorName = 'DHT11';

    // Optional, default 11 (lightblue hw component), the other type is 22 (white hw component)
    static dhtType = 11;


    // DHT-11 => Raspberry Pi3 B+ pinout:

    /**
     *  ╭────╮
     * 
     *   DHT11
     * 
     *  ╰┬┬┬┬╯
     *   1234
     * 
     * 1 Vcc (rojo)             => Pin 2 (5v power)
     * 2 Signal (blanco/azul)   => Pin 36 (data, GPIO 16) | Pin 4 (data, GPIO 7)
     * 3 [sin uso]
     * 4 Ground (negro/marrón)  => Pin 6 (ground)
     * 
     */
    // NO ANDA!
    static dataPin = 5;
    static io: Socket;
    static temperature: { sensor: string; value: string; };
    static humidity: { sensor: string; value: string; };

    constructor(private io: Socket) {
        console.log(`Inciando ${DHT11.sensorName}`);

        DHT11.io = io;
    };

    static sendDhtTemp() {
        return new Promise((resolve, reject) => {


            console.log(`temperatura: ${this.temperature}°C`);
            console.log(`humedad: ${this.humidity}%`);

            const tempHum = {
                sensor: {
                    name: `dht-${this.dhtType}`,
                    dataTypes: ['temperatura', 'humedad'],
                    temperature: this.temperature,
                    humidity: this.humidity
                }
            };

            console.log(tempHum);
            this.io.emit('SENSOR_MESSAGE', tempHum);

            return resolve(tempHum);
        });
    }

    static initSensor() {

        const sensor = dht(this.dataPin, this.dhtType);

        console.log(`Leyendo datos del sensor ${DHT11.sensorName}...`);
        sensor.read();

        sensor.on('result', data => {

            this.temperature = {
                sensor: `dht-${this.dhtType}`,
                value: `${data.temperature}°C`
            }

            this.humidity = {
                sensor: `dht-${this.dhtType}`,
                value: `${data.humidity}%`
            }


        });

        sensor.on('badChecksum', () => {
            this.io.emit('SENSOR_MESSAGE', { message: 'checksum failed' });
            console.log('checksum failed');
            return { message: 'Error: comprobar conexión del componente.' };
        });
    }
}