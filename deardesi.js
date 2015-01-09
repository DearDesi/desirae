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
      , droot
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

    dthemes = getDirty(cacheByPath, cacheBySha1, desi.meta.themes);
    droot = getDirty(cacheByPath, cacheBySha1, [desi.meta.root], dthemes);
    dfiles = getDirty(cacheByPath, cacheBySha1, desi.meta.collections, dthemes);
    
    return PromiseA.all([
      fsapi.getContents(Object.keys(droot))
    , fsapi.getContents(Object.keys(dfiles))
    , fsapi.getContents(Object.keys(dthemes))
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

  return PromiseA.all([fsapi.getConfig(), fsapi.getData(), fsapi.getCache(), fsapi.getPartials()]).then(function (arr) {
    var config = arr[0]
      , data = arr[1]
      , cache = arr[2]
      , partials = arr[3]
      , collectionnames = Object.keys(config.collections)
      , themenames = Object.keys(config.themes)
          .filter(function (k) { return 'default' !== k; })
          //.map(function (n) { return path.join(n, 'layouts'); })
      ;

    console.info('loaded config, data, caches.');
    console.log(arr);
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
    ]).then(function (things) {
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

      var themes = noErrors(things[0])
        , root = noErrors(things[1])[config.rootdir]
        , collections = noErrors(things[2])
        ;

      return {
        config: config
      , data: data
      , cache: cache
      , meta: { 
          themes: themes
        , collections: collections
        , root: root
        }
      , partials: partials
      };
    });
  }).then(runDesi).then(function (desi) {
    return readFrontmatter(desi.content.root.concat(desi.content.themes.concat(desi.content.collections))).then(function () {
      return desi;
    });
  }).then(function (desi) {
    // TODO add missing metadata and resave file
    desi.navigation = [];

    desi.content.root.forEach(function (page) {
      var name = path.basename(page.path, path.extname(page.path))
        ;

      //if (-1 === desi.data.navigation.indexOf(name) && 'index' !== name)
      if (-1 === desi.data.navigation.indexOf(name)) {
        return;
      }

      desi.navigation.push({
        title: page.yml && page.yml.title || name.replace(/^./, function ($1) { return $1.toUpperCase(); })
      , href: '/' + name
      , path: '/' + name
      , name: name
      , active: false // placeholder
      });
    });


    desi.content.root.forEach(function (page) {
      page.yml = page.yml || {};
      page.yml.layout = page.yml.layout || 'default';

      if (!page.relativePath) {
        page.relativePath = path.dirname(page.path);
        page.name = page.name || path.basename(page.path);
      }

      page.relativePath = page.relativePath.replace(desi.config.rootdir, '').replace(/^\//, '');
      page.path = path.join(page.relativePath, page.name);
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
        page.path = page.path || path.join(page.relativePath, page.name);
        // TODO strip '_root' or whatever
        // strip .html, .md, .jade, etc
        yml.permalink = path.join(desi.urls.base_path, path.basename(page.path, path.extname(page.path)));
      }
      //yml.permalinkBase = path.join(path.dirname(yml.permalink), path.basename(yml.permalink, path.extname(yml.permalink)));
      yml.permalink = path.join(path.dirname(yml.permalink), path.basename(yml.permalink, path.extname(yml.permalink)));

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
      if (/^\/?index$/.test(entity.yml.permalink)) {
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
          console.log(f.year);
          yearsArr[yindex] = { year: f.year, months: [] };
        }
        set = yearsArr[yindex];

        if (!set.months[mindex]) {
          set.months[mindex] = { month: f.month, pages: [] };
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

      console.log(yearsArr);
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
        desi.assets.push(
          '<link href="' + entity.path + '" type="text/css" rel="stylesheet" media="all">'
        );
      }
    }
    console.log(desi.navigation);
    function compileContentEntity(entity, i, arr) {
      console.log("compiling " + (i + 1) + "/" + arr.length + " " + (entity.path || entity.name));

      var child = ''
        , layers
        , view
        ;

      layers = getLayout(desi, entity.yml.theme, entity.yml.layout, [entity]);

      view = {
        page: entity.yml // data for just *this* page
      , content: child    // processed content for just *this* page
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

      layers.forEach(function (current) {
        // TODO meta.layout
        var body = (current.body || current.contents || '').trim()
          , html
          ;

        current.path = current.path || entity.relativePath + '/' + entity.name;

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

        view.content = child;

        child = Mustache.render(html, view, desi.partials);
      });

      // TODO add html meta-refresh redirects
      compiled.push({ contents: child, path: path.join(desi.config.compiled_path, entity.yml.permalink, 'index.html') });
      entity.yml.redirects = entity.yml.redirects || [];
      if (entity.yml.permalink) {
        entity.yml.redirects.push(entity.yml.permalink + '.html');
      }
      entity.yml.redirects.forEach(function (redirect) {
        child = 
          '<html>'
            + '<head>'
              + '<title>Redirecting to ' + entity.yml.title + '</title>'
              + '<meta http-equiv="refresh" content="0;URL=\''
                + desi.urls.url + path.join(entity.yml.permalink)
              + '\'" />'
            + '</head>'
            + '<body>'
              + '<p>This page has moved to a <a href="'
                + desi.urls.url + path.join(entity.yml.permalink)
              +'">'
                + entity.yml.title
              + '</a>.</p>'
            + '</body>'
        + '</html>'
        ;

        compiled.push({ contents: child, path: path.join(desi.config.compiled_path, redirect) });
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
    console.info('saving compiled files');
    while (compiled.length) {
      batches.push(compiled.splice(0, 1));
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
  }).catch(function (e) {
    console.error('A great and uncatchable error has befallen the land. Read ye here for das detalles..');
    console.error(e.message);
    throw e;
  });
}('undefined' !== typeof exports && exports || window));
