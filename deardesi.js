;(function (exports) {
  'use strict';

  //require('require-yaml');

  var PromiseA      = exports.Promise       || require('bluebird').Promise
    , path          = exports.path          || require('path')
    , Mustache      = exports.Mustache      || require('mustache')
    , marked        = (exports.markdownit   || require('markdown-it'))({ html: true, linkify: true })
    , forEachAsync  = exports.forEachAsync  || require('foreachasync').forEachAsync
    //, sha1sum       = exports.sha1sum       || require('./lib/deardesi-node').sha1sum
    , frontmatter   = exports.Frontmatter   || require('./lib/frontmatter').Frontmatter
    //, safeResolve   = exports.safeResolve   || require('./lib/deardesi-utils').safeResolve
    , fsapi         = exports.fsapi         || require('./lib/deardesi-node').fsapi
    //, UUID          = exports.uuid          || require('node-uuid')
    , months
    ;

  months = {
    1: 'January'
  , 2: 'February'
  , 3: 'March'
  , 4: 'April'
  , 5: 'May'
  , 6: 'June'
  , 7: 'July'
  , 8: 'August'
  , 9: 'September'
  , 10: 'October'
  , 11: 'November'
  , 12: 'December'
  };

  function firstCap(str) {
    return str.replace(/^./, function ($1) { return $1.toUpperCase(); });
  }

  function pad(str) {
    str = str.toString();
    if (str.length < 2) {
      return '0' + str;
    }

    return str;
  }

  function toLocaleDate(d) {
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
      + ' '
      + (d.getHours() % 12) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
      ;
  }

  function fromLocaleDate(str) {
    // handles ISO and ISO-ish dates
    var m = str.match(/(\d\d\d\d)-(\d{1,2})-(\d{1,2})([T\s](\d{1,2}):(\d{1,2})(:(\d{1,2}))?)?/)
      ;

    if (!m) {
      return [];
    }

    m.year   = m[1];
    m.month  = m[2];
    m.day    = m[3];

    m.hour   = m[4] = pad(m[5] || '00');  // hours
    m.minute = m[5] = pad(m[6] || '00');  // minutes
    m.second = m[6] = pad(m[8] || '00');  // seconds
 
    if (m[4] > 12) {
      m.twelve_hour = m[7] = m[4] - 12;   // 12-hour
      m.meridian    = m[8] = 'pm';        // am/pm
    } else {
      m.twelve_hour = m[7] = m[4]; 
      m.meridian    = m[8] = 'am';
    }

    return m;
  }

  // See https://github.com/janl/mustache.js/issues/415
  function num2str(obj) {
    return JSON.parse(JSON.stringify(obj, function (key, val) {
      if ('number' === typeof val) {
        val = val.toString();
      }
      return val;
    }));
  }

  function readFrontmatter(things) {
    return forEachAsync(things, function (file) {
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
    });
  }

  function getDirty(cacheByPath, cacheBySha1, thingies, deps) {
    var byDirty = {}
      ;

    Object.keys(thingies).forEach(function (key) {
      var files = thingies[key]
        , cached
        , cdate
        , fdate
        ;

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
      // TODO make configurable
      layout = 'posts.html';
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
    if (file.yml && file.yml.layout) {
      return getLayout(desi, themename, file.yml.layout, arr);
    } else {
      // return the chain page -> posts -> default -> twitter
      return arr;
    }
  }

  function runDesi(desi, env) {
    var cache = desi.cache
      //, config = desi.config
      , cacheByPath = {}
      , cacheBySha1 = {}
      , dfiles
      , dthemes
      , droot
      ;

    desi.urls = desi.config.urls = {};
    desi.env = {};
    if (-1 === ['development', 'staging'].indexOf(env) || !desi.config[env]) {
      env = 'production';
    }

    desi.urls.base_path = desi.config.base_path = desi.config[env].base_path;
    desi.urls.url = desi.config[env].url;
    desi.config.compiled_path = desi.config[env].compiled_path;
    desi.urls[env + '_url'] = desi.config[env].url;

    cache.sources = cache.sources || [];
    cache.sources.forEach(function (source) {
      cacheByPath[source.path] = source;
      cacheBySha1[source.sha1] = source;
    });

    dthemes = getDirty(cacheByPath, cacheBySha1, desi.meta.themes);
    droot = getDirty(cacheByPath, cacheBySha1, [desi.meta.root], dthemes);
    dfiles = getDirty(cacheByPath, cacheBySha1, desi.meta.collections, dthemes);

    /*
    if (!droot.length) {
      console.error("no root files to get");
    }
    if (!dfiles.length) {
      console.error("no content files to get");
    }
    if (!dthemes.length) {
      console.error("no theme files to get");
    }
    if (!droot || !dfiles || !droot) {
      throw new Error("didn't read files");
    }
    */
    
    return PromiseA.all([
      Object.keys(droot).length ? fsapi.getContents(Object.keys(droot)) : PromiseA.resolve([])
    , Object.keys(dfiles).length ? fsapi.getContents(Object.keys(dfiles)) : PromiseA.resolve([])
    , Object.keys(dthemes).length ? fsapi.getContents(Object.keys(dthemes)) : PromiseA.resolve([])
    ]).then(function (arr) {
      // TODO XXX display errors in html
      function noErrors(o) {
        if (!o.error) {
          return true;
        }

        console.warn("Couldn't get file contents for " + o.path);
        console.warn(o.error);
      }

      desi.content = {
        root: arr[0].filter(noErrors)
      , collections: arr[1].filter(noErrors)
      , themes: arr[2].filter(noErrors)
      };

      return desi;
    });
  }

  console.log('');
  console.log('');
  console.info('getting config, data, caches...');

  function Desi() {
  }
  Desi.init = function (desi) {
    return PromiseA.all([fsapi.getConfig(), fsapi.getData(), fsapi.getCache(), fsapi.getPartials()]).then(function (arr) {
      var config = arr[0]
        , data = arr[1]
        , cache = arr[2]
        , partials = arr[3]
        , collectionnames = Object.keys(config.collections)
        , themenames = Object.keys(config.themes)
            .filter(function (k) { return 'default' !== k; })
            //.map(function (n) { return path.join(n, 'layouts'); })
        , assetnames = Object.keys(config.assets)
        ;

      console.info('loaded config, data, caches, partials');
      console.log({
        config:   arr[0]
      , data:     arr[1]
      , cache:    arr[2]
      , partials: arr[3]
      });
      console.info('last update: ' + (cache.lastUpdate && new Date(cache.lastUpdate) || 'never'));

      // TODO make document configurability
      config.rootdir = config.rootdir || '_root';
      return PromiseA.all([
        fsapi.getMeta(
          themenames
        , { dotfiles: false 
          , extensions: ['md', 'markdown', 'htm', 'html', 'jade', 'css', 'js', 'yml']
          }
        )
      , fsapi.getMeta(
          [config.rootdir]
        , { dotfiles: false
          , extensions: ['md', 'markdown', 'htm', 'html', 'jade']
          }
        )
      , fsapi.getMeta(
          collectionnames
        , { dotfiles: false
          , extensions: ['md', 'markdown', 'htm', 'html', 'jade']
          }
        )
      , fsapi.getMeta(
          assetnames
        , { dotfiles: false 
          //, extensions: ['md', 'markdown', 'htm', 'html', 'jade', 'css', 'js', 'yml']
          }
        )
      ]).then(function (things) {
        console.info('loaded theme meta, root meta, collection meta');
        console.log({
          theme:      things[0]
        , root:       things[1]
        , collection: things[2]
        , asset:      things[3]
        });

        function noErrors(map) {
          Object.keys(map).forEach(function (path) {
            map[path] = map[path].filter(function (m) {
              if (!m.error && m.size) {
                return true;
              }

              if (!m.size) {
                console.warn("Ignoring 0 byte file " + (m.path || m.name));
                return false;
              }

              console.warn("Couldn't get stats for " + (m.path || m.name));
              console.warn(m.error);
            });
          });

          return map;
        }

        var themes      = noErrors(things[0])
          , root        = noErrors(things[1])[config.rootdir]
          , collections = noErrors(things[2])
          , assets      = noErrors(things[3])
          ;

        if (!themes[Object.keys(themes)[0]].length) {
          console.error('Missing THEMES!');
          throw new Error('It seems that your themes directory is missing');
        }

        if (!root.length) {
          console.error('Missing ROOT!');
        }

        if (!collections[Object.keys(collections)[0]].length) {
          console.error('Missing Collections!');
        }

        return {
          config: config
        , data: data
        , cache: cache
        , meta: { 
            themes: themes
          , collections: collections
          , root: root
          , assets: assets
          }
        , partials: partials
        };
      });
    });
  };

  Desi.runDesi = runDesi;
    
  Desi.otherStuff = function (desi) {
    var files = {}
      ;

    // copy assets -> easy!
    // TODO check cache
    Object.keys(desi.meta.assets).forEach(function (key) {
      var assets = desi.meta.assets[key]
        ;

      // TODO fix compiled_path + base_path
      assets.forEach(function (asset) {
        console.log('preparing ' + asset + ' for copy');
        files[path.join(asset.relativePath, asset.name)] = path.join(desi.config.compiled_path, 'assets', asset.relativePath, asset.name);
      });
    });

    return (Object.keys(files).length && fsapi.copy(files).then(function (copied) {
      if (copied.error) {
        console.error(copied.error);
        throw new Error(copied.error);
      }

      if (copied.errors && copied.errors.length) {
        console.error("Errors copying assets...");
        copied.errors.forEach(function (err) {
          console.error(err);
        });
      }

      return desi;
    }) || PromiseA.resolve(desi)).then(runDesi).then(function (desi) {
      return readFrontmatter(desi.content.root.concat(desi.content.themes.concat(desi.content.collections))).then(function () {
        return desi;
      });
    }).then(function (desi) {
      // TODO add missing metadata and resave file
      desi.navigation = [];

      desi.content.root.forEach(function (page) {
        var name = path.basename(page.path, path.extname(page.path))
          , nindex
          ;

        //if (-1 === desi.data.navigation.indexOf(name) && 'index' !== name)
        nindex = desi.data.navigation.indexOf(name);
        if (-1 === nindex) {
          return;
        }

        desi.navigation[nindex] = {
          title: page.yml && page.yml.title || firstCap(name)
        , href: desi.urls.base_path + '/' + name
        , path: desi.urls.base_path + '/' + name
        , name: name
        , active: false // placeholder
        };
      });

      desi.content.root.forEach(function (page) {
        page.yml = page.yml || {};
        // TODO make default layout configurable
        page.yml.layout = page.yml.layout || '_root';

        if (!page.relativePath) {
          page.relativePath = path.dirname(page.path);
          page.name = page.name || path.basename(page.path);
        }

        page.relativePath = page.relativePath.replace(desi.config.rootdir, '').replace(/^\//, '');
        page.path = path.join(page.relativePath, page.name);

        // TODO make bare root routes configurable
        page.yml.permalink = page.yml.permalink || page.path.replace(/\.\w+$/, '');

        page.yml.title = page.yml.title || firstCap(page.name.replace(/\.\w+$/, ''));
      });

      desi.content.collections = desi.content.collections.filter(function (article) {
        if (!article.yml) {
          console.warn("no frontmatter for " + article.name);
          console.warn(article.name);
          return;
        }

        if (!article.body || !article.body.trim()) {
          console.warn('Ignoring empty content file ' + (article.path || article.name));
          return;
        }

        return true;
      });


      function normalizeFrontmatter(page) {
        var yml = page.yml
          ;

        // TODO read the config for this collection for how to create premalink
        if (!yml.permalink) {
          if (page.name) {
            page.htmlname = page.name.replace(/\.\w+$/, '.html');
          }
          page.path = page.path || path.join(page.relativePath, page.name);
          page.htmlpath = page.path.replace(/\.\w+$/, '.html');
          // TODO strip '_root' or whatever
          // strip .html, .md, .jade, etc
          if (!/^\/?(index)?\/?index(\.html)?/.test(yml.htmlpath)) {
            console.info('found index again');
            yml.permalink = page.htmlpath;
          }
          console.info('1', yml.permalink);
        }

        if (!/\.html?$/.test(yml.permalink)) {
          console.info(page.yml.permalink);
          yml.permalink = path.join(yml.permalink, 'index.html');
        }

        //yml.permalinkBase = path.join(path.dirname(yml.permalink), path.basename(yml.permalink, path.extname(yml.permalink)));
        //yml.permalink = path.join(path.dirname(yml.permalink), path.basename(yml.permalink, path.extname(yml.permalink)));

        if (!page.yml.uuid) {
          // TODO only do this if it's going to be saved
          // page.yml.uuid = UUID.v4();
        }

        if (!page.yml.date) {
          // TODO tell YAML parser to keep the date a string
          page.yml.date = new Date(page.yml.created_at || page.yml.time || page.createdDate || page.lastModifiedDate).toISOString();
        }
        if ('object' === typeof page.yml.date) {
          page.yml.date = page.yml.date.toISOString();
        }

        if (!page.yml.updated_at) {
          page.yml.updated_at = page.lastModifiedDate;
        }
      }

      function normalizeContentEntity(entity) {
        entity.ext            = path.extname(entity.path);
        entity.url            = desi.urls.url + path.join(desi.urls.base_path, entity.yml.permalink);
        entity.canonical_url  = desi.urls.url + path.join(desi.urls.base_path, entity.yml.permalink);
        entity.relative_url   = path.join(desi.urls.base_path, entity.yml.permalink);
        entity.published_at   = fromLocaleDate(entity.yml.date);
        entity.year           = entity.published_at.year;
        entity.month          = entity.published_at.month;
        entity.day            = entity.published_at.day;
        entity.hour           = entity.published_at.hour;
        entity.twelve_hour    = entity.published_at.twelve_hour;
        entity.meridian       = entity.published_at.meridian;
        entity.minute         = entity.published_at.minute;
        entity.title          = entity.yml.title;
        // let's just agree that that's too far
        //entity.second = entity.published_at.second;

        // The root index is the one exception
        if (/^(index)?\/?index(\.html?)?$/.test(entity.yml.permalink)) {
          entity.yml.permalink = '';
          console.info('found index', entity);
        }
      }

      function byDate(a, b) {
        if (a.year > b.year) {
          return -1;
        } else if (a.year < b.year) {
          return 1;
        }

        if (a.month > b.month) {
          return -1;
        } else if (a.month < b.month) {
          return 1;
        }

        if (a.day > b.day) {
          return -1;
        } else if (a.day < b.day) {
          return 1;
        }

        if (a.hour > b.hour) {
          return -1;
        } else if (a.hour < b.hour) {
          return 1;
        }

        if (a.minute > b.minute) {
          return -1;
        } else if (a.minute < b.minute) {
          return 1;
        }

        if (a.title.toLowerCase() <= b.title.toLowerCase()) {
          return -1;
        }

        return 1;
      }

      function collate(entities) {
        var yearsArr = []
          ;

        entities.forEach(function (f) {
          var set
            , yindex = 3000 - f.year
            , mindex = 12 - f.month
            ;

          if (!yearsArr[yindex]) {
            yearsArr[yindex] = { year: f.year, months: [] };
          }
          set = yearsArr[yindex];

          if (!set.months[mindex]) {
            set.months[mindex] = { month: months[parseInt(f.month, 10)], pages: [] };
          }
          set = set.months[mindex];

          set.pages.push(f);
        });

        yearsArr = yearsArr.filter(function (y) {
          if (!y) {
            return false;
          }

          y.months = y.months.filter(function (m) {
            return m && m.pages.length;
          });

          if (!y.months.length) {
            return false;
          }

          return true;
        });

        return { years: yearsArr };
      }

      desi.content.root.forEach(normalizeFrontmatter);
      // TODO process tags and categories and such
      desi.content.collections.forEach(normalizeFrontmatter);

      desi.content.root.forEach(normalizeContentEntity);
      desi.content.collections.forEach(normalizeContentEntity);

      desi.content.collections.sort(byDate);
      desi.collated = collate(desi.content.collections);
      console.info('desi.collated');
      console.info(desi.collated);

      return desi;
    }).then(function (desi) {
      var compiled = []
        ;

      /*
      function compileScriptEntity(entity, i, arr) {
      }
      */
      desi.assets = [];
      function compileThemeEntity(entity, i, arr) {
        console.log("compiling " + (i + 1) + "/" + arr.length + " " + (entity.path || entity.name));
        // TODO less / sass / etc
        compiled.push({ contents: entity.body || entity.contents, path: path.join(desi.config.compiled_path, 'themes', entity.path) });
        if (/stylesheets.*\.css/.test(entity.path) && (!/google/.test(entity.path) || /obsid/.test(entity.path))) {
          // TODO XXX move to a partial
          desi.assets.push(
            '<link href="' + desi.urls.base_path + '/themes/' + entity.path + '" type="text/css" rel="stylesheet" media="all">'
          );
        }
      }
      desi.navigation.filter(function (n) {
        return n;
      });
      //console.log(desi.navigation);
      function compileContentEntity(entity, i, arr) {
        console.log("compiling " + (i + 1) + "/" + arr.length + " " + (entity.path || entity.name));

        var previous = ''
          , layers
          , view
          ;

        layers = getLayout(desi, entity.yml.theme, entity.yml.layout, [entity]);

        view = {
          page: entity.yml // data for just *this* page
        //, data: desi.data   // data.yml
        // https://github.com/janl/mustache.js/issues/415
        , data: num2str(desi.data)
        , collection: {}    // data for just *this* collection
        , categories: []    // *all* categories in all collections
        , tags: []          // *all* tags in all collections
        , site: num2str(desi.site || {})
        , url: entity.canonical_url
        , canonical_url: entity.canonical_url 
        , relative_url: entity.relative_url
        , urls: desi.urls
        , previous: arr[i - 1]
        , next: arr[i + 1]
        , posts: { collated: desi.collated }
          // TODO concat theme, widget, and site assets
        , assets: desi.assets.join('\n')
        };

        //console.log('rel:', view.relative_url);
        view.site.author = desi.data.author;
        view.site.navigation = JSON.parse(JSON.stringify(desi.navigation));
        view.site.navigation.forEach(function (nav) {
          
          if (nav.href === view.relative_url) {
            nav.active = true;
          }
        });
        // backwards compat
        view.site['navigation?to_pages'] = view.site.navigation;
        view.site['navigation?to__root'] = view.site.navigation;
        view.data.navigation = view.site.navigation;
        view.data['navigation?to_pages'] = view.site.navigation;
        view.data['navigation?to__root'] = view.site.navigation;

        layers.forEach(function (current) {
          // TODO meta.layout
          var body = (current.body || current.contents || '').trim()
            , html
            , curview = {}
            ;

          // TODO move to normalization
          current.path = current.path || (entity.relativePath + '/' + entity.name);

          if (/\.(html|htm)$/.test(current.path)) {
            html = body;
          } else if (/\.(md|markdown|mdown|mkdn|mkd|mdwn|mdtxt|mdtext)$/.test(current.ext)) {
            html = marked.render(body)
              //.replace('&quot;', '"')
              //.replace('&#39;', "'")
              //.replace('&#x2F;', '/')
              ;
          } else {
            console.error('unknown parser for ' + (entity.path));
          }

          view.content = previous;
          view.page.content = previous;

          // to prevent perfect object equality (and potential template caching)
          Object.keys(view).forEach(function (key) {
            curview[key] = view[key];
          });
          previous = Mustache.render(html, curview, desi.partials);
        });

        // NOTE: by now, all permalinks should be in the format /path/to/page.html or /path/to/page/index.html
        if (/^(index)?(\/?index.html)?$/.test(entity.yml.permalink)) {
          console.info('found compiled index');
          compiled.push({ contents: previous, path: path.join(desi.config.compiled_path, 'index.html') });
        } else {
          compiled.push({ contents: previous, path: path.join(desi.config.compiled_path, entity.yml.permalink) });
        }

        entity.yml.redirects = entity.yml.redirects || [];
        if (/\/index.html$/.test(entity.yml.permalink)) {
          entity.yml.redirects.push(entity.yml.permalink.replace(/\/index.html$/, '.html'));
        } else if (/\.html$/.test(entity.yml.permalink)) {
          entity.yml.redirects.push(entity.yml.permalink.replace(/\.html?$/, '/index.html'));
        } else {
          console.info('found index, ignoring redirect');
        }
        entity.yml.redirects.forEach(function (redirect) {
          var content
            ;

          // TODO move to partial
          content = 
            '<html>'
              + '<head>'
                + '<title>Redirecting to ' + entity.yml.title + '</title>'
                + '<meta http-equiv="refresh" content="0;URL=\''
                  + desi.urls.url + path.join(desi.urls.base_path, entity.yml.permalink)
                + '\'" />'
              + '</head>'
              + '<body>'
                + '<p>This page has moved to a <a href="'
                  + desi.urls.url + path.join(desi.urls.base_path, entity.yml.permalink)
                +'">'
                  + entity.yml.title
                + '</a>.</p>'
              + '</body>'
          + '</html>'
          ;

          compiled.push({ contents: content, path: path.join(desi.config.compiled_path, redirect) });
        });
      }

      console.info('[first] compiling theme assets');
      desi.content.themes.filter(function (f) { return !/\blayouts\b/.test(f.path); }).forEach(compileThemeEntity);

      console.info('compiling root pages');
      desi.content.root.forEach(compileContentEntity);
      console.info('compiling article pages');
      desi.content.collections.forEach(compileContentEntity);

      desi.compiled = compiled;
      return desi;
    }).then(function (desi) {
      var compiled = desi.compiled.slice(0)
        , batches = []
        , now
        , size = 0
        ;

      if (!compiled.length) {
        console.info("No files were deemed worthy to compile. Done");
        return;
      }

      // because some servers / proxies are terrible at handling large uploads (>= 100k)
      // (vagrant? or express? one of the two is CRAZY slow)
      console.info('saving compiled files', desi.compiled);
      while (compiled.length) {
        batches.push(compiled.splice(0, 500));
      }

      now = Date.now();
      console.info('compiled files');
      return forEachAsync(batches, function (files) {
        return fsapi.putFiles(files).then(function (saved) {
          size += saved.size;

          if (saved.error) {
            console.error(saved.error);
          }

          if (!saved.errors || !saved.errors.length) {
            return;
          }

          saved.errors.forEach(function (e) {
            console.error(e);
          });
          //console.info('saved ' + files.length + ' files');
          //console.log(saved);
        });
      }).then(function () {
        // TODO update cache
        console.info('wrote ' + desi.compiled.length 
          + ' files (' + (size / (1024 * 1024)).toFixed(2)
          + ' MiB) in '
          + ((Date.now() - now) / 1000).toFixed(3) + 's'
        );
      });
    });
  };

  exports.Desi = Desi.Desi = Desi;
}('undefined' !== typeof exports && exports || window));
