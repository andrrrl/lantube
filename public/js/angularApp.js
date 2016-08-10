var app = angular.module('lantubeApp', ['ui.router', 'picardy.fontawesome']);

app.config([
	'$stateProvider', // provides page states
	'$urlRouterProvider', // provides redirecting
	function($stateProvider, $urlRouterProvider) {

    $stateProvider
		.state('home', {
			url: '/home',
			controller: 'MainCtrl',
			resolve: {
				videoPromise: ['videos', function(videos) {
					return videos.getAll();
				}]
			}
		});
    // .state('videos', {
    //     url: '/api/videos/{id}',
    //     templateUrl: '/videos.html',
    //     controller: 'VideosCtrl',
    //     resolve: {
    //         video: ['$stateParams', 'videos', function($stateParams, videos) {
    //             return videos.get($stateParams.id);
    //         }]
    //     }
    // });

    	// $urlRouterProvider.when('', '/');
		$urlRouterProvider.otherwise('home');
	}
]);

app.factory('videos', ['$http', '$log', function($http, $log) {
	
	var obj = {
		videos: [],
		isPlaying: 0,
		showStop: false,
		playAllText: 'Play All',
		stopText: 'Stop'
	};

	obj.getAll = function() {
		return $http.get('/api/videos').success(function(data) {
			obj.isPlaying = false;
			// create a deep copy of the returned data (this way $scope.videos will be keep updated)
			angular.copy(data, obj.videos);
		});
	};

	obj.get = function(id) {
		return $http.get('/api/videos/' + id).then(function(res) {
			return res.data;
		});
	};

	obj.add = function(video, order) {
		video = video || '';
		order = order || 1;
		return $http.post('/api/videos', {video: video, order: order})
			.success(function(data) {
				obj.videos.push(data);
			});
	};
	
	obj.play = function(order) {
		order = order || 0;
		obj.isPlaying = order;
		obj.playAllText = 'Playing...';
		obj.showStop = true;
		
		if ( order > 0 ) {
			return $http.get('/api/videos/' + order + '/play').then(function(res) {
				if (res.data.next_order < obj.videos.length) {
					return obj.play(res.data.next_order);
				}
			});
		} else {
			return $http.get('/api/videos/playlist').then(function(res) {
				return res.data.playing;
			});
		}
	};

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