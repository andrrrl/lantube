'use strict';

const
	request = require('request'),
	mongoose = require('mongoose'),
	exec = require('child_process').exec,
	spawn = require('child_process').spawn;

var PlayerSchema = new mongoose.Schema({
    player: String,
    player_mode: String,
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

PlayerSchema.statics.getPlayer = function(player) {

	Player.findOne({})
		.exec( (err, player_stats) => {
			// env
			return {
				player: player_stats.player || process.env.PLAYER || false,
				player_playlist: player_stats.player_playlist || process.env.PLAYER_PLAYLIST || false,
				player_mode: player_stats.player_mode || process.env.PLAYER_MODE || 'windowed'
			}
		});


}

// Config Sys Vol
PlayerSchema.statics.configVolume = function(options) {
	let volume = {
		player_volume: options.volume,
		player_is_muted: options.isMuted
	}

	return volume;

}

// Get Sys Vol
PlayerSchema.statics.getVolume = function(volume_value, cb) {
	
	Player.findOne(
		{ host: process.env.HOST_NAME }, 
		{ player_volume: 1, player_is_muted: 1 })
		.exec(function(err, pv) {

			if (err) {
				console.log(err);
			}

			return cb(pv[volume_value || 50]);
		});
}

// Set Sys Vol
// Increases/decreases volume by defined value in .env for PLAYER_VOLUME_STEP or 5% if no value defined
PlayerSchema.statics.setVolume = function(options, cb) {

	// Get current volume value
	Player.getVolume('player_volume', function(PlayerVol) {
		
		let stepVol = parseInt(process.env.PLAYER_VOLUME_STEP || 5);
		
		let playerMode = Player.getStat('player_mode', function(PlayerMode) {

			switch (options.action) {
				case 'up':
					if (PlayerVol <= 99) {
						if ( PlayerMode == 'chromecast' ) {
							// let chromecast = spawn('castnow');
							// chromecast.stdin.setEncoding('utf-8');
							// chromecast.stdout.pipe(process.stdout);
							// chromecast.stdout.on('data', data => {
							// 	console.log(PlayerMode);
							// 	setTimeout(function(){
							// 		// "\027[A"
							// 		chromecast.stdin.write("m\n");
							// 		chromecast.stdin.pause();
							// 		chromecast.kill();
							// 	}, 1000);
							// });
						} else {
							exec('amixer -c 0 sset Master 1%+');
							// exec('pactl set-sink-volume 0 +' + stepVol + '%');
						}
						PlayerVol += 1;
					} else {
						exec('amixer -c 0 sset Master 100%');
						PlayerVol = 100;
					}
					break;
				case 'down':
					if (PlayerVol >= 1) {
						exec('amixer -c 0 sset Master 1%-');
						PlayerVol -= 1;
					} else {
						exec('amixer -c 0 sset Master 0%');
						PlayerVol = 0;
					}
					break;
				case 'mute':
					exec('amixer -c 0 sset Master toggle');
					break;
				case 'unmute':
					exec('amixer -c 0 sset Master toggle')
					break;
				default:
					exec('amixer -c 0 sset Master ' + parseInt(options.action) + '%');
					PlayerVol = options.action;
					break;
			}

			// Update 
			let Server_Stats = Player.configVolume({ volume: PlayerVol, isMuted: options.isMuted });
			Player.findOneAndUpdate(
				{ host: process.env.HOST_NAME }, 
				{ $set: Server_Stats }, 
				{ upsert: true, new: true }
            ).exec(function(err, stats) {
					return cb(stats);
				});
		});

	});

}


var Player = mongoose.model(process.env.MONGO_PLAYER_COLL || 'player', PlayerSchema);

var playerSchema = {
	'Player': Player
}

module.exports = playerSchema;