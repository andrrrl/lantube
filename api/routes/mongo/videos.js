'use strict';

var express = require('express');
var router = express.Router();
var request = require('request');
var schema = require('../../models/' + process.env.DB_TYPE + '/Videos');
var server_schema = require('../../models/' + process.env.DB_TYPE + '/Server');

var Videos = schema.Videos;
var Server = server_schema.Server;

module.exports = router;
