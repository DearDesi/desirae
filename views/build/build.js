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
  , function ($scope, $location, $timeout, Desirae) {
  var scope = this
    , path = window.path
    ;

  function init() {
    console.log('desi loading');
    Desirae.meta().then(function (desi) {
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

  scope.onChange = function () {
    var post = scope.selected.post
      , selected = scope.selected
      ;

    post.yml.title = post.yml.title || '';
    post.yml.description = post.yml.description || '';

    if (selected.permalink === post.yml.permalink) {
      selected.permalink = '/articles/' + post.yml.title.toLowerCase()
        .replace(/["']/g, '')
        .replace(/\W/g, '-')
        .replace(/^-+/g, '')
        .replace(/-+$/g, '')
        .replace(/--/g, '-')
        + '.' + selected.format
        ;

      post.yml.permalink = selected.permalink;
    }
    if (window.path.extname(post.yml.permalink) !== '.' + selected.format) {
     post.yml.permalink = post.yml.permalink.replace(/\.\w+$/, '.' + selected.format);
    }

    post.frontmatter = window.jsyaml.dump(post.yml).trim();

    // TODO use some sort of filepath pattern in config.yml
    selected.path = window.path.join((selected.collection || 'posts'), window.path.basename(post.yml.permalink));
    selected.abspath = window.path.join(scope.blogdir, selected.path);
  };
  scope.onFrontmatterChange = function () {
    var data
      ;

    try {
      if (!scope.selected.post.frontmatter || !scope.selected.post.frontmatter.trim()) {
        throw new Error('deleted frontmatter');
      }
      data = window.jsyaml.load(scope.selected.post.frontmatter);
      scope.selected.format = data.permalink.replace(/.*\.(\w+$)/, '$1');
      if (!data.permalink) {
        data = scope.selected.permalink;
      }
      scope.selected.post.yml = data;
    } catch(e) {
      console.error(e);
      console.error('ignoring update that created parse error');
      scope.selected.post.frontmatter = window.jsyaml.dump(scope.selected.post.yml).trim();
    }
  };

  function updateDate() {
    $timeout.cancel(scope.dtlock);
    scope.dtlock = $timeout(function () {
      if (scope.selected && scope.selected.date === scope.selected.post.yml.date) {
        scope.selected.date = scope.selected.post.yml.date = Desirae.toDesiDate(new Date());
      }
      scope.onChange();
      updateDate();
    }, 60 * 1000);
  }

  scope.upsert = function () {
    console.log('upserted');
    if (-1 === scope.extensions.indexOf(scope.selected.format)) {
      window.alert('.' + scope.selected.format + ' is not a supported extension.\n\nPlease choose from: .' + scope.extensions.join(' .'));
      return;
    }

    scope.selected.post.yml.uuid = scope.selected.uuid;
    ['updated', 'theme', 'layout', 'swatch'].forEach(function (key) {
      if (!scope.selected.post.yml[key]) {
        delete scope.selected.post.yml[key];
      }
    });
    scope.onChange();

    var files = []
      ;

    files.push({
      path: scope.selected.path
    , contents: 
          '---\n'
        + scope.selected.post.frontmatter.trim()
        + '\n'
        + '---\n'
        + '\n'
        + scope.selected.post.body.trim()
    });

    console.log(files);
    Desirae.putFiles(files).then(function (results) {
      console.log('TODO check for error');
      console.log(results);
      $location.path('/build');
    }).catch(function (e) {
      $timeout.cancel(scope.dtlock);
      console.error(scope.site);
      console.error(e);
      window.alert("Error Nation! :/");
      throw e;
    });
  };

  init();
}]);
