#!/bin/env node

var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');

var mongo_db = process.env.MONGO_DB || 'lantube';
var mongo_coll = process.env.MONGO_COLL || 'videos';
var mongo_user = process.env.MONGO_USER || 'admin';

mongoose.Promise = global.Promise;
var MongoDB = mongoose.connect('mongodb://localhost/' + mongo_db).connection;

autoIncrement.initialize(MongoDB);

MongoDB.on('error', function(err) {
    console.log(err.message);
});
MongoDB.once('open', function() {
    console.log('Connected to MongoDB.');
});