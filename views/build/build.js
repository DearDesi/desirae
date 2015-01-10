'use strict';

angular.module('myApp.build', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/build', {
    templateUrl: 'views/build/build.html',
    controller: 'BuildCtrl as Build'
  });
}])

.controller('BuildCtrl', [function() {
  var Desi = window.Desi || require('./deardesi').Desi
    , scope = this
    , desi = {}
    ;

  Desi.init(desi).then(function () {
    scope.run = function () {
      return Desi.runDesi(desi).then(function () { Desi.otherStuff(); })
        .catch(function (e) {
          console.error('A great and uncatchable error has befallen the land. Read ye here for das detalles..');
          console.error(e.message);
          console.error(e);
          throw e;
        });
    };
  });
}]);
