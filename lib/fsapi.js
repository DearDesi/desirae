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
  , fsExtra       = PromiseA.promisifyAll(require('fs.extra'))
  //, tmpdir        = require('os').tmpdir()
  ;

function strip(prefix, pathname) {
  return pathname.substr(prefix.length + 1);
}

function walkDir(parent, sub, opts) {
  opts = opts || {};
  if (false !== opts.sha1sum) {
    opts.sha1sum = true;
  }

  var prefix = path.resolve(parent)
    , trueRoot = path.resolve(prefix, sub)
    , files = []
    ;

  function filter(name) {
    if (!name) {
      return false;
    }

    if (!opts.dotfiles && ('.' === name[0])) {
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
      , path: path.join(strip(prefix, filepath), stat.name)

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
        , relativePath: dirname
        , path: path.join(dirname, stat.name)

        , createdDate: (stat.birthtime||stat.ctime).toISOString()
        , lastModifiedDate: stat.mtime.toISOString()

        , size: stat.size
        , type: undefined // TODO include mimetype
        };
        files.push(file);

        if (!(opts.sha1sum || opts.content)) {
          return;
        }

        // TODO stream sha1 (for assets)
        return fs.readFileAsync(path.join(root, stat.name), null).then(function (buffer) {
          var contents = buffer.toString('utf8')
            ;

          file.sha1 = sha1sum(contents);
          file.type = undefined;

          if (opts.contents) {
            file.contents = contents;
          }
        });
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
          name: path.basename(pathname)
        , relativePath: path.dirname(filepath)
        , path: filepath

        , createdDate: (stat.birthtime||stat.ctime).toISOString()
        , lastModifiedDate: stat.mtime.toISOString()

        , contents: buffer.toString('utf8')
        , size: buffer.length
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

function makeAllDirs(dirpaths) {
  var errors = []
    ;

  return forEachAsync(dirpaths, function (pathname) {
    return mkdirp(pathname).catch(function (e) {
      // TODO exclude attempting to write files to this dir?
      errors.push({
        type: 'directory'

      , directory: pathname

      , message: e.message
      , code: e.code
      , errno: e.errno
      , status: e.status
      , syscall: e.syscall
      });

    });
  }).then(function () {
    return errors;
  });
}

function copyfs(blogdir, files) {
  // TODO switch format to { source: ..., dest: ..., opts: ... } ?
  var results = { errors: [] }
    , dirpaths = {}
    , sources = Object.keys(files)
    ;

  return forEachAsync(sources, function (source) {
    /*
    var nsource = safeResolve(blogdir, source)
      ;
    */

    var dest = safeResolve(blogdir, files[source])
      , pathname = path.dirname(dest)
      //, filename = path.basename(dest)
      ;

    dirpaths[pathname] = true;
    
    return Promise.resolve();
  }).then(function () {
    // TODO is it better to do this lazy-like or as a batch?
    // I figure as batch when there may be hundreds of files,
    // likely within 2 or 3 directories
    return makeAllDirs(Object.keys(dirpaths)).then(function (errors) {
      errors.forEach(function (e) {
        results.errors.push(e);
      });
    });
  }).then(function () {
    // TODO allow delete?
    return forEachAsync(sources, function (source) {
      return fsExtra.copyAsync(
        safeResolve(blogdir, source)
      , safeResolve(blogdir, files[source])
      , { replace: true }
      ).catch(function (e) {
        results.errors.push({
          type: 'file'

        , source: source
        , destination: files[source]

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
module.exports.copyfs = copyfs;
module.exports.getfs = getfs;
module.exports.putfs = putfs;
module.exports.walkDir = walkDir;
module.exports.walkDirs = walkDirs;
module.exports.fsapi = module.exports;
