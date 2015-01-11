'use strict';

angular.module('myApp.configure', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/configure', {
    templateUrl: 'views/configure/configure.html',
    controller: 'ConfigureCtrl as Configure'
  });
}])

.controller('ConfigureCtrl', [function() {
}]);
