#!/bin/env node

var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');

var mongo_host = process.env.MONGO_HOST || 'localhost';
var mongo_port = process.env.MONGO_PORT || '';
var mongo_db   = process.env.MONGO_DB   || 'lantube';
var mongo_user = process.env.MONGO_USER || 'admin';
var mongo_pass = process.env.MONGO_PASS || '';

var mongo_remote = process.env.MONGO_AUTH === 'yes' ? true : false;

var mongo_conn = '';

if ( mongo_remote ) {
    mongo_conn = 'mongodb://' + mongo_user + ':' + mongo_pass + '@' + mongo_host + ':' + mongo_port + '/' + mongo_db; 
} else {
    mongo_conn = 'mongodb://' + mongo_host + '/' + mongo_db; 
}

mongoose.Promise = global.Promise;

var MongoDB = mongoose.connect(mongo_conn).connection;

autoIncrement.initialize(MongoDB);

MongoDB.on('error', function(err) {
    console.log('  ' + err.message);
});
MongoDB.once('open', function() {
    console.log('  Connected to MongoDB');
});

module.exports = mongoose.connection;