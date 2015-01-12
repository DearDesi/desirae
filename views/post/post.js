'use strict';
angular.module('myApp.post', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/post', {
    templateUrl: 'views/post/post.html',
    controller: 'PostCtrl as Post'
  });
}])

.controller('PostCtrl'
  , ['$scope', '$location', '$timeout', 'Desirae'
  , function ($scope, $location, $timeout, Desirae) {
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

  scope.selected = {
    title: ""
  , format: 'md'
  , description: ""
  , permalink: "/article/new.md"
  , post: { 
      yml: {
        title: ""
      , description: ""
      , uuid: window.uuid.v4()
      , date: "YYYY-MM-DD HH:MM pm" // TODO desirae
      , permalink: "/article/new.md"
      , categories: []
      , tags: []
      , theme: null
      , layout: null
      , swatch: null
      }
    }
  };
  scope.selected.post.frontmatter = window.jsyaml.dump(scope.selected.post.yml);

  scope.onChange = function () {
    scope.selected.post.yml.title = scope.selected.title;
    scope.selected.post.yml.description = scope.selected.description;
    if (scope.selected.permalink === scope.selected.post.yml.permalink) {
      scope.selected.permalink = '/articles/' + scope.selected.title.toLowerCase()
        .replace(/["']/g, '')
        .replace(/\W/g, '-')
        + '.' + scope.selected.format
        ;
      scope.selected.post.yml.permalink = scope.selected.permalink;
    }
    scope.selected.post.frontmatter = window.jsyaml.dump(scope.selected.post.yml);
  };
  scope.onFrontmatterChange = function () {
    scope.selected.post.yml = window.jsyaml.load(scope.selected.post.frontmatter);
    scope.selected.title = scope.selected.post.yml.title;
    scope.selected.description = scope.selected.post.yml.description;
  };

  $timeout(function () {
    if (scope.selected && scope.selected.date === scope.selected.post.yml.date) {
      scope.selected.date = scope.selected.post.yml.date = new Date().toISOString();
    }
    scope.onChange();
  }, 60 * 1000);

  scope.upsert = function () {
    console.log(scope.selected.format)
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
