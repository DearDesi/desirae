;(function (exports) {
  'use strict';

  var PromiseA      = exports.Promise       || require('bluebird').Promise
    , path          = exports.path          || require('path')
    , Mustache      = exports.Mustache      || require('mustache')
    , forEachAsync  = exports.forEachAsync  || require('foreachasync').forEachAsync
    , THEME_PREFIX  = 'themes'
    //, sha1sum       = exports.sha1sum       || require('./lib/node-adaptors').sha1sum
    //, safeResolve   = exports.safeResolve   || require('./lib/utils').safeResolve
    //, UUID          = exports.uuid          || require('node-uuid')
    , pforms
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

  Desi.slugify = function (title) {
    return title.toLowerCase()
      .replace(/["']/g, '')
      .replace(/\W/g, '-')
      .replace(/^-+/g, '')
      .replace(/-+$/g, '')
      .replace(/--/g, '-')
      ;
  };

  Desi.slugifyPath = function (filepath) {
    // because not all filepaths are url-safe
    return filepath.toLowerCase()
      .replace(/\//g, '___SLASH___')
      .replace(/["']/g, '')
      .replace(/\W/g, '-')
      .replace(/^-+/g, '')
      .replace(/-+$/g, '')
      .replace(/--/g, '-')
      .replace(/___SLASH___/g, '/')
      ;
  };

  Desi.pad = function (str, n, c) {
    c = c || '0';
    if (0 !== n && !n) {
      n = 2;
    }
    str = str.toString();

    if (str.length < 2) {
      return c + str;
    }

    return str;
  };

  Desi.firstCap = function (str) {
    return str.replace(/^./, function ($1) { return $1.toUpperCase(); });
  };

  // See https://github.com/janl/mustache.js/issues/415
  Desi.num2str = function (obj) {
    return JSON.parse(JSON.stringify(obj, function (key, val) {
      if ('number' === typeof val) {
        val = val.toString();
      }
      return val;
    }));
  };

  pforms = {
    year:           function (entity) {
                      return entity.year;
                    }
  , month:          function (entity) {
                      return Desi.pad(entity.month, 2);
                    }
  , day:            function (entity) {
                      return Desi.pad(entity.day, 2);
                    }
  , path:           function (entity) {
                      return entity.relativePath
                        .toLowerCase()
                        .replace(/^\//, '')
                        ;
                    }
  , relative_path:  function (entity) {
                      // TODO slug the path in desirae proper?
                      // TODO remove collection from start of path instead
                      // of blindly assuming one directory at start of path
                      // entity.collection.name
                      return entity.relativePath
                        .toLowerCase()
                        .replace(/^\/?[^\/]+\//, '')
                        ;
                    }
  , filename:       function (entity) {
                      // don't put .html
                      return entity.name
                        .toLowerCase()
                        .replace(/\.\w+$/, '')
                        ;
                    }
  , slug:           function (entity) {
                      // alias of title
                      return entity.slug;
                    }
  , title:          function (entity) {
                      return entity.slug;
                    }
  , name:           function (entity) {
                      // alias of title
                      return entity.slug;
                    }
  , collection:     function (entity) {
                      // TODO implement in desirae
                      return entity.collection && entity.collection.name
                        || entity.collectionname
                        || entity.collection
                        || ''
                        ;
                    }
  , categories:     function (entity) {
                      return (entity.categories)[0]||'';
                    }
  , i_month:        function (entity) {
                      return parseInt(entity.month, 10) || 0;
                    }
  , i_day:          function (entity) {
                      return parseInt(entity.day, 10) || 0;
                    }
  };

  Desi.permalinkify = function (desi, purl, entity) {
    var parts = purl.split('/')
      ;
      
    // when created from the web or cmd the file doesn't yet exist
    if (!entity.name) {
      entity.name = entity.slug + '.html';
    }
    if (!entity.relativePath) {
      entity.relativePath = entity.collection || Object.keys(desi.config.collections)[0] || 'posts';
    }

    parts.forEach(function (part, i) {
      var re = /:(\w+)/g
        , m
          // needs to be a copy, not a reference
        , opart = part.toString()
        ;

      /* jshint -W084 */
      while (null !== (m = re.exec(opart))) {
        if (pforms[m[1]]) {
          part = part.replace(':' + m[1], pforms[m[1]](entity));
        }
      }
      /* jshint +W084 */

      parts[i] = part || '';
    });

    parts.unshift('/');
    purl = path.join.apply(null, parts);
    if (!/(\/|\.html?)$/.test(purl)) {
      // we just default to a slash if you were ambiguous
      purl += '/';
    }

    return purl;
  };

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
    });
  }

  // TODO redo entirely
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

  function getLayout(desi, themename, layoutname, arr, i) {
    if (i > (desi.config.max_layouth_depth || 10)) {
      console.error('desi.config.yml:max_layouth_depth if your layouts intentionally nest more than ' + i + ' levels deep');
      throw new Error("Possible circular dependency in theme '" + themename + "', layout '" + layoutname + "'");
    }
    i = i || 0;
    // TODO meta.layout for each entity
    arr = arr || [];

    var layoutdir = 'layouts'
      , themepath
      , file
      ;

    if (!themename) {
      themename = desi.site.theme;
    }

    // defaults to ruhoh-twitter defaults
    if ('__page__' === layoutname) {
      layoutname = desi.config.themes[themename].pageLayout || 'page';
    } else if ('__post__' === layoutname) {
      layoutname = desi.config.themes[themename].postLayout || 'post';
    } else if (!layoutname) {
      // TODO assign __post__ in a previous step and do away with this case
      layoutname = desi.config.themes[themename].postLayout || 'post';
    }


    // THEME PREFIX
    themepath = path.join(THEME_PREFIX, themename, layoutdir, layoutname);

    desi.content.themes.some(function (theme) {
      // TODO what if it isn't html?
      if (theme.path === themepath || theme.path.match(themepath + '\\.html')) {
        file = theme;
        theme.ext = path.extname(file.path);
        // TODO merge with yml?
        theme.config = desi.config.themes[themename];
        theme.themename = themename;
        theme.layoutname = layoutname;
        arr.push(theme);
        return true;
      }
    });

    if (!file) {
      console.error("could not find " + themepath);
      return;
    }

    // TODO handle possible circular dep condition page -> post -> page
    if (!file.yml || !file.yml.layout) {
      // return the chain page -> posts -> default -> ruhoh-twitter
      return arr;
    }

    if (!file.yml || !file.yml.layout) {
      return arr;
    }

    return getLayout(desi, themename, file.yml.layout, arr, i + 1);
  }

  /* function clone(obj) { return JSON.parse(JSON.stringify(obj)); } */

  Desi.YAML = {
    parse:      (exports.jsyaml || require('js-yaml')).load
  , stringify:  (exports.jsyaml || require('js-yaml')).dump
  };

  Desi.toDesiDate = Desi.toLocaleDate = function (d) {
    return d.getFullYear() + '-' + Desi.pad(d.getMonth() + 1) + '-' + Desi.pad(d.getDate())
      + ' '
      + (d.getHours() % 12) + ':' + Desi.pad(d.getMinutes()) + ' ' + (d.getHours() - 12 >= 0 ? 'pm' : 'am')
      ;
  };

  Desi.fromLocaleDate = function (str) {
    // handles ISO and ISO-ish dates
    var m = str.match(/(\d\d\d\d)-(\d{1,2})-(\d{1,2})([T\s](\d{1,2}):(\d{1,2})(:(\d{1,2}))?)?/)
      , d = {}
      ;

    if (!m) {
      return [];
    }

    d.year   = m[1];
    d.month  = m[2];
    d.day    = m[3];

    d.hour   = m[4] = Desi.pad(m[5] || '00');  // hours
    d.minute = m[5] = Desi.pad(m[6] || '00');  // minutes
    d.second = m[6] = Desi.pad(m[8] || '00');  // seconds
 
    if (parseInt(m[4], 10) > 12) {
      d.twelve_hour = m[7] = m[4] - 12;   // 12-hour
      d.meridian    = m[8] = 'pm';        // am/pm
    } else {
      d.twelve_hour = m[7] = m[4]; 
      d.meridian    = m[8] = 'am';
    }

    // 0 -> 12
    if (!parseInt(d.twelve_hour, 10)) {
      d.twelve_hour = '12';
    }

    return d;
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
    Desi._initFileAdapter(env);

    if (!exports.window) {
      // TODO pull state out of this later
      Desi.realFsapi.create(Desi, env);
    }

    // config.yml, data.yml, site.yml, authors
    return PromiseA.all([
      Desi.fsapi.getAllConfigFiles()
    /*, fsapi.getBlogdir()*/
    ]).then(function (plop) {
      var arr = plop[0]
        //, blogdir = plop[1]
        ; 

      //desi.blogdir = blogdir;
      //desi.originals = {};
      //desi.copies = {};

      Object.keys(arr).forEach(function (key) {
        desi[key] = arr[key];
        //desi.originals[key] = arr[key];
        //desi.copies[key]    = clone(arr[key]);
        //desi[key]           = clone(arr[key]);
      });

      // TODO just walk all of ./*.yml authors, posts, themes, _root from the get-go
      desi.config.rootdir = desi.config.rootdir || '_root';
      // TODO create a config linter as a separate module
      /*
      if ('object' !== typeof desi.config.collections || !Object.keys(desi.config.collections).length) {
        desi.config.collections = { 'posts': {} };
      }
      if ('object' !== typeof desi.config.themes || !Object.keys(desi.config.themes).length) {
        desi.config.themes = { 'ruhoh-twitter': {} };
      }
      if ('object' !== typeof desi.config.assets || !Object.keys(desi.config.assets).length) {
        desi.config.assets = { 'media': {} };
      }

      if ('string' !== typeof desi.site.theme) {
        desi.site.theme = 'ruhoh-twitter';
      }
      */
      if (!Array.isArray(desi.site.navigation) || !desi.site.navigation.length) {
        desi.site.navigation = []; // ['archive'];
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
          , extensions: Object.keys(Desi._exts.themes)
          }
        )
      , Desi.fsapi.getMeta(
          [desi.config.rootdir]
        , { dotfiles: false
          , extensions: Object.keys(Desi._exts.collections)
          }
        )
      , Desi.fsapi.getMeta(
          collectionnames
        , { dotfiles: false
          , extensions: Object.keys(Desi._exts.collections)
          }
        )
      , Desi.fsapi.getMeta(
          assetnames
        , { dotfiles: false 
          //, extensions: Object.keys(Desi._exts.assets)
          }
        )
      , Desi.fsapi.getCache()
      ]);
    }).then(function (things) {

      function noErrors(map) {
        Object.keys(map).forEach(function (pathname) {
          map[pathname] = map[pathname].filter(function (metaf) {
            if (!metaf.relativePath) {
              metaf.relativePath = path.dirname(metaf.path);
              metaf.name = metaf.name || path.basename(metaf.path);
            }

            metaf.path = path.join(metaf.relativePath, metaf.name);

            
            if (metaf.error) {
              console.error("Couldn't read '" + metaf.path + "'");
              console.error(metaf.error);
              throw new Error(metaf.error);
              //return false;
            }

            if (!metaf.size) {
              console.error("Junk file (0 bytes) '" + metaf.path + "'");
              console.error(metaf.error);
              throw new Error(metaf.error);
              //return false;
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
        throw new Error('It seems that your root directory is missing');
      }

      /*
      if (!collections[Object.keys(collections)[0]].length) {
        console.error('Missing Collections!');
        throw new Error('It seems that your collections are missing');
      }
      */

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

  Desi.getDirtyFiles = function (desi, env) {
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

    return PromiseA.all([
      Object.keys(droot).length ? Desi.fsapi.getContents(Object.keys(droot)) : PromiseA.resolve([])
    , Object.keys(dfiles).length ? Desi.fsapi.getContents(Object.keys(dfiles)) : PromiseA.resolve([])
    , Object.keys(dthemes).length ? Desi.fsapi.getContents(Object.keys(dthemes)) : PromiseA.resolve([])
    ]).then(function (arr) {
      var result = { root: [], collections: [], themes: [] }
        ;

      function noErrors(collectionBase, arr, entity) {
        // FOO FOO FOO
        if (!entity.error) {
          if (!entity.relativePath) {
            entity.relativePath = path.dirname(entity.path);
            entity.name = entity.name || path.basename(entity.path);
          }

          entity.relativePath = entity.relativePath.replace(desi.config.rootdir, '').replace(/^\//, '');
          entity.path = path.join(entity.relativePath, entity.name);
          entity.ext = path.extname(entity.path);

          // TODO better collection detection
          if ('root' === collectionBase) {
            // TODO how to reconcile rootdir vs _root vs root?
            entity.collection = 'root';
            entity.collectionType = 'root';
            // desi.config.rootdir;
          }
          else if ('collections' === collectionBase) {
            entity.collection = entity.relativePath.split('/')[0];
            entity.collectionType = 'collections';
          }
          else if ('themes' === collectionBase) {
            entity.collection = entity.relativePath.split('/')[1];
            entity.collectionType = 'themes';
          }

          arr.push(entity);
          return PromiseA.resolve();
        }

        if (env.onError) {
          return env.onError(entity.error);
        } else {
          console.error("Couldn't get file contents for '" + entity.path + "'");
          console.error(entity.error);
          return PromiseA.reject(entity.error);
        }
      }

      return forEachAsync(arr[0], function (o) {
        return noErrors('root', result.root, o);
      }).then(function () {
        return forEachAsync(arr[1], function (o) {
          return noErrors('collections', result.collections, o);
        });
      }).then(function () {
        return forEachAsync(arr[2], function (o) {
          return noErrors('themes', result.themes, o);
        });
      }).then(function () {
        desi.content = result;

        return desi;
      });
    });
  };  

  Desi.copyAssets = function(desi, env) {
    var files = {}
      ;

    Object.keys(desi.meta.assets).forEach(function (key) {
      var assets = desi.meta.assets[key]
        ;

      assets.forEach(function (asset) {
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
          throw new Error(err);
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
    var alwaysAdd = true
      ;

    if (desi.site.navigation.length) {
      alwaysAdd = false;
    }

    // TODO add missing metadata and resave file
    desi.navigation = [];

    desi.content.root.forEach(function (entity) {
      // XXX BUG TODO strip only strip _root so that nested nav will work as expected
      var name = path.basename(entity.path, path.extname(entity.path))
        , nindex
        ;

      if (alwaysAdd && /^(_root\/)index(\.\w+)$/i.test(entity.path)) {
        return;
      }

      //if (-1 === desi.data.navigation.indexOf(name) && 'index' !== name)
      nindex = (desi.site.navigation).indexOf(name);
      if (!alwaysAdd && -1 === nindex) {
        return;
      } else {
        nindex = desi.navigation.length;
      }

      desi.navigation[nindex] = {
        title: entity.yml && entity.yml.title || Desi.firstCap(name)
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

  Desi.runTransforms = function (desi, env) {
    desi.permalinks = desi.permalinks || {};

    function makeTransformer(type) {
      return function (entity, i, entities) {
        var collection
          ;

        //console.log('entity.collection', entity.collection);
        if ('root' === type) {
          // TODO 'no magic', 'defaults in the app, not the lib'
          collection = { permalink: '/:filename/' };
        } else {
          collection = desi.config[type][entity.collection];
        }

        //console.log('type');
        //console.log(type);
        Desi._transformers[type].forEach(function (obj) {
          try {
            obj.transform(desi, env, collection, entity, i, entities);
          } catch(e) {
            console.error('[ERROR]');
            console.error("Transform " + obj.name + " failed on " + entity.path);
            console.error(e.message);
            throw e;
          }
        });
      };
    }

    desi.content.root.forEach(makeTransformer('root'));
    desi.content.collections.forEach(makeTransformer('collections'));

    return PromiseA.resolve(desi);
  };

  Desi._aggregations = [];
  Desi.registerAggregator = function (fn) {
    Desi._aggregations.push(fn);
  };
  Desi.runAggregations = function (desi, env/*, collectionname*/) {
    return forEachAsync(Desi._aggregations, function (fn) {
      return fn(desi, env);
    }).then(function () {
      return desi;
    });
  };

  Desi._datamaps = {};
  Desi.registerDataMapper = function (name, fn) {
    if (!Desi._datamaps[name]) {
      Desi._datamaps[name] = fn;
    } else {
      throw new Error("cannot add additional data mapper for '"
        + name + "' (there's already one assigned)");
    }
  };

  Desi._transformers = { root: [], collections: [], assets: [], themes: [] };
  Desi.registerTransform = function (name, fn, opts) {
    ['root', 'collections', 'themes', 'assets'].forEach(function (thingname) {
      if (!opts[thingname]) {
        return;
      }

      if (Desi._transformers[thingname].some(function (obj) {
        if (name === obj.name || fn === obj.transform) {
          return true;
        }
      })) {
        throw new Error("cannot add additional transformer for '"
          + name + "' (there's already one assigned)");
      }

      Desi._transformers[thingname].push({
        name: name
      , transform: fn
      , root: opts.root
      , assets: opts.assets
      , themes: opts.themes
      , collections: opts.collections
      });
    });
  };

  Desi._exts = { root: {}, collections: {}, assets: {}, themes: {} };

  Desi._renderers = { root: {}, collections: {}, assets: {}, themes: {} };
  Desi.registerRenderer = function(ext, fn, opts) {
    opts = opts || {};
    if (!('root' in opts)) {
      opts.root = true;
    }
    if (!('collections' in opts)) {
      opts.collections = true;
    }

    ext = ext.replace(/^\./, '');

    ['root', 'collections', 'themes', 'assets'].forEach(function (key) {
      if (!opts[key]) {
        return;
      }

      Desi._exts[key][ext] = true;

      if (!Desi._renderers[key][ext]) {
        Desi._renderers[key][ext] = [];
      }
      // LIFO
      Desi._renderers[key][ext].unshift(fn);
    });
  };
  Desi.render = function (ext, content, view) {
    var type = view.entity.collectionType
      ;

    ext = (ext||'').toLowerCase().replace(/^\./, '');

    if (Desi._renderers[type][ext] && Desi._renderers[type][ext].length) {
      return Desi._renderers[type][ext][0](content, view);
    }
    return PromiseA.reject(new Error("no '" + type + "' renderer registered for '." + ext + "'"));
  };

  function renderLayers(desi, env, view, entity) {
    var mustached = ''
      , layers
      ;

    // BUG XXX the entity doesn't get a datamap (though it probably doesn't need one)
    layers = getLayout(desi, entity.yml.theme, entity.yml.layout, [entity]);

    return forEachAsync(layers, function (current) {
      var body = (current.body || current.contents || '').trim()
        ;

      return Desi.render(current.ext, body, view).then(function (html) {
        // TODO organize datamap inheritence
        var datamap = Desi._datamaps[current.config && current.datamap]
              || Desi._datamaps[env.datamap] 
              || Desi._datamaps[entity.datamap]
              || Desi._datamaps['ruhoh@2.6']
          , newview
          ;

        view.contents = mustached;

        // shallowClone to prevent perfect object equality (and potential template caching)
        view.entity.original_base_path = view.entity.base_path;
        view.entity.home_path = view.entity.base_path + '/index.html';
        env.original_base_path = env.base_path;
        if (env.explicitIndexes) {
          view.entity.base_path = view.entity.base_path + '/index.html';
          env.base_path = env.base_path + '/index.html';
        }
        newview = datamap(view);
        env.base_path = env.original_base_path;
        view.entity.base_path = view.entity.original_base_path;
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

    if (/dropbox/.test(env.base_url)) {
      env.explicitIndexes = true;
    }

    /*
    function compileScriptEntity(entity, i, arr) {
    }
    */
    function compileThemeEntity(entity, i, arr) {
      console.info("[themes] compiling " + (i + 1) + "/" + arr.length + " " + entity.path);
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
      console.info("compiling " + (i + 1) + "/" + arr.length + " " + entity.path);

      var navigation = JSON.parse(JSON.stringify(desi.navigation))
        , author = desi.authors[entity.yml.author] || desi.authors[Object.keys(desi.authors)[0]]
        , view
        , themename = entity.yml.theme || desi.site.theme
        ;

      if (!author) {
        console.error("\n\n\n");
        console.error("You don't have any files in authors/*.yml");
        console.error("Please create authors/your-name.yml and fill it out");
        console.error("For example:");
        console.error("\n");
        console.error("name: John Doe");
        console.error("bio: One cool dude.");
        console.error("email: john.doe@email.com");
        console.error("website: http://john.example.com");
        console.error("facebook: http://fb.com/john.doe");
        console.error("\n\n\n");
        throw new Error("author file not found");
      }

      // TODO nested names?
      navigation.forEach(function (nav) {
        nav.href = path.join(env.base_path, nav.name);
        nav.path = path.join(env.base_path, nav.name);

        // path.basename(nav.path, path.extname(nav.path))
        //console.log('!!! entity', entity);
        if (nav.href.replace(/(\/)?(\/index)?(\.html)?$/i, '')
            === entity.relative_url.replace(/(\/)?(\/index)?(\.html)?$/i, '')) {
          nav.active = true;
        }
        if (env.explicitIndexes) {
          nav.href = nav.href + '/index.html';
          nav.path = nav.path + '/index.html';
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
      , author: Desi.num2str(author)
      };

      desi.allStyles = desi.styles;
      desi.styles = desi.styles.filter(function (str) {
        // TODO better matching
        return str.match('/' + themename + '/');
      });

      return renderLayers(desi, env, view, entity).then(function (html) {
        desi.styles = desi.allStyles;
        // NOTE: by now, all permalinks should be in the format
        // /path/to/page.html or /path/to/page/index.html
        if (/^(index)?(\/?index.html)?$/.test(entity.permalink)) {
          console.info("[index] compiling " + (entity.path || entity.name));
          compiled.push({ contents: html, path: path.join('index.html') });
        } else {
          console.info("[non-index] compiling " + entity.path, entity.relative_file);
          compiled.push({ contents: html, path: path.join(entity.relative_file) });
        }

        entity.yml.redirects = entity.yml.redirects || [];

        if (/\/index.html$/.test(entity.permalink)) {
          entity.yml.redirects.push(entity.permalink.replace(/\/index.html$/, '.html'));
        } else if (/\.html$/.test(entity.permalink)) {
          entity.yml.redirects.push(entity.permalink.replace(/\.html?$/, '/index.html'));
        } else {
          // found index, ignoring redirect
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
    return Desi.getDirtyFiles(desi, env)
      .then(Desi.parseFrontmatter)
      .then(Desi.getNav)
      .then(function () {
        return Desi.runTransforms(desi, env);
      })
      .then(function () {
        return Desi.runAggregations(desi, env);
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
      return;
    }

    compiled.forEach(function (thing) {
      thing.path = path.join(env.compiled_path, thing.path);
    });

    // because some servers / proxies are terrible at handling large uploads (>= 100k)
    // (vagrant? or express? one of the two is CRAZY slow)
    while (compiled.length) {
      batches.push(compiled.splice(0, 500));
    }

    now = Date.now();
    return forEachAsync(batches, function (files) {
      return Desi.fsapi.putFiles(files).then(function (saved) {
        // TODO reduce from files
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
      });
    }).then(function () {
      return {
        numFiles: desi.compiled.length
      , size: size
      , start: now
      , end: Date.now()
      };
    });
  };

  exports.Desirae = Desi.Desirae = Desi;
}('undefined' !== typeof exports && exports || window));
