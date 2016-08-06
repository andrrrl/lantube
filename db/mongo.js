#!/bin/env node

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var mongo_user = process.env.MONGO_USER || 'admin';
var mongo_coll = process.env.MONGO_COLL || 'lantube';

mongoose.Promise = global.Promise;
var MongoDB = mongoose.connect('mongodb://localhost/lantube').connection;

MongoDB.on('error', function(err) {
    console.log(err.message);
});
MongoDB.once('open', function() {
    console.log('Connected to MongoDB with user ' + mongo_user);
});

var VideosSchema = new mongoose.Schema({
	url: {
		type: String,
		required: true
	},
	title: String,
    order: Number
}, {
    collection: 'videos'
});


var Videos = mongoose.model('videos', VideosSchema);

var schemas = {
    'Videos': Videos
}

module.exports = schemas;
