import * as express from 'express';
import { DS18B20 } from './../../controllers/sensor/ds18b20';

let router = express.Router();

export = (io) => {


    router.route('/api/sensor/roomTemp')

        .get(async (req, res, next) => {

            new DS18B20(io);
            let ds18b20 = await DS18B20.readSensor();
            res.json(ds18b20);

        });

    return router;

}