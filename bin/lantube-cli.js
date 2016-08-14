#!/usr/bin/node

/**
 *
 * Timer for tea or mate time! or anything else. 
 * Displays system notification bubble
 * Author: Andrrr
 * 
 * Usage: $ node timer.js [time in minutes] [message on timer finish] 
 * Example: $ node timer.js 0.3 "Finished after 30 seconds!"
 * 
 */

'use strict';

let
    path = require('path'),
	colors = require('colors'),
	request = require('request');

var
	notifier = require('node-notifier');

const LANTUBE_SERVER = 'http://localhost:3000/api/videos/';

var options = {};

if ( process.argv.length < 2 ) {
	options = { action: process.argv[2] };
} else {
	options = { action: process.argv[2], order: process.argv[3] };
}

var lantube_message = '';

switch( options.action ) {
	case 'play': 
		lantube_message = 'Playing...';
		options.order = options.order || 1;
	break;
	case 'stop': 
		lantube_message = 'Stopping...';
	break;
	case 'playlist': 
		lantube_message = 'Playing full Lantube list...';
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
	function(error, response, videos) {
		if (!error && response.statusCode == 200) {	
			
			// Show bubble notification
			// notifier.notify(lantube_notify);
			
			// Show console notificatio
			console.log('+-------------------------+');
			console.log(lantube_notify.title.green.bold + ': [' + options.action.yellow.bold + ']');
			console.log('Result: '.green.bold + '[' + videos.result.yellow.bold + ']');
			console.log('+-------------------------+');
		}
	});

} else {
	
	console.log('Lantube: '.green.bold + lantube_message.yellow.bold);
	
}


