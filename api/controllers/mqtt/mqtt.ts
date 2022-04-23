import * as mqtt from 'mqtt';

export class MqttSensor {

    private host = process.env.MQTT_SERVER;
    private port = process.env.PORT
    private clientId: string;
    private connectUrl: string;

    connect() {
        this.connectUrl = `mqtt://${this.host}:${this.port}`;
        this.clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
        
        const client = mqtt.connect(this.connectUrl, {
            clientId: this.clientId,
            clean: true,
            connectTimeout: 4000,
            username: process.env.MQTT_USER,
            password: process.env.MQTT_PASSWORD,
            reconnectPeriod: 1000,
        });

        const topics = [
            'casa/temperatura',
            'casa/humedad'
        ];

        client.on('connect', () => {
            console.log('Mqtt server connected')
            client.subscribe(topics, () => {
                console.log(`Subscribed to topics '${topics.join(' / ')}'`);
            });
        });

        client.on('message', (topic, payload) => {
            console.log('Received Message:', topic, payload.toString());
        })

    }

}