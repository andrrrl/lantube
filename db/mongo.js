#!/bin/env node

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var mongo_db = process.env.MONGO_DB || 'lantube';
var mongo_coll = process.env.MONGO_COLL || 'videos';
var mongo_user = process.env.MONGO_USER || 'admin';

mongoose.Promise = global.Promise;
var MongoDB = mongoose.connect('mongodb://localhost/' + mongo_db).connection;

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
