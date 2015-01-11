'use strict';

angular.module('myApp.build', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/build', {
    templateUrl: 'views/build/build.html',
    controller: 'BuildCtrl as Build'
  });
}])

.controller('BuildCtrl', [function() {
}]);
