'use strict';

var PromiseA      = require('bluebird').Promise
  , fs            = PromiseA.promisifyAll(require('fs'))
  , forEachAsync  = require('foreachasync').forEachAsync
  , path          = require('path')
  , walk          = require('walk')
  , escapeRegExp  = require('./deardesi-utils').escapeRegExp
  , safeResolve   = require('./deardesi-utils').safeResolve
  , sha1sum       = function (str) { return require('secret-utils').hashsum('sha1', str); }
  ;

function strip(prefix, pathname) {
  return pathname.substr(prefix.length + 1);
}

function walkDir(parent, sub, opts) {
  opts = opts || {};

  var prefix = path.resolve(parent)
    , trueRoot = path.resolve(prefix, sub)
    , files = []
    ;

  function filter(name) {
    if (!name) {
      return false;
    }

    if ('.' === name[0] && !opts.dotfiles) {
      return false;
    }

    if (opts.extensions && opts.extensions.length) {
      if (!opts.extensions.some(function (ext) {
        return new RegExp('\\.' + escapeRegExp(ext) + '$').test(name);
      })) {
        return false;
      }
    }

    return true;
  }

  return new PromiseA(function (resolve) {
    var walker = walk.walk(trueRoot)
      ;

    walker.on('nodeError', function (filepath, stat, next) {
      //stats.forEach(function (stat) {
      if (!filter(stat.name)) {
        return;
      }

      stat.error.path = path.join(strip(prefix, filepath), stat.name);
      files.push({
        name: stat.name
      , relativePath: strip(prefix, filepath)
      , type: undefined
      , error: stat.error
      });
      //});

      next();
    });

    walker.on('files', function (root, stats, next) {
      var dirname = strip(prefix, root)
        ;

      function eachFile(stat) {
        var file
          ;


        if (!filter(stat.name)) {
          return;
        }

        file = {
          name: stat.name
        , lastModifiedDate: stat.mtime.toISOString()
        , size: stat.size
        , relativePath: dirname
        , type: undefined // TODO include mimetype
        };
        files.push(file);

        if (opts.contents) {
          return fs.readFileAsync(path.join(root, stat.name), null).then(function (buffer) {
            var contents = buffer.toString('utf8')
              ;

            file.contents = contents;
            file.sha1 = sha1sum(contents);
            file.size = buffer.length;
            file.type = undefined;
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


function getfs(blogdir, filepaths) {
  var files = []
    ;

  return forEachAsync(filepaths, function (filepath) {
    var pathname = safeResolve(blogdir, filepath)
      ;

    return fs.lstatAsync(pathname).then(function (stat) {
      return fs.readFileAsync(pathname, null).then(function (buffer) {
        files.push({
          path: filepath
        , size: buffer.length
        , lastModifiedDate: stat.mtime.toISOString()
        , contents: buffer.toString('utf8')
        , sha1: sha1sum(buffer)
        , type: undefined
        });
      });
    }).catch(function (e) {
      files.push({ path: filepath, error: e.message });
    });
  }).then(function () {
    return files;
  });
}
/*
walkDirs('blog', ['posts'], { contents: false }).then(function (stats) {
  console.log(JSON.stringify(stats, null, '  '));
});
*/

module.exports.walk = { walkDirs: walkDirs, walkDir: walkDir };
module.exports.getfs = getfs;
module.exports.walkDir = walkDir;
module.exports.walkDirs = walkDirs;
