'use strict';

var express = require('express');
var router = express.Router();
var request = require('request');
var schema = require('../models/Videos');
var server_schema = require('../models/Server');

var Videos = schema.Videos;
var Server = server_schema.Server;

module.exports = router;