"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
let router = express.Router();
var schema = require('../../schemas/redis/Videos');
var server_schema = require('../../schemas/redis/Server');
var Videos = schema.Videos;
var Server = server_schema.Server;
module.exports = router;
//# sourceMappingURL=videos.js.map