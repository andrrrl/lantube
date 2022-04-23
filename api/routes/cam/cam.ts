import { WebCam } from './../../controllers/cam/cam';
import * as express from 'express';

let router = express.Router();

export = (io) => {

    let webCamCtrl = new WebCam(io);

    /*router.route('/api/lcd/:message')

        .get(async (req, res, next) => {
            null
            let lcd = await lcdCtrl.message(0, req.params.message);
            res.json(lcd);
        });
    */

    // router.route('/api/lcd/off')

    //     .get(async (req, res, next) => {
    //         let lcd = await lcdCtrl.off();
    //         res.json(lcd);
    //     });

    return router;

}
