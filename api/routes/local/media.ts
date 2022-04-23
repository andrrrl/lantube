import * as express from 'express';
import { Media } from '../../controllers/local/media';
import { IMediaType } from '../../interfaces/IMediaType.interface';


export = (io) => {

    const router = express.Router();

    const MediaCtrl = new Media(io);

    // Get all media files in folder set in
    router.route('/api/media/:subfolder?')
        .get(async (req, res, next) => {

            let subfolder = '';

            if (req.params.subfolder) {
                const buff = Buffer.from(req.params.subfolder, 'base64');
                subfolder = decodeURIComponent(buff.toString('utf8'));
                console.log('subfolder', subfolder);
            }

            const media = await MediaCtrl.readFolder(subfolder);

            console.log('media', media);

            return res.json(media);


        });

    return router;
}