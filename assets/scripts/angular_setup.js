var myApp = angular.module('app', [], function($interpolateProvider) {
    $interpolateProvider.startSymbol('[[');
    $interpolateProvider.endSymbol(']]');
});

myApp.directive('validuri', function ($http) {
	return {
		require: 'ngModel',
		link: function (scope, elm, attr, ctrl)
		{
			scope.$watch(attr.ngModel, function (value) {
				$http.post('/validuri', {uri: value}).success(function (data) {
					ctrl.$setValidity('validuri', data === 'false' ? false : true);
				});
			});
		}
	}
});