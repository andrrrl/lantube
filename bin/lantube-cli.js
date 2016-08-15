#!/usr/bin/node

/**
 *
 *  Lantube Node.js CLI
 *  - Sends api calls for:
 *  	a) play all
 *  	b) play single
 *  	c) stop (anything that's playing)
 *  	d) server status
 *  	
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
	LANTUBE_SERVER = 'http://localhost:3000/api/videos/';

if ( process.argv.length < 2 ) {
	options = { action: process.argv[2] };
} else {
	options = { action: process.argv[2], order: process.argv[3] };
}

switch( options.action ) {
	case 'play': 
		lantube_message = 'Playing...';
		options.order = options.order || 1;
	break;
	case 'playlist': 
		lantube_message = 'Playing full Lantube list...';
	break;
	case 'stop': 
		lantube_message = 'Stopping...';
	break;
	case 'stats': 
		lantube_message = 'Current server stats...';
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

if ( typeof options.action !== 'undefined' ) { 
	request({
		url: LANTUBE_SERVER + ( options.order ? options.order + '/' : '' ) + ( options.action ),
		json: true
	}, 
	function(error, response, body) {
		if (!error && response.statusCode == 200) {	
			
			// Show bubble notification
			//notifier.notify(lantube_notify);

			var result = '';
			
			if ( options.action == 'stats' ) {
				let stats = JSON.parse(response.body.match(/\{(.*)\}/)[0]);
				//result = stats.status;
				result = '\n';
				for ( let stat in stats ) {
					result += stat + ': ' + stats[stat] + '\n';
				};
			} else {
				result = response.body.result;
			}
			// Show console notification
			console.log('+-------------------------+');
			console.log(lantube_notify.title.green.bold + ': [' + options.action.yellow.bold + ']');
			console.log('Result: '.green.bold + '[' + result.yellow.bold + ']');
			console.log('+-------------------------+');
		} else {
			console.log('Lantube: '.green.bold + 'Can\'t '.yellow.bold + options.action.yellow.bold + ', server down?'.yellow.bold);
		}
	});
} else {
	
	// Show "server down?" message
	console.log('Lantube: '.green.bold + lantube_message.yellow.bold);
}