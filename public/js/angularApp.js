// lantube App!
var app = angular.module('lantubeApp', ['ui.router', 'picardy.fontawesome']);

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
						return videos.getAll();
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
		isPlaying: 0, // Order in the list of current playing video, 0 means "play all"
		showStop: false, // Show "Stop" button?
		playAllText: 'Play All', // Text for "play all" button
		stopText: 'Stop' // Text for "stop" button
	};

	// Get all videos
	obj.getAll = function() {
		return $http.get('/api/videos').success(function(data) {
			// Don't play yet
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
	obj.play = function(order) {
		order = order || 0;
		
		obj.isPlaying = order;
		obj.playAllText = 'Playing...';
		obj.showStop = true;
		
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
	};

	// Stop all playback (single or list)
	obj.stop = function() {
		obj.isPlaying = 0;
		obj.showStop = false;
		obj.playAllText = 'Play All';
		return $http.get('/api/videos/stop').then(function(res){
			return res.data;
		});
	}

	return obj;

}]);

// App contrller
app.controller('MainCtrl', [
	'$scope',
	'$log',
	'videos',
	function($scope, $log, videos) {

		// Example
		$scope.videourl = 'https://www.youtube.com/watch?v=WFuWPhlsyEI';

		// get all videos
		$scope.videos = videos.videos;
		
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
		
		$scope.showStop = function() {
			return videos.showStop;
		}
		
		$log.log($scope.isPlaying());
		
		// add
		$scope.add = videos.add;
			
		// play
		$scope.play = videos.play;
		
		// stop
		$scope.stop = videos.stop;
		
		// Spinner color?
		$scope.spinnerColor = 'white';
		
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