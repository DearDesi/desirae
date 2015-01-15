'use strict';

var PromiseA = require('bluebird').Promise
  , secretutils = require('secret-utils')
  ;

module.exports.sha1sum = function (str) {
  return PromiseA.resolve( secretutils.hashsum('sha1', str) );
};
