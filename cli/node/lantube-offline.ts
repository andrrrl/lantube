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
import * as colors from 'cli-color';

require('dotenv').config({
    path: rootDir + '.env'
});

// let colors = new colorsSafe();


console.log(colors.bold.yellow('             ╭───────────────────────────╮            '));
console.log(colors.bold.yellow('╭────────────┤  ▶ Lantube "OFFLINE" CLI  ├───────────╮'));
console.log(colors.bold.yellow('│            ╰───────────────────────────╯           │'));
console.log(colors.bold.yellow('│  Connection type: ' + process.env.DB_TYPE + '                            │'));

if (process.argv.length === 3) {

    if (process.argv[2] == 'help') {

        console.log(colors.bold('  Lantube offline tool'));
        console.log(colors.bold(' - This tool will add Youtube videos to ' + process.env.DB_TYPE));
        console.log(colors.bold(' - Use cases: '));
        console.log('   > The Lantube server is down.');
        console.log('   > The Lantube server is running in another computer.\n');
        console.log(colors.bold(' - Usage examples:'));
        console.log('   > $ node lantube-offline.js "YOUTUBE_ID"');
        console.log('   > $ node lantube-offline.js "https://www.youtube.com/watch?v=YOUTUBE_ID"');
        console.log('   > $ node lantube-offline.js "https://m.youtube.com/watch?v=YOUTUBE_ID&feature=youtu.be"');
        console.log(colors.bold(' (Other Youtube URL formats should work)\n'));
        console.log(colors.bold.yellow('╰────────────────────────────────────────────────────╯'));
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
        console.log(colors.bold.red('│                 ' + 'Invalid Youtube ID.') + colors.bold.yellow('                │'));
        console.log(colors.bold.yellow('╰────────────────────────────────────────────────────╯'));
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
                    let videoId = 'video' + Number(videos_count + 1);
                    // let title = body.title.replace(/"/g, '');

                    let title = body.title.replace(/(^[a-z]|\s[a-z])/g, (p) => {
                        return p.toUpperCase();
                    });

                    let videoUri = yt_id;

                    let thumb = body.thumbnail_url;

                    let order = String(videos_count + 1);
                    // Redis no acepta objetos JSON aun... ¬_¬
                    // let video_string = '{ "videoId": "' + videoId + '",' +
                    //     '"title": "' + title + '",' +
                    //     '"url": "' + yt_id + '",' +
                    //     '"img": "' + body.thumbnail_url + '",' +
                    //     '"order": ' + String(videos_count + 1) + '}';

                    let video_string = `{"videoId":"${videoId}","videoInfo":{"videoId":"${videoId}","title":"${title}","url":"${videoUri}","img":"${thumb}"},"order":${order}}`;

                    conn.hmset('videos', String(videoId), video_string, (err) => {

                        conn.hget('videos', videoId, (err, video) => {

                            if (err) {
                                console.log(err);
                            } else {
                                let vid = JSON.parse(video);
                                console.log(
                                    colors.green.bold('  [OK] Video inserted into Lantube DB!') + '\n' +
                                    colors.green.bold('   Details: ') + '\n' +
                                    colors.green.bold('   videoId: 	') + vid.videoId + '\n' +
                                    colors.green.bold('   title: ') + vid.title + '\n' +
                                    colors.green.bold('   url: 	') + vid.url + '\n' +
                                    colors.green.bold('   img: ') + vid.img + '\n' +
                                    colors.green.bold('   order: ') + (vid.order + 1)
                                );
                            }

                        });
                    });
                });


            } else {
                console.log(colors.bold.yellow('│  ') + colors.bold.red(error)) + colors.bold.yellow('│');
                console.log(colors.bold.yellow('╰────────────────────────────────────────────────────╯'));
            }

        });

    }

} else {
    console.log(colors.bold.yellow('│  ') + colors.bold.red('[ERR] Expecting a Youtube URL as unique argument') + colors.bold.yellow('  │'));
    console.log(colors.bold.yellow('╰────────────────────────────────────────────────────╯'));
}
