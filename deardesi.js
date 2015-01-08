;(function (exports) {
  'use strict';

  //require('require-yaml');

  var PromiseA      = exports.Promise       || require('bluebird').Promise
    , path          = exports.path          || require('path')
    , Mustache      = exports.Mustache      || require('mustache')
    , marked        = exports.marked        || require('marked')
    , forEachAsync  = exports.forEachAsync  || require('foreachasync').forEachAsync
    //, sha1sum       = exports.sha1sum       || require('./lib/deardesi-node').sha1sum
    , frontmatter   = exports.Frontmatter   || require('./lib/frontmatter').Frontmatter
    //, safeResolve   = exports.safeResolve   || require('./lib/deardesi-utils').safeResolve
    , fsapi         = exports.fsapi         || require('./lib/deardesi-node').fsapi
    //, UUID          = exports.uuid          || require('node-uuid')
    ;

  // See https://github.com/janl/mustache.js/issues/415
  function num2str(obj) {
    return JSON.parse(JSON.stringify(obj, function (key, val) {
      if ('number' === typeof val) {
        val = val.toString();
      }
      return val;
    }));
  }

  function getLayout(desi, themename, layout, arr) {
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
      return getLayout(desi, themename, file.yml.layout, arr);
    } else {
      // return the chain page -> posts -> default -> twitter
      return arr;
    }
  }

  function runDesi(desi, development) {
    var cache = desi.cache
      //, config = desi.config
      , cacheByPath = {}
      , cacheBySha1 = {}
      , dfiles
      , dthemes
      ;

    desi.urls = desi.config.urls = {};
    if (development) {
      desi.urls.base_path = desi.config.development.base_path;
      desi.urls.url = desi.config.development.url;
      desi.urls.development_url = desi.config.development.url;
    } else {
      desi.config.base_path = desi.urls.base_path = desi.config.production.base_path;
      desi.urls.url = desi.config.production.url;
      desi.urls.production_url = desi.config.production.url;
    }

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
  console.log('getting config, data, caches...');
  return PromiseA.all([fsapi.getConfig(), fsapi.getData(), fsapi.getCache(), fsapi.getPartials()]).then(function (things) {
    var config = things[0]
      , data = things[1]
      , cache = things[2]
      , partials = things[3]
      ;

    console.log('loaded config, data, caches.');
    console.log(things);
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
        return { config: config, data: data, cache: cache, meta: { collections: collections, themes: themes }, partials: partials };
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
    // TODO add missing metadata and resave file
    desi.content.collections.forEach(function (article) {
      if (!article.yml.permalink) {
        // TODO read the config for this collection
        article.yml.permalink = path.join(desi.urls.base_path, article.title);
      }

      if (!article.yml.uuid) {
        // TODO only do this if it's going to be saved
        // article.yml.uuid = UUID.v4();
      }

      if (!article.yml.date) {
        article.yml.date = article.createdDate || article.lastModifiedDate;
      }

      if (!article.yml.updated_at) {
        article.yml.updated_at = article.lastModifiedDate;
      }
    });

    return desi;
  }).then(function (desi) {
    var compiled = []
      ;

    desi.content.collections.forEach(function (article) {
      // TODO process tags and categories and such
      console.log(article.yml.title);
      //console.log(article.yml.theme);
      //console.log(article.yml.layout);
      console.log(article.yml.permalink);


      var child = ''
        , layers
        , view
        ;


      console.log(article.path || (article.relativePath + '/' + article.name));
      //console.log(article.frontmatter);
      console.log(article.yml);
      layers = getLayout(desi, article.yml.theme, article.yml.layout, [article]);
      console.log('LAYERS');
      console.log(layers);

      view = {
        page: article.yml // data for just *this* page
      , content: child    // processed content for just *this* page
      //, data: desi.data   // data.yml
      // https://github.com/janl/mustache.js/issues/415
      , data: num2str(desi.data)
      , collection: {}    // data for just *this* collection
      , categories: []    // *all* categories in all collections
      , tags: []          // *all* tags in all collections
      , site: num2str(desi.site || {})
      , url: path.join(desi.urls.url, desi.urls.base_path, article.yml.permalink)
      , canonical_url: path.join(desi.urls.url, desi.urls.base_path, article.yml.permalink)
      , relative_url: path.join(desi.urls.base_path, article.yml.permalink)
      , urls: desi.urls
      };
      view.site.author = desi.data.author;
      view.site['navigation?to_pages'] = desi.data.navigation.map(function (nav) {
        var title = nav.replace(/^./, function ($1) { return $1.toUpperCase(); })
          ;

        return { path: '/' + nav, active: false, title: /*TODO*/ title };
      });

      layers.forEach(function (parent) {
        // TODO meta.layout
        var body = (parent.body || parent.contents || '').trim()
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

        view.content = child;

        child = Mustache.render(html, view, desi.partials);

      });

      console.warn('view data.author contains objects?');
      console.warn(JSON.stringify(view.data.author, null, '  '));
      console.warn(typeof view.data.author.twitter_id);
      console.warn(view.data.author);
      // TODO add html meta-refresh redirects
      compiled.push({ contents: child, path: path.join(desi.config.compiled_path, article.yml.permalink) });
      if (Array.isArray(article.yml.redirects)) {
        child = 
          '<html>'
            + '<head>'
              + '<title>Redirecting to ' + article.yml.title + '</title>'
              + '<meta http-equiv="refresh" content="0;URL=\'' + path.join(desi.urls.url, article.yml.permalink) + '\'" />'
            + '</head>'
            + '<body>'
              + '<p>This page has moved to a <a href="' + path.join(desi.urls.url, article.yml.permalink) +'">' + article.yml.title + '</a>.</p>'
            + '</body>'
        + '</html>'
        ;

        compiled.push({ contents: child, url: view.url, path: path.join(desi.config.compiled, article.yml.permalink) });
      }


    });

    desi.compiled = compiled;
    return desi;
  }).then(function (desi) {
    var compiled = desi.compiled
      ;

    console.info('das compiled files');
    console.info(compiled);
    return fsapi.putFiles(compiled).then(function (saved) {
      console.info('files saved');
      console.info(saved);
    });
  }).catch(function (e) {
    console.error('A great and uncatchable error has befallen the land. Read ye here for das detalles..');
    console.error(e.message);
    throw e;
  });
}('undefined' !== typeof exports && exports || window));
