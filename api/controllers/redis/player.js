const
  request = require('request'),
  mongoose = require('mongoose'),
  exec = require('child_process').exec;
// spawn = require('child_process').spawn;

const Player = require('../../schemas/' + process.env.DB_TYPE + '/Player.js');

getPlayer = function (player) {


}

// Config Sys Vol
configVolume = function (options) {


}

// Get Sys Vol
getVolume = function (volume_value, cb) {


}

// Set Sys Vol
// Increases/decreases volume by defined value in .env for PLAYER_VOLUME_STEP or 5% if no value defined
setVolume = function (options, cb) {

}

module.exports = getPlayer;
