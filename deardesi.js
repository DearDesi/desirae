;(function (exports) {
  'use strict';

  //require('require-yaml');

  var PromiseA      = exports.Promise       || require('bluebird').Promise
    , path          = exports.path          || require('path')
    , Mustache      = exports.Mustache      || require('mustache')
    , marked        = exports.marked        || require('marked')
    , forEachAsync  = exports.forEachAsync  || require('foreachasync').forEachAsync
    , sha1sum       = exports.sha1sum       || require('./lib/deardesi-node').sha1sum
    , frontmatter   = exports.Frontmatter   || require('./lib/frontmatter').Frontmatter
    , safeResolve   = exports.safeResolve   || require('./lib/deardesi-utils').safeResolve
    , fsapi         = exports.fsapi         || require('./lib/deardesi-node').fsapi
    ;

  function runDesi(desi) {
    var config = desi.config
      , cache = desi.cache
      , cacheByPath = {}
      , cacheBySha1 = {}
      , dfiles
      , dthemes
      ;

    cache.sources = cache.sources || [];
    cache.sources.forEach(function (source) {
      cacheByPath[source.path] = source;
      cacheBySha1[source.sha1] = source;
    });

    function getDirty(thingies, deps) {
      var byDirty = {}
        ;

      Object.keys(thingies).forEach(function (key) {
        var files = thingies[key]
          , cached
          , cdate
          , fdate
          ;

        console.log('files', key);
        console.log(files);
        files.forEach(function (file) {
          var pathname = path.join(file.relativePath + '/' + file.name)
            ;


          // TODO legitimately checkout layout dependencies
          if (deps && Object.keys(deps).length) {
            byDirty[pathname] = file;
            return;
          }

          if (!cacheByPath[pathname]) {
            if (cacheBySha1[file.sha1]) {
              // TODO rename
            }

            byDirty[pathname] = file;
            return;
          }

          cached = cacheByPath[pathname];
          cached.visited = true;

          if (cached.sha1 && file.sha1) {
            if (file.sha1 && cached.sha1 !== file.sha1) {
              byDirty[pathname] = file;
              return;
            }

            cdate = cached.lastModifiedDate && new Date(cached.lastModifiedDate);
            fdate = file.lastModifiedDate && new Date(file.lastModifiedDate);

            if (!cdate || !fdate || cdate !== fdate) {
              byDirty[pathname] = file;
            }
          }

        });
      });

      return byDirty;
    }

    dthemes = getDirty(desi.meta.themes);
    console.log('dthemes');
    console.log(dthemes);

    dfiles = getDirty(desi.meta.collections, dthemes);
    console.log('dfiles');
    console.log(dfiles);
    
    return fsapi.getContents(Object.keys(dthemes)).then(function (tContent) {
      return fsapi.getContents(Object.keys(dfiles)).then(function (cContent) {
        desi.content = { collections: cContent, themes: tContent };
        return desi;
      });
    });
  }

  console.log('');
  console.log('');
  console.log('getting config...');
  return fsapi.getConfig().then(function (config) {
    console.log('loading caches...');
    return fsapi.getCache().then(function (cache) {
      console.log('cache');
      console.log(cache);
      console.log('last update: ' + (cache.lastUpdate && new Date(cache.lastUpdate) || 'never'));
      var collectionnames = Object.keys(config.collections)
        ;

      return fsapi.getMeta(
        collectionnames
      , { dotfiles: false
        , extensions: ['md', 'markdown', 'htm', 'html', 'jade']
        }
      ).then(function (collections) {
        var themenames = Object.keys(config.themes).filter(function (k) { return 'default' !== k; })
          ;

        console.log('collections');
        console.log(collections);
        return fsapi.getMeta(
          themenames
        , { dotfiles: false 
          , extensions: ['md', 'markdown', 'htm', 'html', 'jade', 'css', 'js', 'yml']
          }
        ).then(function (themes) {
          console.log('themes');
          console.log(themes);
          return { config: config, cache: cache, meta: { collections: collections, themes: themes } };
        });
      });
    });
  }).then(runDesi).then(function (desi) {
    console.log('desi.content');
    console.log(desi.content);

    function readMeta(things) {
      return forEachAsync(things, function (file) {
        //console.log('file.contents');
        //console.log(file.contents);
        var parts = frontmatter.parse(file.contents)
          ;

        if (!file.sha1) {
          // TODO sha1sum
        }

        file.yml = parts.yml;
        file.frontmatter = parts.frontmatter;
        file.body = parts.body;

        if (!parts.yml) {
          console.warn("No frontmatter for " + (file.path || (file.relativePath + '/' + file.name)));
        }

        return Promise.resolve();
      });
    }

    return readMeta(desi.content.themes).then(function () {
      return readMeta(desi.content.collections).then(function () {
        return desi;
      });
    });
  }).then(function (desi) {
    function getLayout(themename, layout, arr) {
      arr = arr || [];

      var layoutdir = 'layouts'
        , themepath
        , file
        ;

      if (!themename) {
        themename = desi.config.themes.default;
      }
      if (!layout) {
        layout = 'post.html';
      }


      themepath = themename + '/' + layoutdir + '/' + layout;

      desi.content.themes.some(function (theme) {
        // TODO what if it isn't html?
        if (theme.path === themepath || theme.path.match(themepath + '\\.html')) {
          file = theme;
          arr.push(theme);
          return true;
        }
      });

      if (!file) {
        console.error("could not find " + themepath);
        return;
      }

      // TODO handle possible circular dep condition page -> post -> page
      console.info(file);
      if (file.yml && file.yml.layout) {
        return getLayout(themename, file.yml.layout, arr);
      } else {
        // return the chain page -> posts -> default -> twitter
        return arr;
      }
    }

    desi.content.collections.forEach(function (article) {
      // TODO process tags and categories and such
      console.log(article.yml.title);
      //console.log(article.yml.theme);
      //console.log(article.yml.layout);
      console.log(article.yml.permalink);


      var child = ''
        , layers
        ;


      console.log(article.path || (article.relativePath + '/' + article.name));
      //console.log(article.frontmatter);
      console.log(article.yml);
      layers = getLayout(article.yml.theme, article.yml.layout, [article]);
      console.log('LAYERS');
      console.log(layers);
      layers.forEach(function (parent) {
        // TODO meta.layout
        var view
          , body = (parent.body || parent.contents || '').trim()
          , html
          ;

        parent.path = parent.path || article.relativePath + '/' + article.name;

        if (/\.(html|htm)$/.test(parent.path)) {
          console.log('thinks its html');
          html = body;
        } else if (/\.(md|markdown|mdown|mkdn|mkd|mdwn|mdtxt|mdtext)$/.test(parent.path)) {
          console.log('parsing markdown...');
          html = marked(body);
        } else {
          console.error('unknown parser for ' + (article.path));
        }

        view = {
          page: article.yml // data for just *this* page
        , content: child    // processed content for just *this* page
        , data: {}          // data.yml
        , collection: {}    // data for just *this* collection
        , categories: []    // *all* categories in all collections
        , tags: []          // *all* tags in all collections
        };

        child = Mustache.render(html, view);
      });

      console.log('child');
      console.log(child);
      //console.log(meta.mtime.valueOf(), meta.ymlsum, meta.textsum, node);
    });
  }).catch(function (e) {
    console.error('The Badness is upon us...');
    throw e;
  });
}('undefined' !== typeof exports && exports || window));
