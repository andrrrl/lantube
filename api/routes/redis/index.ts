// import * as express from 'express';
// import * as request from 'request';
// import * as redisClient from 'redis';

// let router = express.Router();
// let schema = require('../../schemas/redis/Videos');
// let Videos = schema;

// // let serverSchema = require('../../schemas/redis/Server');
// // let Server = serverSchema;
// import * as ServerCtrl from '../../schemas/redis/Server';

// let Server = new ServerCtrl.Server();

// import * as redis from '../../connections/redis';

// // const redis = redisClient.createClient();
// // let redis = require('../../connections/redis');

// let player = require('./player');

// // Disallow non-LAN or Local IPs
// router.use(function (req, res, next) {

//     let ip: any = (req.ip ? [req.ip] : req.headers['X-Forwarded-For'] || req.headers['x-forwarded-for']);

//     if (ip.find(x => x.match('192.168.')) || ip == '::1' || ip == '::ffff:127.0.0.1') {
//         next();
//     } else {
//         res.status(401);
//         res.send('Yikes! ' + ip + ' is NOT allowed.');
//         res.end();
//     }

// });

// function eventStreamResponse(type, req, res, results) {

//     req.socket.setTimeout(9999);

//     let messageCount = 0;
//     // let subscriber = redis.createClient();

//     redis.subscribe("updates");
//     // When we receive a message from the redis connection
//     redis.on("message", (channel, message) => {
//         messageCount++; // Increment our message count

//         res.write('id: ' + (new Date().getMilliseconds()) + '\n');
//         res.write("data: " + JSON.stringify(results) + '\n\n'); // Note the extra newline
//     });

//     res.writeHead(200, {
//         'Content-Type': 'text/event-stream',
//         'Cache-Control': 'no-cache',
//         'Connection': 'keep-alive'
//     });

//     res.write('\n');

//     res.on("close", () => {
//         redis.unsubscribe();
//         redis.quit();
//     });

// }

// /**
//  * Server ans Player status
//  */
// router.route('/api/status')
//     .get(function (req, res, next) {

//         switch (req.query.type) {
//             case 'player':
//                 Server.getPlayerStats(player_stats => {
//                     res.json(JSON.parse(player_stats));
//                 });
//                 break;
//             case 'server':
//             default:
//                 Server.getServerStats(server_stats => {
//                     res.json(JSON.parse(server_stats));
//                 });
//                 break;
//         }

//     });

// /**
//  * Server stats
//  */
// router.route('/api/stats')
//     .get(function (req, res, next) {

//         let stats = {};

//         switch (req.query.type) {
//             case 'server':
//                 Server.serverStats(server_stats => {
//                     // Poll status to client
//                     eventStreamResponse('status', req, res, server_stats);
//                 });
//                 break;
//             case 'player':
//                 Server.getServerStats(player_stats => {
//                     // Poll status to client
//                     eventStreamResponse('status', req, res, player_stats);
//                 });
//                 break;
//             default:
//                 stats = {};
//                 break;
//         }


//         // });
//     });


// // GET all
// // router.route('/api/videos')

// // GET ALL VIDEOS
// // .get(function (req, res, next) {

// //     redis.hgetall('videos', (err, videos_redis) => {
// //         let videos = [];
// //         let i = 1;
// //         for (let video in videos_redis) {
// //             videos.push(JSON.parse(videos_redis[String('video' + i)]));
// //             i++;
// //         }
// //         if (videos.length > 0) {
// //             res.json(videos);
// //         } else {
// //             res.json([]);
// //         }
// //     });

// // })

// // POST (insert)
// // .post(function (req, res, next) {

// //     // Extract Youtube video ID
// //     let yt_id = req.body.video.trim().replace(/http(s?):\/\/(w{3}?)(\.?)youtube\.com\/watch\?v=/, '');

// //     // Check ID
// //     if (yt_id === '') {
// //         res.json({
// //             result: 'error',
// //             error: 'No video.'
// //         });
// //     } else {
// //         if (yt_id.indexOf('http') === -1 && yt_id.indexOf('youtube') > -1) {
// //             yt_id = 'https://www.' + yt_id;

// //         } else if (yt_id.indexOf('youtube') === -1) {
// //             yt_id = 'https://www.youtube.com/watch?v=' + yt_id;
// //         }
// //     }

// //     // Get video data from Youtube embed API
// //     request({
// //         url: 'http://www.youtube.com/oembed?url=' + req.body.video + '&format=json',
// //         json: true
// //     }, function (error, response, body) {

// //         if (!error && response.statusCode === 200) {

// //             redis.hlen('videos', (err, videos_count) => {
// //                 if (err) {
// //                     console.log(err);
// //                 }
// //                 let video_id = 'video' + Number(videos_count + 1);
// //                 let title = body.title.replace(/"/g, '');

// //                 //   console.log({
// //                 //     _id: video_id,
// //                 //     title: body.title,
// //                 //     url: req.body.video,
// //                 //     img: body.thumbnail_url,
// //                 //     order: videos_count + 1
// //                 //   });
// //                 //   res.end();



// //                 // Redis no acepta objetos JSON aun... ¬_¬
// //                 let video_string = '{ "_id": "' + video_id + '",' +
// //                     '"title": "' + title + '",' +
// //                     '"url": "' + yt_id + '",' +
// //                     '"img": "' + body.thumbnail_url + '",' +
// //                     '"order": ' + String(videos_count + 1) + '}';

// //                 redis.hmset('videos', String(video_id), video_string, (err) => {
// //                     redis.hget('videos', video_id, (err, video) => {

// //                         // Server.setPlayerStats('playing', video_id, title);

// //                         let vid = JSON.parse(video);
// //                         res.json({
// //                             result: 'ok',
// //                             _id: vid._id,
// //                             title: vid.title,
// //                             url: vid.url,
// //                             img: vid.img,
// //                             order: vid.order
// //                         });

// //                     });
// //                 });


// //             });
// //         }


// //     });
// // });


// // parameter middleware that will run before the next routes
// router.param('id', function (req, res, next, option) {

//     // TODO: Add some checks
//     req.params.option = option;


//     return next();
// });


// // GET (load)
// // router.route('/api/videos/:option')

// //     .get(function (req, res, next) {

// //         // Filter options
// //         if (req.params.option == 'list')
// //             return next();
// //         if (req.params.option == 'stop')
// //             return next();
// //         if (req.params.option == 'pls')
// //             return next();
// //         if (req.params.option == 'playlist')
// //             return next();
// //         if (req.params.option == 'stats')
// //             return next();
// //         if (req.params.option == 'player')
// //             return next();
// //         if (req.params.option == 'delete')
// //             return next();

// //         // Default is "_id"
// //         redis.hgetall(req.params.option, function (err, video) {

// //             if (err) {
// //                 console.log(err);
// //             } else {
// //                 res.json(video);
// //                 res.end();
// //             }

// //             return next();

// //         });

// //     });


// router.route('/api/videos/list').get((req, res, next) => {
//     redis.hgetall('videos', (err, videos_redis) => {
//         let videos = [];

//         // console.log(JSON.stringify(videos_redis));
//         Object.keys(videos_redis).forEach(video => {
//             videos.push(JSON.parse(videos_redis[video]));
//         });

//         videos.sort(function (a, b) {
//             return parseInt(a._id.replace(/video/, '')) - parseInt(b._id.replace(/video/, ''));
//         });

//         res.json(videos);
//         res.end();
//     });
// });




// // Not implemented yet!
// router.route('/api/videos/delete/:order')
//     .get(function (req, res, next) {

//         Videos.remove(req.params).exec(function (err, removed) {
//             Videos.reorder(function (next) {
//                 //res.json(req);
//                 res.end();
//                 return next();
//             });
//         });

//     });

// module.exports = router;
