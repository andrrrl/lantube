import * as express from 'express';
import { FanRelay } from '../../controllers/relay/relay';

let router = express.Router();

export = () => {

    router.route('/api/relay/on')

        .get(async (req, res, next) => {
            FanRelay.relayON();
            res.json({ relay: 'ON' });
        });

    router.route('/api/relay/off')

        .get(async (req, res, next) => {
            FanRelay.relayOFF()
            res.json({ relay: 'OFF' });
        });

    return router;

}