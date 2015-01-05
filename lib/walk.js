'use strict';

var PromiseA = require('bluebird').Promise
  , fs = PromiseA.promisifyAll(require('fs'))
  , forEachAsync = require('foreachasync').forEachAsync
  , path = require('path')
  , walk = require('walk')
  , walker
  ;

function strip(prefix, pathname) {
  return pathname.substr(prefix.length + 1);
}

/*
function walkDir(parent, sub, opts) {
  opts = opts || {};

  var prefix = path.resolve(parent)
    , trueRoot = path.resolve(prefix, sub)
    , things = {}
    ;

  return fs.lstatAsync(trueRoot).then(function (stat) {
    var name = strip(prefix, trueRoot)
      ;

    things[name] = things[name] || {};
    things[name].name = stat.name;
    things[name].lastModifiedDate = stat.mtime.toISOString();
    things[name].contents = [];

    return new PromiseA(function (resolve) {
      walker = walk.walk(trueRoot);

      walker.on('directories', function (root, stats, next) {
        var dirname = strip(prefix, root)
          ;

        stats.forEach(function (stat) {
          var cdirname = path.join(dirname, stat.name)
            ;

          things[cdirname] = things[cdirname] || {};
          things[cdirname].name = stat.name;
          things[cdirname].lastModifiedDate = stat.mtime.toISOString();
          things[cdirname].contents = things[cdirname].contents || [];
        });

        next();
      });
      walker.on('directory', function (root, stat, next) {
        var dirname = strip(prefix, path.join(root, stat.name))
          ;

        things[dirname] = things[dirname] || {};
        things[dirname].name = stat.name;
        things[dirname].lastModifiedDate = stat.mtime.toISOString();
        things[dirname].contents = things[dirname].contents || [];

        next();
      });

      walker.on('files', function (root, stats, next) {
        var dirname = strip(prefix, root)
          ;

        function eachFile(stat) {
          var file
            ;

          file = {
            name: stat.name
          , lastModifiedDate: stat.mtime.toISOString()
          };

          things[dirname].contents.push(file);

          if (opts.contents) {
            return fs.readFileAsync(path.join(root, stat.name), 'utf8').then(function (contents) {
              file.contents = contents;
            });
          }
        }

        if (!opts.contents) {
          stats.forEach(eachFile);
          next();
        } else {
          forEachAsync(stats, eachFile).then(next);
        }
      });

      walker.on('end', function () {
        resolve(things);
      });
    });
  });
}
*/

function walkDir(parent, sub, opts) {
  opts = opts || {};

  var prefix = path.resolve(parent)
    , trueRoot = path.resolve(prefix, sub)
    , files = []
    ;

  return new PromiseA(function (resolve) {
    walker = walk.walk(trueRoot);

    walker.on('files', function (root, stats, next) {
      var dirname = strip(prefix, root)
        ;

      function eachFile(stat) {
        var file
          ;

        file = {
          name: stat.name
        , lastModifiedDate: stat.mtime.toISOString()
        , size: stat.size
        , path: dirname
        };
        files.push(file);

        if (opts.contents) {
          return fs.readFileAsync(path.join(root, stat.name), 'utf8').then(function (contents) {
            file.contents = contents;
          });
        }
      }

      if (!opts.contents) {
        stats.forEach(eachFile);
        next();
      } else {
        forEachAsync(stats, eachFile).then(next);
      }
    });

    walker.on('end', function () {
      resolve(files);
    });
  });
}

function walkDirs(parent, subs, opts) {
  opts = opts || {};

  var collections = {}
    ;

  return forEachAsync(subs, function (sub) {
    return walkDir(parent, sub, opts).then(function (results) {
      collections[sub] = results;
    });
  }).then(function () {
    return collections;
  });
}


/*
walkDirs('blog', ['posts'], { contents: false }).then(function (stats) {
  console.log(JSON.stringify(stats, null, '  '));
});
*/

module.exports.walkDir = walkDir;
module.exports.walkDirs = walkDirs;
