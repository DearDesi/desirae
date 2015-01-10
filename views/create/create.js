'use strict';

angular.module('myApp.create', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/create', {
    templateUrl: 'views/create/create.html',
    controller: 'CreateCtrl as Create'
  });
}])

.controller('CreateCtrl', [function() {
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
