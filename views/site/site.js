'use strict';

angular.module('myApp.site', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/site', {
    templateUrl: 'views/site/site.html',
    controller: 'SiteCtrl as Site'
  });
}])

.controller('SiteCtrl', ['$scope', '$location', 'Desirae', function ($scope, $location, Desirae) {
  var scope = this
    ;


  function init() {
    console.log('desi loading');
    Desirae.meta().then(function (desi) {
      scope.blogdir = desi.blogdir.path.replace(/^\/(Users|home)\/[^\/]+\//, '~/');
      scope.site = desi.site;
    }).catch(function (e) {
      window.alert("An Error Occured. Most errors that occur in the init phase are parse errors in the config files or permissions errors on files or directories, but check the error console for details.");
      console.error(e);
      throw e;
    });
  }

  scope.upsert = function () {
    var files = []
      ;

    files.push({ path: 'site.yml', contents: scope.site });

    console.log(files);
    Desirae.putFiles(files).then(function (results) {
      console.log('TODO check for error');
      console.log(results);
      $location.path('/post');
    }).catch(function (e) {
      console.error(scope.site);
      console.error(e);
      window.alert("Error Nation! :/");
      throw e;
    });
  };

  init();
}]);
