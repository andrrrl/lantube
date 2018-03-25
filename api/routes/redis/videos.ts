import * as express from 'express';
import * as request from 'request';

let router = express.Router();

var schema = require('../../schemas/redis/Videos');
var server_schema = require('../../schemas/redis/Server');

var Videos = schema.Videos;
var Server = server_schema.Server;

module.exports = router;
