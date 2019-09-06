import * as express from 'express';
import { Relay } from '../../controllers/relay/relay';

let router = express.Router();

export = () => {

    let relayCtrl = new Relay();

    router.route('/api/relay/on')

        .get(async (req, res, next) => {
            let realy = await relayCtrl.relayON();
            res.json(realy);
        });

    router.route('/api/relay/off')

        .get(async (req, res, next) => {
            let realy = await relayCtrl.relayOFF();
            res.json(realy);
        });

    return router;

}