'use strict';

var PromiseA = require('bluebird').Promise
  , path = require('path')
  , walk = require('walk')
  , walker
  ;

function getFs(parent, sub) {
  // TODO safe
  var trueRoot = path.resolve(parent, sub)
    ;

  return new PromiseA(function (resolve) {
    walker = walk.walk('posts');
    walker.on('directories', function (root, stat, next) {
      console.log(root, stat);
      next();
    });
    walker.on('files', function (root, stat, next) {
      //console.log(root, stat);
      next();
    });
    walker.on('end', function () {
      console.log('done');
    });
  });
}
