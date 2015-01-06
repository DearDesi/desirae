/*jshint -W054 */
;(function (exports) {
  'use strict';

  var YAML = {}
    ;

  YAML.parse = exports.jsyaml.load || require('jsyaml').load;
  //YAML.parse = require('yaml').eval;
  //YAML.parse2 = require('yamljs').parse;

  function readFrontMatter(text) {
    var lines
      , line
      , padIndent = ''
      , ymllines = []
      ;

    lines = text.split(/\n/);
    line = lines.shift();

    if (!line.match(/^---\s*$/)) {
      return;
    }

    // our yaml parser can't handle objects
    // that start without indentation, so
    // we can add it if this is the case
    if (lines[0] && lines[0].match(/^\S/)) {
      padIndent = '';
    }

    while (true) {
      line = lines.shift();

      // premature end-of-file (unsupported yaml)
      if (!line && '' !== line) {
        ymllines = [];
        break;
      }

      // end-of-yaml front-matter
      if (line.match(/^---\s*$/)) {
        break;
      }

      if (line) {
        // supported yaml
        ymllines.push(padIndent + line); 
      }
    }


    // XXX can't be sorted because arrays get messed up
    //ymllines.sort();
    if (ymllines) {
      return '---\n' + ymllines.join('\n');
    }

    return;
  }

  function separateText(text, fm) {
    var len
      , yml
      ;

    yml = readFrontMatter(fm);
    // strip frontmatter from text, if any
    // including trailing '---' (which is accounted for by the added '\n')
    if (yml) {
      len = fm.split(/\n/).length;
    } else {
      len = 0;
    }

    return text.split(/\n/).slice(len).join('\n');
  }

  function parseText(text) {
    var fm = readFrontMatter(text)
      , body = separateText(text, fm)
      , yml
      ;

    try {
      yml = YAML.parse(fm);
    } catch(e) {
      //
    }

    return {
      yml: yml
    , frontmatter: fm
    , body: body
    };
  }

  exports.Frontmatter = exports.Frontmatter = {};
  exports.Frontmatter.Frontmatter = exports.Frontmatter;
  exports.Frontmatter.readText = readFrontMatter;
  exports.Frontmatter.separateText = separateText;
  exports.Frontmatter.parse = parseText;
}('undefined' !== typeof exports && exports || window));
