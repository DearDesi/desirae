'use strict';

require('require-yaml');

var PromiseA = require('bluebird').Promise
  , connect = require('connect')
  , query = require('connect-query')
  , bodyParser = require('body-parser')
  , serveStatic = require('serve-static')
  , forEachAsync = require('foreachasync').forEachAsync
  , send = require('connect-send-json')

  , app = connect()
  , walk = require('./lib/walk')

  , config = require('./config.yml')
  , safeResolve = require('./lib/deardesi-utils').safeResolve
  , path = require('path')
  , blogdir = path.resolve(config.blogdir || __dirname)
  , sha1sum = function (str) { return require('secret-utils').hashsum('sha1', str); }
  , fs = PromiseA.promisifyAll(require('fs'))
  ;


app
  .use(send.json())
  .use(query())
  .use(bodyParser.json())

  .use('/api/fs/files', function (req, res, next) {
      if (!(/^GET$/i.test(req.method) || /^GET$/i.test(req.query._method))) {
        next();
        return;
      }

      var filepaths = req.query.path && [req.query.path] || req.body.paths
        , files = []
        ;

      if (!filepaths || !filepaths.length) {
        res.json({ error: "please specify req.query.path or req.body.paths" });
        return;
      }

      return forEachAsync(filepaths, function (filepath) {
        var pathname = safeResolve(blogdir, filepath)
          ;

        return fs.lstatAsync(pathname).then(function (stat) {
          return fs.readFileAsync(pathname, null).then(function (buffer) {
            files.push({
              path: filepath
            , size: buffer.byteLength
            , lastModifiedDate: stat.mtime.toISOString()
            , contents: buffer.toString('utf8')
            , sha1: sha1sum(buffer)
            , 
            });
          });
        }).catch(function (e) {
          files.push({ path: filepath, error: e.message });
        });
      }).then(function () {
        res.send(files);
      });
    })

  .use('/api/fs/walk', function (req, res, next) {
      if (!(/^GET$/i.test(req.method) || /^GET$/i.test(req.query._method))) {
        next();
        return;
      }

      var dirnames = req.query.dir && [req.query.dir] || req.body.dirs
        ;

      if (!dirnames || !dirnames.length) {
        res.json({ error: "please specify req.query.dir or req.body.dirs" });
        return;
      }

      walk.walkDirs(blogdir, dirnames, { contents: false }).then(function (stats) {
        if (!req.body.dirs) {
          res.json(stats[dirnames[0]]);
        } else {
          res.json(stats);
        }
      });
    })

  .use('/api/fs', function (req, res, next) {
      next();
      return;
    })
  .use(serveStatic('.'))
  ;

module.exports = app;

require('http').createServer(app).listen(8080, function () {
  console.log('listening 8080');
});
