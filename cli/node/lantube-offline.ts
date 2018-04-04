#!/usr/bin/node

/**
 *
 *  Lantube Node.js OFFLINE mode
 *
 *  - Project: https://github.com/andrrrl/lantube
 *  - Author: Andrrr <andresin@gmail.com>
 *  - This little tool let's you add videos to storage (locar or remote)
 *
 */

let rootDir = '../../';
import * as colors from 'colors/safe';
require('dotenv').config({
    path: rootDir + '.env'
});

console.log(colors('             ╭───────────────────────────╮            ').bold.yellow);
console.log(colors('╭────────────┤  ▶ Lantube "OFFLINE" CLI  ├───────────╮').bold.yellow);
console.log(colors('│            ╰───────────────────────────╯           │').bold.yellow);
console.log(colors('│             ' + process.env.DB_TYPE + '            │').bold.yellow);

if (process.argv.length === 3) {

    if (process.argv[2] == 'help') {

        console.log('  Lantube offline tool'.bold);
        console.log(' - This tool will add Youtube videos to the playlist directly into MongoDB (no API)'.bold);
        console.log(' - Use cases: '.bold);
        console.log('   > The Lantube server is down.');
        console.log('   > The Lantube server is running in another computer.\n');
        console.log(' - Usage examples:'.bold);
        console.log('   > $ node lantube-offline.js "YOUTUBE_ID"');
        console.log('   > $ node lantube-offline.js "https://www.youtube.com/watch?v=YOUTUBE_ID"');
        console.log('   > $ node lantube-offline.js "https://m.youtube.com/watch?v=YOUTUBE_ID&feature=youtu.be"');
        console.log(' (Other Youtube URL formats should work)\n'.bold);
        console.log(colors('╰────────────────────────────────────────────────────╯').bold.yellow);
        process.exit();
    }

    // Passed video
    let v = {
        url: process.argv[2].toString()
    };

    // Extract Youtube video ID
    var yt_id = v.url.trim().replace(/http(s?):\/\/(w{3}?)(\.?)youtube\.com\/watch\?v=/, '');

    // Check ID
    if (yt_id.length !== 11) {
        console.log(colors('│                 ' + 'Invalid Youtube ID.').bold.red + colors('                │').bold.yellow);
        console.log(colors('╰────────────────────────────────────────────────────╯').bold.yellow);
        process.exit();
    } else {

        const
            request = require('request');

        request({
            url: 'http://www.youtube.com/oembed?url=' + v.url + '&format=json',
            json: true
        }, function (error, response, body) {

            if (!error && response.statusCode === 200) {

                const
                    conn = require(rootDir + 'connections/' + process.env.DB_TYPE + '.js');
                // model = require(rootDir + 'models/' + process.env.DB_TYPE + '/Videos.js');


                conn.hlen('videos', (err, videos_count) => {
                    if (err) {
                        console.log(err);
                    }
                    let video_id = 'video' + Number(videos_count + 1);
                    // let title = body.title.replace(/"/g, '');

                    let title = body.title.replace(/(^[a-z]|\s[a-z])/g, (p) => {
                        return p.toUpperCase();
                    });

                    // Redis no acepta objetos JSON aun... ¬_¬
                    let video_string = '{ "_id": "' + video_id + '",' +
                        '"title": "' + title + '",' +
                        '"url": "' + yt_id + '",' +
                        '"img": "' + body.thumbnail_url + '",' +
                        '"order": ' + String(videos_count + 1) + '}';


                    conn.hmset('videos', String(video_id), video_string, (err) => {

                        conn.hget('videos', video_id, (err, video) => {

                            if (err) {
                                console.log(err);
                            } else {
                                let vid = JSON.parse(video);
                                console.log(
                                    colors('  [OK] Video inserted into Lantube DB!').green.bold + '\n' +
                                    colors('   Details: ').green.bold + '\n' +
                                    colors('   _id: 	').green.bold + vid._id + '\n' +
                                    colors('   title: ').green.bold + vid.title + '\n' +
                                    colors('   url: 	').green.bold + vid.url + '\n' +
                                    colors('   img: ').green.bold + vid.img + '\n' +
                                    colors('   order: ').green.bold + (vid.order + 1)
                                );
                            }



                        });
                    });
                });

                // model.Videos.findOne()
                //     .sort('-order')
                //     .exec(function (err, result) {
                //         if (err) {
                //             console.log(err);
                //         } else {

                //             body.title = body.title.replace(/(^[a-z]|\s[a-z])/g, function (p) {
                //                 return p.toUpperCase();
                //             });

                //             if (result.title != body.title) {

                //                 let video = new model.Videos({
                //                     title: body.title,
                //                     url: v.url,
                //                     img: body.thumbnail_url,
                //                     order: parseInt(result.order) + 1
                //                 });

                //                 video.save(function (err, result) {
                //                     if (err) {
                //                         console.log(err);
                //                     } else {
                //                         console.log(
                //                             '  [OK] Video inserted into Lantube DB!'.green.bold + '\n' +
                //                             '   Details: '.green.bold + '\n' +
                //                             '   _id: 	'.green.bold + result._id + '\n' +
                //                             '   title: '.green.bold + result.title + '\n' +
                //                             '   url: 	'.green.bold + result.url + '\n' +
                //                             '   img: '.green.bold + result.img + '\n' +
                //                             '   order: '.green.bold + (result.order + 1)
                //                         );
                //                     }

                //                     db.close();
                //                 });

                //             } else {
                //                 console.log('  [ERR] Video already exists'.bold.red);
                //                 console.log('╰────────────────────────────────────────────────────╯'.bold.yellow);
                //                 db.close();
                //                 process.exit();
                //             }

                //         }
                //     });

            } else {
                console.log(colors('│             ' + ('ERROR ' + response.statusCode + ': Video not found')).bold.red + colors('             │').bold.yellow);
                console.log(colors('╰────────────────────────────────────────────────────╯').bold.yellow);
            }

        });

    }

} else {
    console.log(colors('│  ' + '[ERR] Expecting a Youtube URL as unique argument').bold.red + colors('  │').bold.yellow);
    console.log(colors('╰────────────────────────────────────────────────────╯').bold.yellow);
}
