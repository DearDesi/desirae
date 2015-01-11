'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.about',
  'myApp.authors',
  'myApp.site',
  'myApp.build',
  'myApp.create',
  'myApp.version',
  'myApp.services'
]).
config(['$routeProvider', function ($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/about'});
}]);
