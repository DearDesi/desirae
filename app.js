'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.about',
  'myApp.build',
  'myApp.version'
]).
config(['$routeProvider', function ($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/about'});
}]);
