/*jshint -W054 */
;(function (exports) {
  'use strict';

  var PromiseA = exports.Promise || require('bluebird').Promise
    ;

  function renderMd(contentstr/*, desi*/) {
    var markitdown = (exports.markdownit || require('markdown-it'))({ html: true, linkify: true })
      ;

    return PromiseA.resolve(
      markitdown.render(contentstr)
        //.replace('&quot;', '"')
        //.replace('&#39;', "'")
        //.replace('&#x2F;', '/')
    );
  }

  function renderNoop(contentstr/*, desi*/) {
    // hmmm... that was easy
    return PromiseA.resolve(contentstr);
  }

  function renderJade(contentstr, desi, options) {
    options = options || {};
    if (!('pretty' in options)) {
      options.pretty = true;
    }

    var jade = (exports.jade || require('jade'))
      , fn = jade.compile(contentstr, options)
      , html = fn(desi)
      ;

    return PromiseA.resolve(html);
  }

  exports.DesiraeRenderMarkdown = renderMd.DesiraeRenderMarkdown = renderMd;
  exports.DesiraeRenderHtml = renderNoop.DesiraeRenderHtml = renderNoop;
  exports.DesiraeRenderCss = renderNoop.DesiraeRenderCss = renderNoop;
  exports.DesiraeRenderJs = renderNoop.DesiraeRenderJs = renderNoop;
  exports.DesiraeRenderJade = renderJade.DesiraeRenderJade = renderJade;
}('undefined' !== typeof exports && exports || window));
