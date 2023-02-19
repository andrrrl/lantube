import { Message } from '../../interfaces/Message.interface';
import * as Lcd from 'lcd';
import { Socket } from 'net';

export class LCD {

    public static messages: any[] = [];
    public static io: Socket;

    constructor(private io: Socket) {
        LCD.io = io;
    };

    static lcd: Lcd;

    public static init() {
        this.lcd = new Lcd({ rs: 7, e: 8, data: [25, 24, 23, 18], cols: 16, rows: 2 });
    }

    private static sendMessage(lines: Message) {
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

                    return resolve(lines);
                });
            });

            process.on('SIGINT', _ => {
                this.lcd.close();
            });

        });
    }

    public static queueMessage(message) {
        if (this.messages.length < 2) {
            console.log('Message queued:', message);
            this.messages.push(message);
        } else {
            console.log('Message not queued:', message);
        }
        this.processMessages();
    }

    private static processMessages() {
        if (this.messages.length === 1) {
            console.log('Processing 1 message:', this.messages[0]);
            this.sendMessage(this.messages[0]);

        } else if (this.messages.length > 1) {
            console.log('Processing messages:', this.messages);

            if (this.messages.some(x => x.type === 'coreTemp' && x.line2 === null) && this.messages.some(x => x.type === 'roomTemp')) {
                this.messages = [{ type: 'both', line1: this.messages[0].line1, line2: this.messages[1].line1 }];
            } else {
                this.sendMessage(this.messages.shift());
            }
            // this.sendMessage(this.messages.shift());

        } else {
            console.log('No messages to process');
        }
        console.log('Cantidad de mensajes:', this.messages.length);
    }

}
