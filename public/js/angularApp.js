var app = angular.module('lantubeApp', ['ui.router']);

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
		videos: []
	};

	obj.getAll = function() {
		return $http.get('/api/videos').success(function(data) {
			// create a deep copy of the returned data (this way $scope.videos will be keep updated)
			angular.copy(data, obj.videos);
		});
	};

	obj.get = function(id) {
		return $http.get('/api/videos/' + id).then(function(res) {
			return res.data;
		});
	};

	obj.play = function(order) {
		order = order || 1;
		return $http.get('/api/videos/' + order + '/play').then(function(res) {
			return obj.play(res.data.next_order);
		});
	}

	obj.add = function(video, order) {
		video = video || '';
		order = order || 1;
		return $http.post('/api/videos', {video: video, order: order})
		.success(function(data) {
			obj.videos.push(data);
		});
	};

	return obj;

}]);

app.controller('MainCtrl', [
	'$scope',
	'$log',
	'videos',
	function($scope, $log, videos) {

		// getAll
		$scope.videos = videos.videos;

		$scope.play = videos.play;

		$scope.add = videos.add;
		
	}
]);