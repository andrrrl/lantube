
import { Socket } from "net";
import * as mime from 'mime-types';
import * as fs from 'fs';
import * as path from 'path';


// tslint:disable-next-line:no-console
process.on('unhandledRejection', r => console.log(r));

export class Media {
    mediaList: string;
    root: string;

    constructor(private io: Socket) {
        this.io = io;
        this.root = process.env.MEDIA_FOLDERS;
    }

    readFolder(subfolder: string) {
        return new Promise((resolve, reject) => {

            // Full path
            const fullPath = path.normalize(`${this.root}/${subfolder}`);

            if (!path.isAbsolute(fullPath)) {
                return reject(new Error('Only absolute paths are allowed.'))
            }

            // Dir exists?
            if (!this.isDir(fullPath)) {
                return reject(new Error('Cannot read directory.'))
            }

            console.log(fullPath);

            fs.readdir(fullPath, (err, files: any) => {
                if (err) {
                    return reject(err);
                }

                files = files.map(fileName => ({ name: fileName, path: path.join(fullPath, fileName), mimeType: mime.contentType(fileName) }))
                    .filter(file => {
                        return mime.lookup(path.join(fullPath, file.name)).toString().indexOf('audio') > -1
                            || this.isDir(path.join(fullPath, file.name));
                    });

                return resolve({ files, isDirExists: this.isDir(fullPath) });
            });
        });
    }

    private isDir(path) {
        return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
    }

}