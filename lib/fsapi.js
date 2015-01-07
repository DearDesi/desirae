'use strict';

var PromiseA      = require('bluebird').Promise
  , fs            = PromiseA.promisifyAll(require('fs'))
  , forEachAsync  = require('foreachasync').forEachAsync
  , path          = require('path')
  , walk          = require('walk')
  , escapeRegExp  = require('./deardesi-utils').escapeRegExp
  , safeResolve   = require('./deardesi-utils').safeResolve
  , sha1sum       = function (str) { return require('secret-utils').hashsum('sha1', str); }
  , mkdirp        = PromiseA.promisify(require('mkdirp'))
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

function putfs(blogdir, files) {
  var results = { errors: [] }
    , dirpaths = {}
    ;

  return forEachAsync(files, function (file) {
    var filepath = safeResolve(blogdir, file.path || path.join(file.relativePath, file.name))
      , pathname = path.dirname(filepath)
      , filename = file.name || path.basename(filepath)
      ;

    file.realPath = filepath;
    file.name = filename;

    dirpaths[pathname] = true;
    
    return Promise.resolve();
  }).then(function () {
    // TODO is it better to do this lazy-like or as a batch?
    // I figure as batch when there may be hundreds of files,
    // likely within 2 or 3 directories
    return forEachAsync(Object.keys(dirpaths), function (pathname) {
      return mkdirp(pathname).catch(function (e) {
        // TODO exclude attempting to write files to this dir?
        results.errors.push({
          type: 'directory'

        , directory: pathname

        , message: e.message
        , code: e.code
        , errno: e.errno
        , status: e.status
        , syscall: e.syscall
        });

      });
    });
  }).then(function () {
    // TODO sort deletes last
    return forEachAsync(files, function (file) {
      var p
        ;

      // TODO use lastModifiedDate as per client request?
      // TODO compare sha1 sums for integrity
      if (file.delete || !file.contents) {
        p = fs.unlinkAsync(file.realPath);
      } else {
        p = fs.writeFileAsync(file.realPath, file.contents, 'utf8');
      }

      return p.catch(function (e) {
        results.errors.push({
          type: 'file'

        , file: file.realPath
        , delete: !file.contents
        , path: file.path
        , relativePath: file.relativePath
        , name: file.name

        , message: e.message
        , code: e.code
        , errno: e.errno
        , status: e.status
        , syscall: e.syscall
        });
      });
    });
  }).catch(function (e) {
    results.error = {
      message: e.message
    , code: e.code
    , errno: e.errno
    , status: e.status
    , syscall: e.syscall
    };
  }).then(function () {
    return results;
  });
}
/*
walkDirs('blog', ['posts'], { contents: false }).then(function (stats) {
  console.log(JSON.stringify(stats, null, '  '));
});
*/

module.exports.walk = { walkDirs: walkDirs, walkDir: walkDir };
module.exports.getfs = getfs;
module.exports.putfs = putfs;
module.exports.walkDir = walkDir;
module.exports.walkDirs = walkDirs;
