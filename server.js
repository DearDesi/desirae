'use strict';

require('require-yaml');

var connect     = require('connect')
  //, PromiseA  = require('bluebird').Promise
  , query       = require('connect-query')
  , bodyParser  = require('body-parser')
  , serveStatic = require('serve-static')
  , send        = require('connect-send-json')

  , app         = connect()
  , walk        = require('./lib/fsapi').walk
  , getfs       = require('./lib/fsapi').getfs
  , putfs       = require('./lib/fsapi').putfs

  , config      = require('./config.yml')
  , path        = require('path')
  , blogdir     = path.resolve(config.blogdir || __dirname)
  ;


app
  .use(send.json())
  .use(query())
  .use(function (req, res, next) {
    console.log('before parse');
    next();
  })
  .use(bodyParser.json({ limit: 10 * 1024 * 1024 })) // 10mb
  .use(function (req, res, next) {
    console.log('after parse');
    next();
  })
  .use(require('compression')())
  .use('/api/fs/walk', function (req, res, next) {
      if (!(/^GET$/i.test(req.method) || /^GET$/i.test(req.query._method))) {
        next();
        return;
      }

      var opts = {}
        , dirnames = req.query.dir && [req.query.dir] || (req.query.dirs && req.query.dirs.split(/,/g)) || req.body.dirs
        ;

      if (!dirnames || !dirnames.length) {
        res.json({ error: "please specify GET w/ req.query.dir or POST w/ _method=GET&dirs=path/to/thing,..." });
        return;
      }

      /*
      if (req.query.excludes) {
        opts.excludes = req.query.excludes.split(',');
      }
      */

      if (req.query.extensions) {
        opts.extensions = req.query.extensions.split(/,/g);
      }

      if ('true' === req.query.dotfiles) {
        opts.dotfiles = true;
      }

      // TODO opts.contents?
      walk.walkDirs(blogdir, dirnames, opts).then(function (stats) {
        if (!req.body.dirs && !req.query.dirs) {
          res.json(stats[dirnames[0]]);
        } else {
          res.json(stats);
        }
      });
    })
  .use('/api/fs/files', function (req, res, next) {
      if (!(/^GET$/i.test(req.method) || /^GET$/i.test(req.query._method))) {
        next();
        return;
      }

      var filepaths = req.query.path && [req.query.path] || (req.query.paths && req.query.paths.split(/,/g)) || req.body.paths
        ;

      if (!filepaths || !filepaths.length) {
        res.json({ error: "please specify GET w/ req.query.path or POST _method=GET&paths=path/to/thing,..." });
        return;
      }

      return getfs(blogdir, filepaths).then(function (files) {
        if (!req.body.paths && !req.query.paths) {
          res.json(files[0]);
        } else {
          res.send(files);
        }
      });
    })
  .use('/api/fs/files', function (req, res, next) {
      if (!(/^POST|PUT$/i.test(req.method) || /^POST|PUT$/i.test(req.query._method))) {
        next();
        return;
      }

      var opts = {}
        , files = req.body.files
        ;

      if (!files || !files.length) {
        res.json({ error: "please specify POST w/ req.body.files" });
        return;
      }

      return putfs(blogdir, files, opts).then(function (results) {
        res.json(results);
      });
    })

  .use('/api/fs', function (req, res, next) {
      next();
      return;
    })
  .use('/api/fs/static', serveStatic('.'))

  .use(serveStatic(blogdir))
  .use(serveStatic('.'))
  ;

module.exports = app;

require('http').createServer().on('request', app).listen(80, function () {
  console.log('listening 80');
});
