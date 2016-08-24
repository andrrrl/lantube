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

let
	path = require('path'),
	request = require('request'),
	colors = require('colors');

var
	notifier = require('node-notifier'),
	options = {},
	lantube_message = '';

const 
	LANTUBE_SERVER = 'http://localhost:3000/api/videos/',
	TITLE_LANTUBE = 'Lantube',
	MSG_SERVER_DOWN = 'Server down?',
	MSG_NO_OPTION = '[No option selected]';

if ( process.argv.length < 2 ) {
	options = { action: process.argv[2] };
} else {
	options = { action: process.argv[2], order: process.argv[3] ? process.argv[3] : null };
}

if ( options.action == 'play' ) {
	options.order = options.order || 1;
}

if ( typeof options.action !== 'undefined' && options.action != 'help' ) {
	
	request({
		url: LANTUBE_SERVER + ( options.order ? options.order + '/' : '' ) + ( options.action ),
		json: true
	}, 
	function(error, response, body) {
		if (!error && response.statusCode == 200) {	

			var result = response.body;
			
			switch( options.action ) {
				case 'list':
					lantube_message = 'Listing all videos...';
					let videos = result;
					result = '\n';
					for ( let index in videos ) {
						result += 
							' - order: ' + videos[index].order + 
							' | url: ' + videos[index].url + 
							' | title: ' + videos[index].title + '\n';
					};
				break;
				case 'play': 
					lantube_message = 'Playing...';
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
					lantube_message = 'Current server stats...';
					let unordered_stats = JSON.parse(response.body.match(/\{(.*)\}/)[0]);
					
					var stats = {};
					Object.keys(unordered_stats).sort().forEach(function(key) {
						stats[key] = unordered_stats[key];
					});
					
					result = '\n';
					for ( let stat in stats ) {
						result += ' - ' + stat + ':	' + ( '' + stats[stat] ).trim() + '\n';
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
				// icon: path.join(__dirname, 'icon.png'),
				sound: true,
				wait: false
			}
			
			// Show bubble notification
			//notifier.notify(lantube_notify);
			
			// Show console notification
			console.log('+-------------------------+');
			console.log(TITLE_LANTUBE.green.bold + ': [' + options.action.yellow.bold + ']');
			console.log('Result: '.green.bold + '[' + result.yellow.bold + ']');
			console.log('+-------------------------+');
		} else {
			console.log(TITLE_LANTUBE.green.bold + ': Can\'t '.yellow.bold + options.action.yellow.bold + ', ' + MSG_SERVER_DOWN.yellow.bold);
		}
	});
} else {
	
	if ( options.action == 'help' ) {
		lantube_message = '' +
			'+--------------------+\n' + 
			'|        help        |\n' +
			'+--------------------+\n' + 
			'- Show this help:  	`node lantube-cli.js help`\n' +
			'- List all videos: 	`node lantube-cli.js list`\n' +
			'- Play all videos: 	`node lantube-cli.js playlist`\n' +
			'- Play single video: 	`node lantube-cli.js play [order]`\n' +
			'- Stop any playback: 	`node lantube-cli.js stop`\n' +
			'- Show server stats: 	`node lantube-cli.js stats`\n';
			
		console.log(lantube_message.yellow.bold);
	} else {
		// Show "no options selected" message
		console.log(TITLE_LANTUBE.green.bold + ': ' + MSG_NO_OPTION.yellow.bold);
	}
}