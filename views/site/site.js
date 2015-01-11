'use strict';

angular.module('myApp.site', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/site', {
    templateUrl: 'views/site/site.html',
    controller: 'SiteCtrl as Site'
  });
}])

.controller('SiteCtrl', ['$scope', 'Desirae', function($scope, Desirae) {
  var scope = this
    ;

  console.log('desi loading');
  Desirae.meta().then(function (desi) {
    console.log('desi loaded');
    console.log(desi);
    scope.blogdir = desi.blogdir.path.replace(/^\/(Users|home)\/[^\/]+\//, '~/');
  }).catch(function (e) {
    window.alert("An Error Occured. Most errors that occur in the init phase are parse errors in the config files or permissions errors on files or directories, but check the error console for details.");
    console.error(e);
    throw e;
  });
}]);
