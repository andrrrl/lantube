'use strict';

angular.module('lantubeApp')

    // App factory
    .factory('videos', ['$http', '$log', function($http, $log) {

    	// Defaults
    	var obj = {
    		videos: [], // Init videos array
    		player: {},
    		videoModes: {
    			title: 'Playback mode:',
    			modes: {
    				fullscreen: 'Fullscreen',
    				windowed: 'Windowed',
    				noVideo: 'Audio only',
    				chromecast: 'Chromecast'
    			},
    			selected: 'windowed'
    		},
    		isPlaying: false, // Order in the list of current playing video
    		nowPlaying: false, // Current playing video
    		showStop: false, // Show "Stop" button?
    		playAllText: 'Play All', // Text for "play all" button
    		stopText: 'Stop All', // Text for "stop" button
    		playFullscreenText: 'Play fullscreen',
    		playerVolume: '',
    		playerVolumeStep: '',
    		playerIsMuted: false
    	};

    	// Get all videos
    	obj.getAll = function() {
    		return $http.get('/api/videos').success(function(data) {
    			// Don't autoplay
    			obj.isPlaying = false;
    			// create a deep copy of the returned data (this way $scope.videos will be keep updated)
    			angular.copy(data, obj.videos);

    		});
    	};

    	// Get video data (unused for now)
    	obj.get = function(id) {
    		return $http.get('/api/videos/' + id).then(function(res) {
    			return res.data;
    		});
    	};

    	// Add a new video to the list
    	obj.add = function(video) {
    		video = video || '';
    		// Post new video 
    		return $http.post('/api/videos', { video: video })
    			.success(function(data) {
    				obj.videos.push(data);
    			});
    	};

    	// Play single video by id or entire list, if id == 0 (default)
    	obj.play = function(id, video_mode) {

    		$log.log('video_mode: ' + video_mode);
    		$log.log('id: ' + id);
    		$log.log('obj.isPlaying: ' + obj.isPlaying);
    		obj.isPlaying
    		
    		// avoid opening player twice
    		if (id == obj.isPlaying) {
    			return;
    		}

    		// avoid undefined video mode
    		if (video_mode == '') {
    			video_mode = 'windowed';
    		}

    		if (obj.isPlaying) {
    			obj.stop();
    		}

    		id = id || 0;

    		if (id) {
    			obj.isPlaying = id;
    			obj.playAllText = 'Playing...';
    			obj.showStop = true;

    			// Set the video mode
    			$http.put('/api/videos/player', { video_mode: video_mode }).success(function(res) {

    				$log.log('Client: ');
    				$log.log(res);

    				if (id != 'all') {
    					// Play single video
    					return $http.get('/api/videos/' + id + '/play').then(function(res) {
    						if (res.data.next_id < obj.videos.length) {
    							return obj.play(res.data.next_id);
    						}
    					});
    				} else {
    					// Play entire list
    					return $http.get('/api/videos/playlist').then(function(res) {
    						return res.data.playing;
    					});
    				}

    			});

    		}
    	};

    	// Stop all playback (single or list)
    	obj.stop = function() {
    		return $http.get('/api/videos/stop').then(function(res) {
    			if (res.data.result == 'stopped')
    				obj.isPlaying = 0;
    			obj.showStop = false;
    			obj.playAllText = 'Play All';
    			return res.data;
    		});
    	}

    	// Set video mode
    	obj.setVideoMode = function(fs) {
    		return $http.patch('/api/videos/stats', { fs: fs }).then(function(res) {
    			return res;
    		});
    	}

    	// Get player config
    	obj.player = function() {
    		return $http.get('/api/videos/player').then(function(res) {
    			obj.videoModes.selected = res.data.player_mode;
    			return res.data;
    		});
    	}

    	// Volume!
    	obj.setVolume = function(action) {
    		if ( action == 99 ) action = 100;
    		return $http.get('/api/player/volume/' + action);
    	}

    	return obj;

    }]);