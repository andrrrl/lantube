import * as express from 'express';
import { FC28 } from '../../controllers/sensor/fc-28';

let router = express.Router();

export = (io) => {

    router.route('/api/sensor/fc28')

        .get(async (req, res, next) => {

            new FC28(io);
            let fc28 = await FC28.readSensor();
            res.json(fc28);

        });

    // No tiene mucho sentido como caso real de uso
    router.route('/api/sensor/fc28/abort')

        .get(async (req, res, next) => {

            new FC28(io);
            let fc28 = FC28.abortRead();
            res.json(fc28);

        });

    return router;

}