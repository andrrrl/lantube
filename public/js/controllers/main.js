'use strict';

// App controller
angular.module('lantubeApp')

    .controller('MainCtrl', [
    	'$scope',
    	'$rootScope',
    	'$log',
    	'videos',
    	function($scope, $rootScope, $log, videos) {

    		// handles the callback from the received event
    		var handleMsgCallback = function(msg) {

    			$scope.$apply(function() {
    				var server_response = JSON.parse(msg.data);

    				$scope.playerVolume = server_response.player_volume;
    				$scope.playerVolumeStep = server_response.player_volume_step;

    				switch (server_response.status) {

    					case 'idle':
    						videos.isPlaying = false;
    						videos.nowPlaying = false;
    						videos.showStop = false;
    						videos.playAllText = 'Play All';
    						break;

    					case 'playing':
    						videos.isPlaying = server_response.video_id;
    						videos.nowPlaying = server_response.video_title + ' [' + server_response.video_url + ']';
    						videos.showStop = true;
    						videos.playAllText = 'Playing...';
    						break;

    					case 'stopped':
    						videos.isPlaying = false;
    						videos.nowPlaying = false;
    						videos.showStop = false;
    						videos.playAllText = 'Play All';
    						break;

    					case 'added':
    						videos.videos = server_response.videos;
    						break;
    				}
    			});
    		}
    		
    		// Listen for SSE with stats data 
    		// So the page can update according to server changes
    		if (typeof(EventSource) !== "undefined") {
    			var stats_source = new EventSource('/api/videos/stats');
    			stats_source.addEventListener('message', handleMsgCallback, true);
    		}

    		// Init URL
    		$scope.videourl = '';

    		// get all videos
    		$scope.videos = videos.videos || [];

    		// video modes
    		$scope.videoModes = videos.videoModes;

    		// add
    		$scope.add = videos.add;

    		// play
    		$scope.play = videos.play;

    		// stop
    		$scope.stop = videos.stop;
    		
    		// volume
    		$scope.playerVolume = videos.playerVolume;
    		$scope.playerVolumeStep = videos.playerVolumeStep;
    		$scope.setVolume = videos.setVolume;

    		// "play all" text
    		$scope.playAllText = function() {
    			return videos.playAllText;
    		};

    		// "stop" text
    		$scope.stopText = function() {
    			return videos.stopText;
    		};

    		// is loading?
    		$scope.isPlaying = function(id) {
    			return videos.isPlaying;
    		};

    		// is playing?
    		$scope.nowPlaying = function(id) {
    			return videos.nowPlaying;
    		};

    		// show stop button?
    		$scope.showStop = function() {
    			return videos.showStop;
    		};

    		// Some colors? (just for testing)
    		$scope.logoColor = 'darkorange';
    		$scope.spinnerColor = '#ffffff';
    		$scope.playingColor = '#333333';
    		$scope.speakerColor = '#000000';

    	}
    ]);