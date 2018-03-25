'use strict';

var PlayerSchema = new mongoose.Schema({
  player: String,
  player_mode: {
    type: String,
    enum: ['windowed', 'fullscreen', 'audio only', 'chromecast']
  },
  player_volume: {
    type: Number,
    default: 50
  },
  player_volume_step: {
    type: Number,
    default: process.env.PLAYER_VOLUME_STEP
  },
  player_is_muted: {
    type: Boolean,
    default: false
  }

}, {
  collection: process.env.MONGO_PLAYER_COLL
});

module.exports = playerSchema;
