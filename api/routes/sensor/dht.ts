// import * as express from 'express';
// import { DHT11 } from '../../controllers/sensor/dht';

// let router = express.Router();

// export = (io) => {

//     let dhtCtrl = new DHT11(io);

//     router.route('/api/sensor/dht')

//         .get(async (req, res, next) => {
//             let dht = await dhtCtrl.initSensor();
//             res.json(dht);
//         });

//     return router;

// }