'use strict';

const
  os = require('os'),
  request = require('request');

const redis = require('../../db/redis');

require('./Player');

let Server = {};

let player_stats = {
    player: process.env.PLAYER,
    status: 'idle',
    video_id: 0,
    video_title: '',
    last_updated: new Date(),
  }

// Player
Server.getPlayerStats = (status, video_id, video_title) => {
  player_stats = {
    player: process.env.PLAYER,
    status: status || 'idle',
    video_id: video_id || 0,
    video_title: video_title || '',
    last_updated: new Date(),
  }
  return player_stats;
}

Server.setPlayerStats = (status, video_id, video_title) => {
  let pstats = Server.getPlayerStats(status, video_id, video_title);
  redis.set('player_stats', JSON.stringify(pstats), () => {
    redis.get('player_stats', (err, stats) => {
      return stats;
    });
  });

}

Server.playerStats = (cb) => {
  redis.get('player_stats', (err, stats) => {
    return cb(stats || JSON.stringify(player_stats));
  });
}
////

Server.getServerStats = () => {
  let server_stats = {
    host: process.env.HOST_NAME,
    type: os.type(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: os.uptime(),
    loadaverage: os.loadavg(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    last_updated: new Date()
  }
  return server_stats;
}

Server.setServerStats = () => {
  let sstats = Server.getServerStats();
  redis.set('server_stats', JSON.stringify(sstats));
  return sstats;
}

Server.serverStats = (cb) => {
  redis.get('server_stats', (err, stats) => {
	if (stats) {
		return cb(stats);
	} else {
		return cb(JSON.stringify(Server.getServerStats()));
	}
  });
}


var serverSchema = {
  'Server': Server
}

module.exports = serverSchema;
