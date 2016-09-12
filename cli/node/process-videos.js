'use strict';


const rootDir = '../../';

require('colors');
require('dotenv').config({
    path: rootDir + '.env'
});

const
    request = require('request'),
    db = require(rootDir + 'db/mongo.js'),
    collection = require(rootDir + 'models/Videos.js');
    
    
    collection.Videos
        .find()
        .exec(function(err, videos){ 
        
            videos.forEach(function(v) {
                
                request({
                    url: 'http://www.youtube.com/oembed?url=' + v.url + '&format=json',
                    json: true
                }, 
                function(error, response, body) {
                    if (!error && response.statusCode === 200) {
                        
                        collection.Videos
                            .findOneAndUpdate(
                                { _id: v._id}, 
                                { $set: { img: body.thumbnail_url } }, 
                                {upsert:false, new: true})
                            .exec(function(err, result){
                                console.log(result);
                            });
                    }
                });
                
            });
        
    });