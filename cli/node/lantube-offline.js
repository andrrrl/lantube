#!/usr/bin/node

/**
 * 
 *  Lantube Node.js OFFLINE mode
 *  
 *  - Project: https://github.com/andrrrl/lantube
 *  - Author: Andrrr <andresin@gmail.com>
 *  - This little tool let's you add videos to Mongo (locar or remote) if the Lantube server is down.
 *
 */

'use strict';

let rootDir = '../../';

require('colors');
require('dotenv').config({
	path: rootDir + '.env'
});


if ( process.argv.length === 3 ) {
    
    let db = require(rootDir + 'db/mongo.js'),
    model = require(rootDir + 'models/Videos.js'),
    request = require('request');

    let v = {
        url: process.argv[2]
    };
    
    // Extract Youtube video ID
    var yt_id = v.url.trim().replace(/http(s?):\/\/(w{3}?)(\.?)youtube\.com\/watch\?v=/, '');
    
    // Check ID
    if ( yt_id.length !== 11 ) {
        console.log('Invalid Youtube ID.'.red.bold);
        process.exit();
    } else {
    
        request({
            url: 'http://www.youtube.com/oembed?url=' + v.url + '&format=json',
            json: true
        }, function (error, response, body) {

            if (!error && response.statusCode === 200) {
				
                var video = new model.Videos({
                    title: body.title,
                    url: v.url
                });
    			
                video.save(function(err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(
							'Video inserted to Lantube DB successfully!'.green.bold + '\n' +
							'Details: '.green.bold + '\n' +  
	                        '_id: 	'.green.bold + result._id + '\n' +
	                        'title: '.green.bold + result.title + '\n' +
	                        'url: 	'.green.bold + result.url + '\n' +
	                        'order: '.green.bold + result.order
						);
                    }
					db.close();
                });
                
            }
        });

    }

} else {
    console.log('Error: expecting a valid Youtube URL as unique argument');
}