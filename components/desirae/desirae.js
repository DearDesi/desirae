angular.module('myApp.services', []).
  factory('Desirae', ['$q', function($q) {
    var Desi = window.Desi || require('./deardesi').Desi
      , desi = {}
      , fsapi = window.fsapi
      ;

    return {
      reset: function () {
        desi = {};
      }
    , toDesiDate: Desi.toLocaleDate
    , meta: function () {
        var d = $q.defer()
          ;

        if (desi.meta) {
          d.resolve(desi);
          return d.promise;
        }

        Desi.init(desi).then(function () {
          d.resolve(desi);
        });

        return d.promise;
      }
    , build: function (env) {
        var d = $q.defer()
          ;

        if (desi.built) {
          d.resolve(desi);
          return d.promise;
        }

        Desi.buildAll(desi, env).then(function () {
          d.resolve(desi);
        });

        return d.promise;
      }
    , write: function (env) {
        var d = $q.defer()
          ;

        if (desi.written) {
          d.resolve(desi);
          return d.promise;
        }

        Desi.write(desi, env).then(function () {
          d.resolve(desi);
        });

        return d.promise;
      }
    , putFiles: function (files) {
        return $q.when(fsapi.putFiles(files));
      }
    };
  }]
);
