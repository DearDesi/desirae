'use strict';

var connect = require('connect')
  , query = require('connect-query')
  , bodyParser = require('body-parser')
  , serveStatic = require('serve-static')
  , app = connect()
  ;

app
  .use('/api/fs', query())
  .use('/api/fs', bodyParser.json())
  .use('/api/fs', function (req, res, next) {
      if (!(/^GET$/i.test(req.method) || /^GET$/i.test(req.query._method))) {
        next();
        return;
      }

      /*
      return forEachAsync(collectiondirs, function (collection) {
        return fs.lstatAsync(collection.path).then(function (stat) {
          if (!stat.isDirectory()) {
            //return;
          }

        }).error(function () {
        });
      }).then(function () {
      });
      */

      res.end('not implemented');
    })
  .use('/api/fs', function (req, res, next) {
      next();
      return;
    })
  .use(serveStatic('.'))
  ;

module.exports = app;
