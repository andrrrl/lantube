import { IMessage } from './../../interfaces/IMessage.interface';
import * as Lcd from 'lcd';
import { Socket } from 'net';

export class LCD {

    public static messages: any[] = [];

    constructor(private io: Socket) {
        this.io = io;
    };

    static lcd: Lcd;

    public static init() {
        this.lcd = new Lcd({ rs: 7, e: 8, data: [25, 24, 23, 18], cols: 16, rows: 2 });
    }

    private static sendMessage(lines: IMessage) {
        return new Promise((resolve, reject) => {

            // Imprimir mensaje en la consola
            console.log('LCD:', lines);

            if (!this.lcd) {
                return reject({ error: 'Debe llamar a init() para enviar un mensaje' });
            }

            this.lcd.on('ready', _ => {

                // Por defecto muestra la hora
                // let date = new Date();
                // date.setHours(date.getHours() - 3);
                // line = date.toString();

                this.lcd.setCursor(0, 0);
                this.lcd.print(lines.line1, err => {
                    if (err) {
                        return reject(err);
                    }

                    if (lines.line2) {
                        this.lcd.setCursor(0, 1);
                        this.lcd.print(lines.line2, err => {
                            if (err) {
                                return reject(err);
                            }
                        });
                    }

                    // this.io.emit('LCD_MESSAGE', lines);

                    // this.lcd.close();
                    return resolve(lines);
                });
            });

            process.on('SIGINT', _ => {
                this.lcd.close();
            });

        });
    }

    public static queueMessage(message) {
        console.log('Message queued:', message);
        this.messages.push(message);
        this.processMessages();
    }

    private static processMessages() {
        if (this.messages.length === 2) {
            console.log('Processing messages:', this.messages);

            console.log('Message: 1', this.messages[0]);
            this.sendMessage(this.messages[0]);

            setTimeout(() => {
                console.log('Message: 2', this.messages[1]);
                this.sendMessage(this.messages[1]);
                this.messages = [];
            }, 3000);

        }
    }

}
