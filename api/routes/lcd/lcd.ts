import * as express from 'express';
import { LCD } from '../../controllers/lcd/lcd';

let router = express.Router();

export = (io) => {

    // let lcdCtrl = new LCD(io);

    // router.route('/api/lcd/:message')

    //     .get(async (req, res, next) => {
    //         null
    //         let lcd = await lcdCtrl.message(0, req.params.message);
    //         res.json(lcd);
    //     });


    // router.route('/api/lcd/off')

    //     .get(async (req, res, next) => {
    //         let lcd = await lcdCtrl.off();
    //         res.json(lcd);
    //     });

    return router;

}
