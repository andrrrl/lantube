import * as express from 'express';
import { CoreTemp } from '../../controllers/sensor/coreTemp';

let router = express.Router();

export = (io) => {

    let coreTempCtrl = new CoreTemp(io);

    router.route('/api/sensor/coreTemp')

        .get(async (req, res, next) => {
            let coreTemp = await coreTempCtrl.initSensor();
            res.json(coreTemp);
        });

    return router;

}