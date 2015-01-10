'use strict';

angular.module('myApp.configure', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/configure', {
    templateUrl: 'views/configure/configure.html',
    controller: 'ConfigureCtrl as Configure'
  });
}])

.controller('ConfigureCtrl', [function() {
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
