'use strict';

// Lantube App!
angular.module('lantubeApp', ['ui.router', 'ngAnimate', 'picardy.fontawesome'])

// App config
.config([
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
						return [videos.getAll(), videos.player()];
					}]
				}
			});

		// $urlRouterProvider.when('', '/');
		$urlRouterProvider.otherwise('home');
	}
]);
