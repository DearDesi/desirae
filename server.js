'use strict';

require('require-yaml');

var connect     = require('connect')
  //, PromiseA  = require('bluebird').Promise
  , query       = require('connect-query')
  , bodyParser  = require('body-parser')
  , serveStatic = require('serve-static')
  , send        = require('connect-send-json')

  , app         = connect()
  , fsapi       = require('./lib/fsapi')
  , walk        = require('./lib/fsapi').walk
  , getfs       = require('./lib/fsapi').getfs
  , putfs       = require('./lib/fsapi').putfs

  , blogdir     = process.argv[2] || 'blog'
  , port        = process.argv[3] || '65080'

  , path        = require('path')
  //, config      = require(path.join('./', blogdir, 'config.yml'))
  ;


app
  .use(send.json())
  .use(query())
  .use(bodyParser.json({ limit: 10 * 1024 * 1024 })) // 10mb
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

      if (!dirnames.every(function (dirname) {
        return 'string' === typeof dirname;
      })) {
        res.json({ error: "malformed request: " + JSON.stringify(dirnames) });
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
      if ('false' === req.query.sha1sum) {
        opts.sha1sum = false;
      }
      if ('true' === req.query.contents) {
        opts.contents = true;
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
  .use('/api/fs/copy', function (req, res, next) {
      if (!(/^POST|PUT$/i.test(req.method) || /^POST|PUT$/i.test(req.query._method))) {
        next();
        return;
      }

      var opts = {}
        , files = req.body.files
        ;

      if ('object' !== typeof files || !Object.keys(files).length) {
        res.json({ error: "please specify POST w/ req.body.files" });
        return;
      }

      return fsapi.copyfs(blogdir, files, opts).then(function (results) {
        res.json(results);
      });
    })

  .use('/api/fs', function (req, res) {
      var pathname = path.resolve(blogdir)
        ;

      res.json({
        path: pathname
      , name: path.basename(pathname)
      , relativePath: path.dirname(pathname)
      //, cwd: path.resolve()
      //, patharg: blogdir
      });
      return;
    })
  .use('/api/fs/static', serveStatic(blogdir))

  .use(serveStatic('./'))
  .use('/compiled_dev', serveStatic(path.join(blogdir, '/compiled_dev')))
  // TODO
  //.use(serveStatic(tmpdir))
  ;

module.exports = app;

require('http').createServer().on('request', app).listen(port, function () {
  console.log('listening ' + port);
});
