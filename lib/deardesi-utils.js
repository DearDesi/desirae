;(function (exports) {
  'use strict';

  var path  = exports.path  || require('path')
    ;

  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  function safeResolve(basename, target) {
    basename = path.resolve(basename);

    var targetname = path.resolve(basename, target)
      , re = new RegExp('^' + escapeRegExp(basename) + '(/|$)')
      ;

    return re.test(targetname) && targetname;
  }

  exports.safeResolve = safeResolve;
  exports.escapeRegExp = escapeRegExp;
}('undefined' !== typeof exports && exports || window));
