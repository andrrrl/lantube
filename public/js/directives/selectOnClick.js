'use strict';

// App directive, will focus (higllight) input text
angular.module('lantubeApp')
	.directive('selectOnClick', ['$window', function($window) {
		return {
			restrict: 'A',
			link: function(scope, element, attrs) {
				element.on('focus', function() {
					if (!$window.getSelection().toString()) {
						// Required for mobile Safari
						this.setSelectionRange(0, this.value.length)
					}
				});
			}
		};
	}]);