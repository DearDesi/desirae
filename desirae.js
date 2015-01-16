;(function (exports) {
  'use strict';

  var PromiseA      = exports.Promise       || require('bluebird').Promise
    , path          = exports.path          || require('path')
    , Mustache      = exports.Mustache      || require('mustache')
    , forEachAsync  = exports.forEachAsync  || require('foreachasync').forEachAsync
    , months
    , THEME_PREFIX  = 'themes'
    //, sha1sum       = exports.sha1sum       || require('./lib/node-adaptors').sha1sum
    //, safeResolve   = exports.safeResolve   || require('./lib/utils').safeResolve
    //, UUID          = exports.uuid          || require('node-uuid')
    ;

  function Desi() {
  }

  if (!exports.window) {
    Desi.sha1sum    = require('./lib/node-adapters').sha1sum;
    Desi.fsapi      = require('./lib/node-adapters').fsapi;
    Desi.realFsapi  = require('./lib/node-adapters').realFsapi;

    // adds helper methods to fsapi
    require('./lib/utils').create(Desi);
    // adds Desi.Frontmatter
    require('./lib/frontmatter').create(Desi);
  }

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

  /*
  function shallowClone(obj) {
    var shallow = {}
      ;

    Object.keys(obj).forEach(function (key) {
      shallow[key] = obj[key];
    });

    return shallow;
  }
  */

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
      var parts = Desi.Frontmatter.parse(file.contents)
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
    // TODO meta.layout for each entity
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


    // THEME PREFIX
    themepath = path.join(THEME_PREFIX, themename, layoutdir, layout);

    desi.content.themes.some(function (theme) {
      // TODO what if it isn't html?
      if (theme.path === themepath || theme.path.match(themepath + '\\.html')) {
        file = theme;
        theme.ext = path.extname(file.path);
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
      // return the chain page -> posts -> default -> bootstrap-2
      return arr;
    }
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  Desi.YAML = {
    parse:      (exports.jsyaml || require('js-yaml')).load
  , stringify:  (exports.jsyaml || require('js-yaml')).dump
  };



  Desi.toDesiDate = Desi.toLocaleDate = function (d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + ' '
      + (d.getHours() % 12) + ':' + pad(d.getMinutes()) + ' ' + (d.getHours() - 12 >= 0 ? 'pm' : 'am')
      ;
  };

  // read config and such
  Desi._initFileAdapter = function (env) {
    if (!exports.window) {
      // TODO pull state out of this later
      Desi.realFsapi.create(Desi, env);
    }
    return PromiseA.resolve();
  };

  Desi.init = function (desi, env) {
    console.log('');
    console.log('');
    console.info('getting config, data, caches...');

    if (!exports.window) {
      // TODO pull state out of this later
      Desi.realFsapi.create(Desi, env);
    }
    // config.yml, data.yml, site.yml, authors
    return PromiseA.all([Desi.fsapi.getAllConfigFiles()/*, fsapi.getBlogdir()*/]).then(function (plop) {
      var arr = plop[0]
        //, blogdir = plop[1]
        ; 

      console.info('loaded config, data, caches, partials');
      console.log({
        config:   arr.config
      , site:     arr.site
      , authors:  arr.authors
      });

      //desi.blogdir = blogdir;
      desi.originals = {};
      desi.copies = {};

      Object.keys(arr).forEach(function (key) {
        desi.originals[key] = arr[key];
        desi.copies[key]    = clone(arr[key]);
        desi[key]           = clone(arr[key]);
      });

      // TODO just walk all of ./*.yml authors, posts, themes, _root from the get-go
      desi.config.rootdir = desi.config.rootdir || '_root';
      if ('object' !== typeof desi.config.collections || !Object.keys(desi.config.collections).length) {
        desi.config.collections = { 'posts': {} };
      }
      if ('object' !== typeof desi.config.themes || !Object.keys(desi.config.themes).length) {
        desi.config.themes = { 'default': 'bootstrap-2', 'bootstrap-2': {} };
      }
      if ('object' !== typeof desi.config.assets || !Object.keys(desi.config.assets).length) {
        desi.config.assets = { 'media': {} };
      }

      if (!Array.isArray(desi.site.navigation) || !desi.site.navigation.length) {
        desi.site.navigation = ['archive'];
      }

      var collectionnames = Object.keys(desi.config.collections)
        , themenames = Object.keys(desi.config.themes)
            .filter(function (k) { return 'default' !== k; })
            //.map(function (n) { return path.join(n, 'layouts'); })
        , assetnames = Object.keys(desi.config.assets)
        ;

      // TODO make document configurability
      return PromiseA.all([
        Desi.fsapi.getMeta(
          themenames.map(function (n) { return path.join(THEME_PREFIX, n); })
        , { dotfiles: false 
          , extensions: ['md', 'markdown', 'htm', 'html', 'jade', 'css', 'js', 'yml']
          }
        )
      , Desi.fsapi.getMeta(
          [desi.config.rootdir]
        , { dotfiles: false
          , extensions: ['md', 'markdown', 'htm', 'html', 'jade']
          }
        )
      , Desi.fsapi.getMeta(
          collectionnames
        , { dotfiles: false
          , extensions: ['md', 'markdown', 'htm', 'html', 'jade']
          }
        )
      , Desi.fsapi.getMeta(
          assetnames
        , { dotfiles: false 
          //, extensions: ['md', 'markdown', 'htm', 'html', 'jade', 'css', 'js', 'yml']
          }
        )
      , Desi.fsapi.getCache()
      ]);
    }).then(function (things) {
      console.info('loaded theme meta, root meta, collection meta');
      console.log({
        theme:      things[0]
      , root:       things[1]
      , collection: things[2]
      , asset:      things[3]
      , cache:      things[4]
      });

      function noErrors(map) {
        Object.keys(map).forEach(function (path) {
          map[path] = map[path].filter(function (m) {
            if (m.error) {
              console.warn("Couldn't read '" + (m.path || m.name) + "'");
              console.warn(m.error);
              return false;
            }

            if (!m.size) {
              console.warn("Ignoring 0 byte file '" + (m.path || m.name) + "'");
              console.warn(m.error);
              return false;
            }

            return true;
          });
        });

        return map;
      }

      var themes      = noErrors(things[0])
        , root        = noErrors(things[1])[desi.config.rootdir]
        , collections = noErrors(things[2])
        , assets      = noErrors(things[3])
        , cache       = noErrors(things[4])
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

      console.info('last update: ' + (cache && cache.lastUpdate && new Date(cache.lastUpdate) || 'never'));
      desi.cache = cache;
      desi.meta = {
        themes: themes
      , collections: collections
      , root: root
      , assets: assets
      };
      desi.styles = [];

      return desi;
    });
  };

  Desi.getDirtyFiles = function (desi) {
    var cache = desi.cache
      //, config = desi.config
      , cacheByPath = {}
      , cacheBySha1 = {}
      , dfiles
      , dthemes
      , droot
      ;

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
      Object.keys(droot).length ? Desi.fsapi.getContents(Object.keys(droot)) : PromiseA.resolve([])
    , Object.keys(dfiles).length ? Desi.fsapi.getContents(Object.keys(dfiles)) : PromiseA.resolve([])
    , Object.keys(dthemes).length ? Desi.fsapi.getContents(Object.keys(dthemes)) : PromiseA.resolve([])
    ]).then(function (arr) {
      // TODO XXX display errors in html
      function noErrors(o) {
        if (!o.error) {
          return true;
        }

        console.warn("Couldn't get file contents for " + o.path);
        console.warn(o.error);
      }

      // TODO also retrieve from cache?
      desi.content = {
        root: arr[0].filter(noErrors)
      , collections: arr[1].filter(noErrors)
      , themes: arr[2].filter(noErrors)
      };

      return desi;
    });
  };  

  Desi.copyAssets = function(desi, env) {
    var files = {}
      ;

    // copy assets -> easy!
    // TODO check cache
    Object.keys(desi.meta.assets).forEach(function (key) {
      var assets = desi.meta.assets[key]
        ;

      assets.forEach(function (asset) {
        console.log('preparing ' + asset.path + ' for copy');
        files[path.join(asset.relativePath, asset.name)] = path.join(env.compiled_path, 'assets', asset.relativePath, asset.name);
      });
    });

    return (Object.keys(files).length && Desi.fsapi.copy(files).then(function (copied) {
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
    }) || PromiseA.resolve(desi));
  };

  Desi.parseFrontmatter = function (desi) {
    return readFrontmatter(desi.content.root.concat(desi.content.themes.concat(desi.content.collections))).then(function () {
      return desi;
    });
  };

  Desi.getNav = function (desi) {
    // TODO add missing metadata and resave file
    desi.navigation = [];

    desi.content.root.forEach(function (page) {
      // XXX BUG TODO strip only strip _root so that nested nav will work as expected
      var name = path.basename(page.path, path.extname(page.path))
        , nindex
        ;

      //if (-1 === desi.data.navigation.indexOf(name) && 'index' !== name)
      nindex = (desi.site.navigation).indexOf(name);
      if (-1 === nindex) {
        return;
      }

      desi.navigation[nindex] = {
        title: page.yml && page.yml.title || firstCap(name)
      , name: name
      , active: false // placeholder
      };
    });

    // transform spare array into compact array
    desi.navigation = desi.navigation.filter(function (n) {
      return n;
    });

    return PromiseA.resolve(desi);
  };

  Desi.normalizeYml = function (desi) {
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
        page.yml.date = new Date(page.yml.created_at || page.yml.time || page.yml.updated_at || page.createdDate || page.lastModifiedDate).toISOString();
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

    desi.content.root.forEach(normalizeFrontmatter);
    // TODO process tags and categories and such
    desi.content.collections.forEach(normalizeFrontmatter);

    desi.content.root.forEach(normalizeContentEntity);
    desi.content.collections.forEach(normalizeContentEntity);

    return PromiseA.resolve(desi);
  };

  Desi.collate = function (desi, env/*, collectionname*/) {
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

        f.url = path.join(env.base_path, f.yml.permalink);

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


    desi.content.collections.sort(byDate);
    desi.collated = collate(desi.content.collections);
    console.info('7 desi.collated');
    console.info(desi.collated);

    return PromiseA.resolve(desi);
  };

  Desi._datamaps = {};
  Desi.registerDataMapper = function (name, fn) {
    if (!Desi._datamaps[name]) {
      Desi._datamaps[name] = fn;
    } else {
      console.warn("ignoring additional data mapper for '"
        + name + "' (there's already one assigned)");
    }
  };
  Desi.registerDataMapper('desirae@1.0', function (obj) {
    obj.desi = obj;
    return obj;
  });
  Desi.registerDataMapper('ruhoh@2.6', function (view) {
    var newview
      ;

    newview = {
      content: view.contents
    , page: {
        title: view.entity.yml.title || view.site.title
      , tagline: view.entity.yml.tagline
      , content: view.contents
      , youtube: view.entity.yml.youtube
      , tags: view.entity.yml.tags
      , categories: view.entity.yml.categories
      , player_width: view.entity.yml.player_width
      , player_height: view.entity.yml.player_height
      , next: view.entities[view.entity_index + 1]
      , previous: view.entities[view.entity_index - 1]
      , date: view.entity.year + '-' + view.entity.month + '-' + view.entity.day
      // TODO , url: view.entities.
      }
    , posts: { collated: view.desi.collated }
    , urls: {
        base_url: view.env.base_url
        // /something -> good (leading slash)
        // / -> bad (trailing slash)
      , base_path: view.env.base_path.replace(/^\/$/, '')
      }
    , data: {
        author: {
          name: view.author.name
        , twitter: view.author.twitter
        }
      , title: view.site.title
      }
    , styles: view.desi.styles.join('\n')
    , assets: view.desi.styles.join('\n')
    , widgets: {
        comments: view.site.disqus_shortname &&
          Mustache.render(view.desi.partials.disqus, { disqus: {
            shortname: view.site.disqus_shortname
          , identifier: view.entity.disqus_identifier || undefined
          , url: !view.entity.disqus_identifier && view.entity.disqus_url || undefined
          }})
      , analytics: view.site.google_analytics_tracking_id && 
          Mustache.render(view.desi.partials.google_analytics, { google_analytics: {
            tracking_id: view.site.google_analytics_tracking_id
          }})
      , facebook_connect: view.desi.partials.facebook_connect
      , twitter: view.desi.partials.twitter
      , google_plusone: view.desi.partials.google_plusone
      , amazon_link_enhancer: view.site.amazon_affiliate_id &&
          Mustache.render(view.desi.partials.amazon_link_enhancer, {
            amazon_affiliate_id: view.site.amazon_affiliate_id
          })
      }
    , site: {
        navigation: view.navigation
      }
    };

    // backwards compat
    newview.site['navigation?to_pages'] = newview.site.navigation;
    newview.site['navigation?to__root'] = newview.site.navigation;
    newview.data.navigation = view.site.navigation;
    newview.data['navigation?to_pages'] = newview.site.navigation;
    newview.data['navigation?to__root'] = newview.site.navigation;

    newview.page.content = view.contents;

    return newview;
  });

  Desi.renderers = {};
  Desi.registerRenderer = function(ext, fn, opts) {
    ext = ext.replace(/^\./, '');
    // TODO allow a test method for ext and content (new RegExp("\\." + escapeRegExp(ext) + "$", i).test(current.ext))
    opts = opts || {};
    // TODO opts.priority
    Desi.renderers[ext] = Desi.renderers[ext] || [];
    // LIFO
    Desi.renderers[ext].unshift(fn);
  };
  Desi.render = function (ext, content, view) {
    ext = (ext||'').toLowerCase().replace(/^\./, '');

    if (Desi.renderers[ext] && Desi.renderers[ext].length) {
      return Desi.renderers[ext][0](content, view);
    }
    return PromiseA.reject(new Error("no renderer registered for ." + ext));
  };

  function registerJade() {
    var jade = true || exports.jade || require('jade')
      ;

    function render(contentstr/*, desi*/) {
      return PromiseA.resolve(jade(contentstr));
    }

    if (false) {
      Desi.registerRenderer('jade', render);
    }
  }
  registerJade();

  function registerMarkdown() {
    var markitdown  = (exports.markdownit || require('markdown-it'))({ html: true, linkify: true })
      ;

    function render(contentstr/*, desi*/) {
      return PromiseA.resolve(
        markitdown.render(contentstr)
          //.replace('&quot;', '"')
          //.replace('&#39;', "'")
          //.replace('&#x2F;', '/')
      );
    }

    ['md', 'markdown', 'mdown', 'mkdn', 'mkd', 'mdwn', 'mdtxt', 'mdtext'].forEach(function (ext) {
      Desi.registerRenderer(ext, render);
    });
  }
  registerMarkdown();

  function registerHtml() {
    function render(contentstr/*, desi*/) {
      return PromiseA.resolve(contentstr);
    }

    Desi.registerRenderer('html', render);
    Desi.registerRenderer('htm', render);
    Desi.registerRenderer('xhtml', render);
  }
  registerHtml();

  function renderLayers(desi, env, view, entity) {
    var mustached = ''
      , layers
      ;

    layers = getLayout(desi, entity.yml.theme, entity.yml.layout, [entity]);

    return forEachAsync(layers, function (current) {
      var body = (current.body || current.contents || '').trim()
        ;

      // TODO move to normalization
      current.path = current.path || (entity.relativePath + '/' + entity.name);


      return Desi.render(current.ext, body, view).then(function (html) {
        // TODO inherit datamap from theme layout
        var datamap = Desi._datamaps[env.datamap] || Desi._datamaps[entity.datamap] || Desi._datamaps['ruhoh@2.6']
          , newview
          ;

        view.contents = mustached;

        // shallowClone to prevent perfect object equality (and potential template caching)
        newview = datamap(view);
        mustached = Mustache.render(html, newview, desi.partials);

        return mustached;
      }).catch(function (e) {
        console.error(current);
        if (env.onError) {
          return env.onError(e);
        } else {
          console.error('no registered renderer for ' + entity.path + ' or rendering failed');
          throw e;
        }
      });
    });
  }

  Desi.build = function (desi, env) {
    var compiled = []
      ;

    env.transforms = env.transforms || [];
    desi.transforms = (desi.transforms || []).concat(env.transforms);
    desi.transforms.push(function (view) {
      var yml = view.entity.yml
        ;

      if (yml.uuid) {
        view.entity.disqus_identifier = yml.uuid;
      } else {
        view.entity.disqus_url = view.entity.production_url;
      }

      return view;
    });

    /*
    function compileScriptEntity(entity, i, arr) {
    }
    */
    function compileThemeEntity(entity, i, arr) {
      console.log("compiling " + (i + 1) + "/" + arr.length + " " + (entity.path || entity.name));
      // TODO less / sass / etc
      compiled.push({ contents: entity.body || entity.contents, path: path.join(entity.path) });
      if (/stylesheets.*\.css/.test(entity.path) && (!/google/.test(entity.path) || /obsid/.test(entity.path))) {
        // TODO XXX move to a partial
        desi.styles.push(
          '<link href="' + path.join(env.base_path, entity.path) + '" type="text/css" rel="stylesheet" media="all">'
        );
      }
    }

    function compileContentEntity(entity, i, arr) {
      console.log("compiling " + (i + 1) + "/" + arr.length + " " + entity.path);

      var navigation = JSON.parse(JSON.stringify(desi.navigation))
        , author = desi.authors[entity.yml.author] || desi.authors[Object.keys(desi.authors)[0]]
        , view
        ;

      // TODO still have some index.html mess to work out...
      entity.url            = env.base_url + path.join(env.base_path, entity.yml.permalink).replace(/\/index.html$/, '/');
      entity.canonical_url  = env.base_url + path.join(env.base_path, entity.yml.permalink).replace(/\/index.html$/, '/');
      entity.production_url = desi.site.base_url + path.join(desi.site.base_path, entity.yml.permalink).replace(/\/index.html$/, '/');
      entity.relative_url   = path.join(env.base_path, entity.yml.permalink).replace(/\/index.html$/, '/');

      // TODO nested names?
      navigation.forEach(function (nav) {
        nav.href = path.join(env.base_path, nav.name);
        nav.path = path.join(env.base_path, nav.name);

        // path.basename(nav.path, path.extname(nav.path))
        if (nav.href.replace(/(\/)?(\/index)?(\.html)?$/i, '') === entity.relative_url.replace(/(\/)?(\/index)?(\.html)?$/i, '')) {
          nav.active = true;
        }
      });

      view = {
        env: env
      , config: desi.config
      , site: desi.site
      , data: desi.data
      , entity: entity
      , entity_index: i
      , entities: arr
      , desi: desi
      , navigation: navigation
      , author: num2str(author)
      };

      desi.transforms.forEach(function (fn) {
        view = fn(view);
      });

      return renderLayers(desi, env, view, entity).then(function (html) {
        // NOTE: by now, all permalinks should be in the format /path/to/page.html or /path/to/page/index.html
        if (/^(index)?(\/?index.html)?$/.test(entity.yml.permalink)) {
          console.info('found compiled index');
          compiled.push({ contents: html, path: path.join('index.html') });
        } else {
          compiled.push({ contents: html, path: path.join(entity.yml.permalink) });
        }

        entity.yml.redirects = entity.yml.redirects || [];

        if (/\/index.html$/.test(entity.yml.permalink)) {
          entity.yml.redirects.push(entity.yml.permalink.replace(/\/index.html$/, '.html'));
        } else if (/\.html$/.test(entity.yml.permalink)) {
          entity.yml.redirects.push(entity.yml.permalink.replace(/\.html?$/, '/index.html'));
        } else {
          console.info('found index, ignoring redirect');
        }

        var redirectHtml = Mustache.render(desi.partials.redirect, view)
          ;

        entity.yml.redirects.forEach(function (redirect) {

          compiled.push({
            contents: redirectHtml
          , path: redirect
          });
        });
      }).catch(function (e) {
        if (env.onError) {
          return env.onError(e);
        } else {
          console.error("couldn't render " + entity.path);
          console.error(entity);
          console.error(e);
          throw e;
        }
      });
    }

    function doStuff() {
      var themes = desi.content.themes.filter(function (f) { return !/\blayouts\b/.test(f.path); })
        ;

      console.info('[first] compiling theme assets');
      return forEachAsync(themes, compileThemeEntity).then(function () {
        console.info('compiling article pages');
        return forEachAsync(desi.content.collections, compileContentEntity).then(function () {
          console.info('compiling root pages');
          return forEachAsync(desi.content.root, compileContentEntity);
        }).then(function () {
          desi.compiled = compiled;
          return desi;
        });
      });
    }

    if (!desi.partials) {
      return Desi.fsapi.getAllPartials().then(function (partials) {
        if (partials.error) {
          throw partials.error;
        }

        desi.partials = partials;
        return doStuff();
      });
    } else {
      return doStuff();
    }
  };

  Desi.buildAll = function (desi, env) {
    return Desi.getDirtyFiles(desi, env.since)
      .then(Desi.parseFrontmatter)
      .then(Desi.getNav)
      .then(Desi.normalizeYml)
      .then(function () {
        Desi.collate(desi, env);
      })
      .then(function () {
        return Desi.build(desi, env);
      }).then(function () {
        return Desi.copyAssets(desi, env);
      }).catch(function (e) {
        if (env.onError) {
          return env.onError(e);
        } else {
          console.error('buildAll failed somewhere');
          console.error(e);
          throw e;
        }
      })
      ;
  };

  Desi.write = function (desi, env) {
    var compiled = desi.compiled.slice(0)
      , batches = []
      , now
      , size = 0
      ;

    if (!compiled.length) {
      console.info("No files were deemed worthy to compile. Done");
      return;
    }

    compiled.forEach(function (thing) {
      thing.path = path.join(env.compiled_path, thing.path);
    });

    // because some servers / proxies are terrible at handling large uploads (>= 100k)
    // (vagrant? or express? one of the two is CRAZY slow)
    console.info('saving compiled files', desi.compiled);
    while (compiled.length) {
      batches.push(compiled.splice(0, 500));
    }

    now = Date.now();
    console.info('compiled files');
    return forEachAsync(batches, function (files) {
      return Desi.fsapi.putFiles(files).then(function (saved) {
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
  };

  exports.Desirae = exports.Desi = Desi.Desirae = Desi.Desi = Desi;
}('undefined' !== typeof exports && exports || window));
