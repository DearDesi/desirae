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
    console.log('yolo!');
    return;
    var author = scope.selectedAuthor
      , files = []
      , filename = author.filename
      ;

    delete author.filename;
    if ('new' !== filename && filename !== author.handle) {
      files.push({ path: 'authors/' + filename + '.yml', contents: '', delete: true });
    }
    files.push({ path: 'authors/' + author.handle + '.yml', contents: window.jsyaml.dump(author) });

    console.log(files);

    Desirae.putFiles(files).then(function (results) {
      console.log('updated author', results);
      $location.path('/post');
    }).catch(function (e) {
      author.filename = filename;
      console.error(e);
      window.alert("Error Nation! :/");
      throw e;
    });
  };

  init();
}]);
