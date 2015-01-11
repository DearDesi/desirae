'use strict';

angular.module('myApp.authors', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/authors', {
    templateUrl: 'views/authors/authors.html',
    controller: 'AuthorsCtrl as Authors'
  });
}])

.controller('AuthorsCtrl'
  , ['$scope', '$timeout', '$location', 'Desirae'
  , function($scope, $timeout, $location, Desirae) {
  var scope = this
    ;

  scope.newAuthor = function () {
    console.log('new author');
    scope.new = { filename: 'new' };
    scope.selectAuthor(scope.new);
  };

  scope.selectAuthor = function (author) {
    // TODO watch any change
    scope.selectedAuthor = author || scope.selectedAuthor;
    scope.updateHeadshotUrlNow();
  };

  scope.upsert = function () {
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
      $location.path('/site');
    }).catch(function (e) {
      author.filename = filename;
      console.error(e);
      window.alert("Error Nation! :/");
      throw e;
    });
  };

  scope.updateHeadshotUrlNow = function () {
    var gravatar = 'http://www.gravatar.com/avatar/' + window.md5((scope.selectedAuthor.email||'foo').toLowerCase()) + '?d=identicon'
      ;

    if (scope.selectedAuthor.headshot) {
      scope.headshot = scope.selectedAuthor.headshot;
    }
    else if (scope.selectedAuthor.email) {
      scope.headshot = gravatar;
    }
    else {
      scope.headshot = 'http://www.gravatar.com/avatar/' + window.md5((scope.selectedAuthor.email||'foo').toLowerCase()) + '?d=mm';
    }
  };

  scope.updateHeadshotUrl = function () {
    $timeout.cancel(scope.hslock);
    scope.hslock = $timeout(function () {
      scope.updateHeadshotUrlNow();
    }, 300);
  };

  function init() {
    scope.newAuthor();

    console.log('desi loading');
    Desirae.meta().then(function (desi) {
      var filename
        ;

      scope.blogdir = desi.blogdir.path.replace(/^\/(Users|home)\/[^\/]+\//, '~/');
      desi.authors = desi.authors || {};
      desi.authors.new = scope.new;
      scope.authors = desi.authors;
      
      Object.keys(desi.authors).forEach(function (filename) {
        if ('new' === filename) {
          return;
        }
        desi.authors[filename].filename = filename;
        desi.authors[filename].handle = desi.authors[filename].handle || filename;
      });

      filename = Object.keys(desi.authors)[0];
      scope.selectedAuthor = desi.authors[filename];

      scope.updateHeadshotUrlNow();
    }).catch(function (e) {
      window.alert("An Error Occured. Most errors that occur in the init phase are parse errors in the config files or permissions errors on files or directories, but check the error console for details.");
      console.error(e);
      throw e;
    });
  }

  init();
  /*
  $scope.$watch(angular.bind(this, function () { return this.selectedAuthor; }), function (newValue, oldValue) {
  //$scope.$watch('Authors.selecteAuthor', function (newValue, oldValue) 
    console.log(newValue, oldValue);
    if(newValue !== oldValue) {
      scope.dirty = true;
    }
  }, true);
  */
}]);
