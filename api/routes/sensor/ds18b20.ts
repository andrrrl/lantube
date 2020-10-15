import * as express from 'express';
import { DS18B20 } from './../../controllers/sensor/ds18b20';

let router = express.Router();

export = (io) => {

    router.route('/api/sensor/ds18b20')

        .get(async (req, res, next) => {
            await new DS18B20(io);
            let ds18b20 = await DS18B20.initSensor();
            res.json(ds18b20);
        });

    return router;

}