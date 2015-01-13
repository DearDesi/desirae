'use strict';

angular.module('myApp.build', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/build', {
    templateUrl: 'views/build/build.html',
    controller: 'BuildCtrl as Build'
  });
}])

.controller('BuildCtrl'
  , ['$scope', '$location', '$timeout', 'Desirae'
  , function ($scope, $location, $timeout, DesiraeService) {
  var scope = this
    , path = window.path
    ;

  function init() {
    console.log('desi loading');
    DesiraeService.meta().then(function (desi) {
      scope.blogdir = desi.blogdir.path.replace(/^\/(Users|home)\/[^\/]+\//, '~/');
      scope.site = desi.site;

      console.log(desi.site.base_url);
      console.log(desi.site.base_path);
      scope.production_url = desi.site.base_url + path.join('/', desi.site.base_path);
      console.log(scope.production_url);

      // this is the responsibility of the build system (Dear Desi), not the library (Desirae)
      scope.development_url = location.href.replace(/\/(#.*)?$/, '') + path.join('/', 'compiled_dev');
      console.log(scope.development_url);

    }).catch(function (e) {
      window.alert("An Error Occured. Most errors that occur in the init phase are parse errors in the config files or permissions errors on files or directories, but check the error console for details.");
      console.error(e);
      throw e;
    });

    scope.extensions = ['md', 'html'];
  }

  scope.onError = function (e) {
    console.error(e);
    if (window.confirm("Encountered an error. Please inspect the console.\n\nWould you like to ignore the error and continue?")) {
      return window.Promise.resolve();
    } else {
      return window.Promise.reject();
    }
  };

  scope.buildOne = function (envstr) {
    var env
      ;

    // TODO is there a legitimate case where in addition to base_path (root of the blog)
    // a user would need owner_base? i.e. school.edu/~/rogers/blog school.edu/~/rogers/assets
    if ('production' === envstr) {
      env = {
        url: scope.production_url
      , base_url: scope.development_url.replace(/(https?:\/\/[^\/#?]+)/, '$1')
      , compiled_path: 'compiled'
      , since: 0
      , onError: scope.onError
      };
    } else {
      env = {
        url: scope.development_url
      , base_url: scope.development_url.replace(/(https?:\/\/[^\/#?]+)/, '$1')
      , base_path: scope.development_url.replace(/https?:\/\/[^\/#?]+/, '')
      , compiled_path: 'compiled_dev'
      , since: 0
      , onError: scope.onError
      };
    }

    return DesiraeService.build(env).then(function () {
      DesiraeService.write(env);
    });
  };

  scope.build = function (envs) {
    window.forEachAsync(envs, function (env) {
      return scope.buildOne(env);
    }).then(function () {
      window.alert('Build(s) Complete');
    });
  };

  init();
}]);
