;(function (exports) {
  'use strict';

  var path  = exports.path  || require('path')
    ;

  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  function safeResolve(basename, target) {
    basename = path.resolve(basename);

    var targetname = path.resolve(basename, target)
      , re = new RegExp('^' + escapeRegExp(basename) + '(/|$)')
      ;

    return re.test(targetname) && targetname;
  }

  exports.safeResolve = safeResolve;
  exports.escapeRegExp = escapeRegExp;

  function create(Desi) {
    var fsapi = Desi.fsapi || require('./node-adapters').fsapi
      ;

    fsapi.getConfigs = function (confs) {
      var opts = { extensions: ['yml', 'yaml', 'json'], dotfiles: false, contents: true, sha1sum: true }
        ;

      return fsapi.getMeta(confs, opts).then(function (collections) {
        var obj = {}
          ;

        Object.keys(collections).forEach(function (key) {
          var files = collections[key]
            , keyname = key.replace(/\.(json|ya?ml|\/)$/i, '')
            ;

          obj[keyname] = obj[keyname] || {};

          files.forEach(function (file) {
            var filename = file.name.replace(/\.(json|ya?ml)$/i, '')
              , data = {}
              ;

            if (file.error) {
              console.error(file);
              console.error(file.error);
              return;
            }

            if (/\.(ya?ml)$/i.test(file.name)) {
              try {
                data = Desi.YAML.parse(file.contents) || {};
                if ("undefined" === data) {
                  data = {};
                }
              } catch(e) {
                data = { error: e };
                console.error("Could not parse yaml for " + filename);
                console.error(file);
                console.error(e);
              }
            }
            else if (/\.(json)$/i.test(file.name)) {
              try {
                data = JSON.parse(file.contents) || {};
              } catch(e) {
                data = { error: e };
                console.error("Could not parse json for " + filename);
                console.error(file);
                console.error(e);
              }
            } else {
              console.error("Not sure what to do with this one...");
              console.error(file);
            }

            obj[keyname][filename] = data || obj[keyname][filename];
            /*
            if (!obj[keyname][filename]) {
              obj[keyname][filename] = {};
            }

            Object.keys(data).forEach(function (key) {
              obj[keyname][filename][key] = data[key];
            });
            */
          });
        });

        return obj;
      });
    };

    fsapi.getAllPartials = function () {
      return fsapi.getConfigs(['partials', 'partials.yml']).then(function (results) {
        var partials = {}
          ;

        Object.keys(results.partials).forEach(function (key) {
          var partial = results.partials[key]
            ;

          Object.keys(partial).forEach(function (prop) {
            if (partials[prop]) {
              console.warn('partial \'' + prop + '\' overwritten by ' + key);
            }

            partials[prop] = partial[prop];
          });
        });

        return partials;
      });
    };

    fsapi.getAllConfigFiles = function () {
      return fsapi.getConfigs(['config.yml', 'site.yml', 'authors']).then(function (results) {
        var authors = results.authors
          , config = results.config.config
          , site = results.site.site
          ;

        return { config: config, authors: authors, site: site };
      });
    };

    return exports;
  }

  if (exports.Desirae) {
    create(exports.Desirae);
  }
  else {
    exports.create = create;
  }
}('undefined' !== typeof exports && exports || window));
