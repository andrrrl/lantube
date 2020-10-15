import * as Lcd from 'lcd';
import { Socket } from 'net';
import { OverloadedListCommand } from 'redis';

export class LCD {


    constructor(private io: Socket) {
        this.io = io;
    };

    lcd: Lcd = new Lcd({ rs: 7, e: 8, data: [25, 24, 23, 18], cols: 16, rows: 2 });

    message(line: string) {

        let line2: string;

        if (line && line.length > 16) {
            line2 = line.substr(16);
            line = line.substr(0, 15);
        }

        return new Promise((resolve, reject) => {
            this.lcd.on('ready', _ => {

                // Por defecto muestra la hora
                if (!line) {
                    let date = new Date();
                    date.setHours(date.getHours() - 3);
                    line = date.toString();
                }

                this.lcd.setCursor(0, 0);
                this.lcd.print(line, err => {
                    if (err) {
                        return reject(err);
                    }
                    this.io.emit('LCD_MESSAGE', { line });
                    return resolve({ line });
                });

                if (line2) {
                    this.lcd.setCursor(1, 0);
                    this.lcd.print(line2, err => {
                        if (err) {
                            return reject(err);
                        }
                        this.io.emit('LCD_MESSAGE', { line });
                        return resolve({ line });
                    });
                }

            });

            process.on('SIGINT', _ => {
                this.lcd.close();
            });

        });
    }

}
