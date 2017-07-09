'use strict';

const
  os = require('os'),
  request = require('request');

const redis = require('../../db/redis');

require('./Player');


let Server = {};

Server.updateStats = function (status, video_id, video_title, video_url, video_img) {
  let stats = {
    host: process.env.HOST_NAME,
    type: os.type(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: os.uptime(),
    loadaverage: os.loadavg(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    status: status,
    video_id: video_id || 0,
    video_title: video_title,
    video_url: video_url,
    video_img: video_img
  }
  redis.hmset(['stats', process.env.HOST_NAME, JSON.stringify(stats)]);
}

Server.getStats = function () {
  redis.hgetall('stats', process.env.HOST_NAME, function (err, stats) {
    return JSON.parse(stats);
  });
}

var serverSchema = {
  'Server': Server
}

module.exports = serverSchema;
