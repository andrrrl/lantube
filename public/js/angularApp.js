// lantube App!
var app = angular.module('lantubeApp', ['ui.router', 'ngAnimate', 'picardy.fontawesome']);

// App config
app.config([
	'$stateProvider', // provides page states
	'$urlRouterProvider', // provides redirecting
	function($stateProvider, $urlRouterProvider) {

	    $stateProvider
			.state('home', {
				url: '/home',
				controller: 'MainCtrl',
				resolve: {
					// Get all saved videos 
					videoPromise: ['videos', function(videos) {
						return [ videos.getAll(), videos.player() ];
					}]
				}
			});

    	// $urlRouterProvider.when('', '/');
		$urlRouterProvider.otherwise('home');
	}
]);

// App factory
app.factory('videos', ['$http', '$log', function($http, $log) {

	// Defaults
	var obj = {
		videos: [], // Init videos array
		player: {},
		videoModes: {
			title: 'Playback mode:',
			modes: {
				fullscreen: 'Fullscreen',
				windowed: 'Windowed',
				noVideo: 'Audio only'
			},
			selected: 'windowed'
		},
		isPlaying: false, // Order in the list of current playing video
		nowPlaying: false, // Current playing video
		showStop: false, // Show "Stop" button?
		playAllText: 'Play All', // Text for "play all" button
		stopText: 'Stop All', // Text for "stop" button
		playFullscreenText: 'Play fullscreen'
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
	obj.get = function(order) {
		return $http.get('/api/videos/' + order).then(function(res) {
			return res.data;
		});
	};

	// Add a new video to the list
	obj.add = function(video, order) {
		video = video || '';
		order = order || 1;
		// Post new video 
		return $http.post('/api/videos', {video: video, order: order})
			.success(function(data) {
				obj.videos.push(data);
			});
	};

	// Play single video by order or entire list, if order == 0 (default)
	obj.play = function(order, video_mode) {
		
		$log.log(video_mode);
		
		// avoid opening player twice
		if ( order == obj.isPlaying ) {
			return;
		}
		
		// avoid undefined video mode
		if ( video_mode == '' ){
			video_mode = 'windowed';
		}
		
		if ( obj.isPlaying ) {
			obj.stop();
		}
		
		order = order || 0;

		if ( order ){
			obj.isPlaying = order;
			obj.playAllText = 'Playing...';
			obj.showStop = true;

			// Set the video mode
			$http.put('/api/videos/player', { video_mode: video_mode }).success(function(res){
				
				$log.log('Client: ');
				$log.log(res);
				
				if ( order > 0 ) {
					// Play single video
					return $http.get('/api/videos/' + order + '/play').then(function(res) {
						if (res.data.next_order < obj.videos.length) {
							return obj.play(res.data.next_order);
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
		return $http.get('/api/videos/stop').then(function(res){
			if ( res.data.result == 'stopped' )
				obj.isPlaying = 0;
				obj.showStop = false;
				obj.playAllText = 'Play All';
			return res.data;
		});
	}
	
	// Set video mode
	obj.setVideoMode = function(fs) {
		return $http.patch('/api/videos/stats', { fs: fs }).then(function(res){
			return res;
		});
	}
	
	// Get player config
	obj.player = function() {
		return $http.get('/api/videos/player').then(function(res){
			$log.log(res.data.player_mode);
			obj.videoModes.selected = res.data.player_mode;
			return res.data;
		});
	}

	return obj;

}]);

// App contrller
app.controller('MainCtrl', [
	'$scope',
	'$rootScope',
	'$log',
	'videos',
	function($scope, $rootScope, $log, videos) {

        // handles the callback from the received event
        var handleCallback = function (msg) {
            $scope.$apply(function () {
                var server_stats = JSON.parse(msg.data);
				
				switch ( server_stats.status ) {

					case 'idle':
						videos.isPlaying = false;
						videos.nowPlaying = false;
						videos.showStop = false;
						videos.playAllText = 'Play All';
					break;

					case 'playing':
						videos.isPlaying = server_stats.video_order;
						videos.nowPlaying = server_stats.video_title + ' [' + server_stats.video_url + ']';
						videos.showStop = true;
						videos.playAllText = 'Playing...';
					break;

					case 'stopped':
						videos.isPlaying = false;
						videos.nowPlaying = false;
						videos.showStop = false;
						videos.playAllText = 'Play All';
					break;

				}
            });
        }

		// Listen for SSE with stats data 
		// So the page can update according to server changes
	    if (typeof(EventSource) !== "undefined") {
			var source = new EventSource('/api/videos/stats');
	        	source.addEventListener('message', handleCallback, true);
		}
		
		// Init URL
		$scope.videourl = '';

		// get all videos
		$scope.videos = videos.videos;
		
		// video modes
		$scope.videoModes = videos.videoModes;
		
		// add
		$scope.add = videos.add;
		
		// play
		$scope.play = videos.play;
		
		// stop
		$scope.stop = videos.stop;

		// "play all" text
		$scope.playAllText = function() {
			return videos.playAllText;
		};

		// "stop" text
		$scope.stopText = function() {
			return videos.stopText;
		};

		// is loading?
		$scope.isPlaying = function(order) { 
			return videos.isPlaying; 
		};
		
		// is playing?
		$scope.nowPlaying = function(order) { 
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

// App directive, will focus (higllight) input text
app.directive('selectOnClick', ['$window', function ($window) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.on('focus', function () {
                if (!$window.getSelection().toString()) {
                    // Required for mobile Safari
                    this.setSelectionRange(0, this.value.length)
                }
            });
        }
    };
}]);
