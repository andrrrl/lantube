#!/usr/bin/node

/**
 * 
 *  Lantube Node.js CLI v 0.1.0 (for testing api calls)
 *  
 *  - Project: https://github.com/andrrrl/lantube
 *  - Author: Andrrr <andresin@gmail.com>
 *  - This CLI just sends api calls for:
 *  	a) list all videos: ` node lantube-cli.js list`
 *  	b) play all videos: `$ node lantube-cli.js playlist`
 *  	c) play single video: `$ node lantube-cli.js play [video_list_order=[n]]`
 *  	d) stop (anything that's playing): `$ node lantube-cli.js stop`
 *  	e) show server status: `$ node lantube-cli.js stats`
 */

'use strict';


// String.fromCharCode('9834'): ♪
// String.fromCharCode('9835'): ♫
// String.fromCharCode('9836'): ♬
// ▶	9654
// ▷	9655
// ⛑	9937

// Box chars: 
// From 9472 to 9599
// ─	9472
// │	9474
// ┌	9484
// ┐	9488
// └	9492
// ┘	9496
// ├	9500
// ┤	9508
// ┬	9516
// ┴	9524
// ┼	9532
// ╭	9581
// ╮	9582
// ╯	9583
// ╰	9584
// ╴	9588
// ╵	9589
// ╶	9590
// ╷	9591


// ▘	9624
// ▔	9620

const
  path = require('path'),
  request = require('request'),
  colors = require('colors'),
  readline = require('readline'),
  ip = require('ip'),

  LANTUBE_SERVER = 'http://' + ip.address() + ':3000/api/',
  TITLE_LANTUBE = 'Lantube says',
  MSG_ERROR = 'No',
  MSG_SERVER_DOWN = 'server down?',
  MSG_NO_OPTION = '[No option selected]',

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

var
  notifier = require('node-notifier'),
  options = {},
  lantube_message = '';

if (process.argv.length === 3) {
  options = {
    action: process.argv[2]
  };
} else if (process.argv.length === 4) {
  options = {
    module: process.argv[2],
    action: process.argv[3]
  };
} else {
  options = {
    module: process.argv[2],
    action: process.argv[3],
    order: process.argv[4] ? process.argv[4] : null
  };
}

console.log(process.argv);

if (options.action === 'play') {
  options.order = options.order || 1;
}
if (options.action === 'stop') {
  options.order = null;
}

if (typeof options.action !== 'undefined' && options.action !== 'help') {

  console.log('       ╭─────────────────╮       '.bold.yellow);
  console.log('╭──────┤  ▶ Lantube CLI  ├──────╮'.bold.yellow);
  console.log('│      ╰─────────────────╯      │'.bold.yellow);

  console.log(`${LANTUBE_SERVER}${(options.module ? options.module + '/' : '')}${(options.order ? options.order + '/' : '')}${options.action}`);

  request({
    url: `${LANTUBE_SERVER}${options.module}/${(options.order ? options.order + '/' : '')}${(options.action !== 'list' ? options.action : '')}`,
    json: true
  },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {

        var result = response.body;

        switch (options.action) {
          case 'list':
            lantube_message = 'Listing all videos...';
            var videos = result.sort((a, b) => +Number(b.videoId.replace('video', '')) - Number(a.videoId.replace('video', '')));
            result = '\n';
            for (let index in videos) {
              result +=
                '  ' + (videos[index].videoId < 10 ? ' ' : '') + videos[index].videoId.replace('video', '') +
                '  "' + videos[index].videoInfo.title + '"' +
                '  (' + videos[index].videoInfo.url + ')\n';
            };
            break;
          case 'play':
            lantube_message = 'Playing...';
            result = result.result;
            break;
          case 'prev':
            lantube_message = 'Playing previous...';
            result = result.result;
            break;
          case 'next':
            lantube_message = 'Playing next...';
            result = result.result;
            break;
          case 'playlist':
            lantube_message = 'Playing full Lantube list...';
            result = result.result;
            break;
          case 'stop':
            lantube_message = 'Stopping...';
            result = result.result;
            break;
          case 'stats':
            lantube_message = `Current ${options.module} stats...`;
            // console.log(response);
            let stats = response.body;
            // let unordered_stats = JSON.parse(response.body.match(/\{(.*)\}/)[0]);

            // var stats = {};
            // Object.keys(unordered_stats).sort().forEach(function (key) {
            //   stats[key] = unordered_stats[key];
            // });

            result = '\n';
            for (let stat in stats) {
              stats[stat] = `${stat.length <= 9 ? stats[stat] : stats[stat]}`;
              result += `${(' - ' + stat).bold.yellow}:\t${(stats[stat]).bold.white}\n`;
            };
            break;
          case 'player':
            lantube_message = 'Current player stats...';

            let unordered_player_stats = JSON.parse(response.body);

            var player = {};
            Object.keys(unordered_player_stats).sort().forEach(function (key) {
              player[key] = unordered_player_stats[key];
            });

            result = '\n';
            for (let stat in player) {
              player[stat] = stat.length <= 9 ? '        ' + player[stat] : player[stat] + '';
              result += ('  - ' + stat).bold.yellow + ': \t' + ('' + player[stat]).bold.white + '\n';
            };
            break;
          default:
            lantube_message = '[No action selected]';
            break;
        }

        // Define notification announcing action
        var lantube_notify = {
          title: 'Lantube',
          message: lantube_message,
          icon: path.join('../../public/favicon.png'),
          sound: true,
          wait: false
        }

        // Show bubble notification
        // TOO ANNOYING, disabled for now...
        // notifier.notify(lantube_notify);

        // Show console notification
        console.log('  ' + TITLE_LANTUBE.green.bold + ': [' + options.action.yellow.bold + ']');
        if (result) {
          console.log('  Result: '.green.bold + '[' + result.yellow.bold + ']');
        }



        if (options.action == 'list') {
          //console.log(videos);
          rl.question('Play a video from the list [1-' + videos.length + ']:\n', (num) => {

            console.log(LANTUBE_SERVER + 'player/' + videos.find(x => x.videoId.replace('video', '') === num).videoId.replace('video', '') + '/play')

            request({
              url: LANTUBE_SERVER + 'player/' + videos.find(x => x.videoId.replace('video', '') === num).videoId.replace('video', '') + '/play',
              json: true
            },
              function (error, response, body) {
                if (!error && response.statusCode == 200) {
                  var result = response.body;
                  console.log('Playing... "' + result.videoInfo.title + '"');
                  process.exit();
                }
              });

            rl.close();
          });
        } else {
          console.log('╰───────────────────────────────╯'.bold.yellow);
          process.exit();
        }

      } else {
        console.log('╰───────────────────────────────╯'.bold.yellow);
        console.log(TITLE_LANTUBE.green.bold + ': ' + MSG_ERROR.yellow.bold + ' ' + options.action.yellow.bold + ', ' + MSG_SERVER_DOWN.yellow.bold);
        process.exit();
      }
    });
} else {

  if (options.action == 'help') {
    lantube_message = '' +
      '       ╭─────────────────╮\n' +
      '╭──────┤ ♬  Lantube Help ├──────╮\n' +
      '│      ╰─────────────────╯      │\n' +
      '  - Usage: \n'.bold +
      '    node lantube-cli.js MODULE [OPTION]\n\n' +
      '  - Options: \n'.bold +
      '    Show this help:      help\n' +
      '    List all videos:     videos list\n' +
      '    Play all videos:     player playlist\n' +
      '    Play previous video: player prev\n' +
      '    Play next video:     player next\n' +
      '    Play single video:   player play ORDER\n' +
      '    Stop any playback:   player stop\n' +
      '    Show server stats:   server stats\n';
    '    Show player stats:   player stats\n';

    console.log(lantube_message.yellow.bold);
    console.log('╰───────────────────────────────╯'.bold.yellow);
    process.exit();
  } else {
    // Show "no options selected" message
    console.log(TITLE_LANTUBE.green.bold + ': ' + MSG_NO_OPTION.yellow.bold);
    console.log('Type ' + ('node lantube-cli.js help').bold + ' for a list of options');
    process.exit();
  }
}
