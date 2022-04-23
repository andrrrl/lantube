import * as express from 'express';
import { DHT11 } from '../../controllers/sensor/dht';

let router = express.Router();

export = (io) => {
    router.route('/api/sensor/dht')

        .get(async (req, res, next) => {

            new DHT11(io);
            let dht = await DHT11.sendDhtTemp();
            res.json(dht);

        });

    return router;

}