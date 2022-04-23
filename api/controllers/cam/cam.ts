import * as UVCControl from 'uvc-control';
import { Socket } from 'net';

export class WebCam {

    camera: UVCControl;

    constructor(private io: Socket) {

        this.camera = new UVCControl(2760, 13392);
        // console.log(this.camera);

        this.camera.get('brightness', (err, val) => {
            if (err) return console.log(err);
            console.log('Sharpness is', val);
        });

        this.camera.close();

        // UVCControl.controls.forEach(function (name) {
        //     console.log(name);
        // })

        // this.camera.get('autoFocus', function(error,value) {
        //     if (!error) {
        //         console.log('AutoFocus setting:', value);
        //     }
        // });

        // this.camera.set('brightness', 100, function(error) {
        //     if (!error) {
        //         console.log('Brightness Set OK!');
        //     }
        // });
    }
}