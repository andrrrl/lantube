import * as express from 'express';
import { CoreTemp } from '../../controllers/sensor/coreTemp';

let router = express.Router();

export = (io) => {

    router.route('/api/sensor/coreTemp')

        .get(async (req, res, next) => {

            new CoreTemp(io);
            let coreTemp = await CoreTemp.sendCoreTemp();
            res.json(coreTemp);

        });

    return router;

}