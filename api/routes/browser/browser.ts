import { Browser } from '../../controllers/browser/browser';
import * as express from 'express';
import * as sanitizer from '@braintree/sanitize-url';

let router = express.Router();

export = (io) => {

    router.route('/api/browser')

        .post(async (req, res, next) => {

            const sanitizedURL = sanitizer.sanitizeUrl(req.body.url);

            // Only to allow socket messages
            new Browser(io);

            let openBrowser = await Browser.openInBrowser(sanitizedURL);
            res.json(openBrowser);
        });

    return router;

}
