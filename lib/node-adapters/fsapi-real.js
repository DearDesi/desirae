'use strict';

var PromiseA = require('bluebird').Promise
  , fs = PromiseA.promisifyAll(require('fs'))
  ;

function create(Desi, options) {
  var fsapi = Desi.fsapi
    ;

  options.blogdir = options.blogdir || options.working_path;

  fsapi.getMeta = function (dirnames, opts) {
    opts = opts || {};

    var extensions = ''
      , dotfiles = ''
      , contents = ''
      , sha1sum = ''
      ;

    if (Array.isArray(opts.extensions)) {
      extensions = '&extensions=' + opts.extensions.join(','); // md,markdown,jade,htm,html
    }
    if (opts.dotfiles) {
      dotfiles = '&dotfiles=true';
    }
    if (opts.contents) {
      contents = '&contents=true';
    }
    if (false === opts.sha1sum) {
      sha1sum = '&sha1sum=false';
    }

    return fsapi.walk.walkDirs(options.blogdir, dirnames, opts);
  };

  fsapi.getContents = function (filepaths) {

    return fsapi.getfs(options.blogdir, filepaths);
  };

  fsapi.getCache = function () {
    return fs.readFileAsync(options.blogdir, '/cache.json').catch(function (/*e*/) {
      return {};
    }).then(function (obj) {
      return obj;
    });
  };

  fsapi.copy = function (files) {
    // TODO size
    return fsapi.copyfs(options.blogdir, files);
  };

  fsapi.putFiles = function (files, opts) {
    files.forEach(function (file) {
      if (!file.contents || 'string' === typeof file.contents) {
        return;
      }
      if (/\.json$/i.test(file.path)) {
        file.contents = JSON.stringify(file.contents);
      }
      else if (/\.ya?ml$/i.test(file.path)) {
        file.contents = Desi.YAML.stringify(file.contents); 
      }
    });

    // TODO size
    return fsapi.putfs(options.blogdir, files, opts);
  };
}

exports.create = create;
