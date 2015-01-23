'use strict';

// http://ruhoh.com/docs/2/pages/#toc_41
/*
  If a page has a permalink, that permalink should be respected.
  Otherwise it should use the the permalink for that collection.
*/

var tags
  , permalinkTransforms
  , cases
  , path    = /*exports.path ||*/ require('path')
  ;
  
tags = {
  year:           "Year from the page’s filename"
, month:          "Month from the page’s filename"
, day:            "Day from the page’s filename"
, path:           "The page file's path relative to the base of your website."
, relative_path:  "The page file's path relative to its name-spaced directory."
, filename:       "The page file's filename (path is not included)."
, categories:     "The specified categories for this page. If more than one category is set, only the first one is used. If no categories exist, the URL omits this parameter."
, i_month:        "Month from the page’s filename without leading zeros."
, i_day:          "Day from the page’s filename without leading zeros."
, title:          "The title, as a slug."
, slug:           "alias of title"
, name:           "alias of title"
, collection:     "i.e. posts/ or essays/ or whatever/"
};

function pad(str, n) {
  str = str.toString();
  if (str.length < n) {
    str = '0' + str;
  }

  return str;
}

// https://www.youtube.com/watch?v=1NryFD9_hR0&list=RDOeLUK4a6Ojc&index=2
cases = {
  "/:title.html"                  : "/my-title.html"
, ":title/"                       : "/my-title/"
, "/:bad/:title/"                 : "/:bad/my-title/"
, "/:slug/"                       : "/my-title/"
, "/:path/:name.html"             : "/posts/fun/my-title.html"
, "/:relative_path/:name/"        : "/fun/my-title/"
, "/:year-:month-:day/:name"      : "/2015-07-04/my-title/"
, "/:year/:i_month/:i_day/:name"  : "/2015/7/4/my-title/"
, "/:filename.html"               : "/my-file-name.html"
, "/:filename"                    : "/my-file-name/"
, "/:filename/"                   : "/my-file-name/"
, "/:collection/:title/"          : "/posts/my-title/"
, "/:collection/:filename"        : "/posts/my-file-name/"
, "/:something/:or/:other"        : "/:something/:or/:other/"
, "/:categories/:title/"          : "/desi/my-title/"
};

Object.keys(cases).forEach(function (tpl) {
  var entity
    , tpld
    ;

  entity = {
    year          : '2015'
  , month         : '07'
  , day           : '04'
  , title         : "My Title"
  , slug          : "my-title"
  , name          : "My-File-Name.html"
  , relativePath  : "posts/fun"
  , path          : "posts/fun/My-File-Name.html"
  , collection    : "posts"
  , yml           : { categories: ['desi'] }
  };

  tpld = permalinker(tpl, entity);

  if (cases[tpl] !== tpld) {
    console.error('[ERROR]');
    console.error(tpl + ' ' + tpld + ' ' + cases[tpl]);
    throw new Error(
      "Did not template permalink correctly. "
      + tpl + ' ' + tpld + ' ' + cases[tpl]
    );
  }
});
