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
    , getStats      = exports.getStats      || require('./lib/deardesi-node').getStats
    , getContents   = exports.getContents   || require('./lib/deardesi-node').getContents
    ;

  function getCollections(blogbase, ignorable, collectionnames) {
    var collectiondir
      , collectiondirs = []
      , lost = []
      , found = []
      , errors = []
      ;


    collectionnames.forEach(function (collectionname) {
      collectiondir = safeResolve(_dirname, collectionname);

      if (!collectiondir) {
        return PromiseA.reject(new Error("Please update your config.yml: " + collectionname + " is outside of '" + _dirname + "'"));
      }

      collectiondirs.push({ name: collectionname, path: collectiondir });
    });


    return getFolders(collectiondirs, { recursive: true, limit: 5, stats: true }).then(function (stats) {
      collectiondirs.forEach(function (collection) {
        if (!stats[collection.path]) {
          errors.push({
            collection: collection
          , message: "server did not return success or error for " + collection.path + ':\n' + JSON.stringify(stats)
          });
        }
        else if (!stats[collection.path].type) {
          lost.push(collection);
        }
        else if ('directory' !== stats[collection.path].type) {
          errors.push({
            collection: collection
          , message: collection.path + " is not a directory (might be a symbolic link)"
          });
        } else {
          found.push(collection);
        }
      });

      return {
        lost: lost
      , found: found
      , errors: errors
      };
    });
  }

  function showCollectionNotes(notes) {
    if (notes.lost.length) {
      console.warn("WARNING: these collections you specified couldn't be found");
      notes.lost.forEach(function (node) {
        console.warn('? ' + node.name);
      });
      console.log('');
    }

    if (notes.found.length) {
      console.log("Will compile these collections");
      notes.found.forEach(function (node) {
        console.log('+ ' + node.name);
      });
      console.log('');
    }
  }

  function getLayouts() {
    // TODO
  }

  function updatePage(pagedir, node, lstat, data) {
    var parts = frontmatter.parse(data)
      , meta
      , html
      , view
      ;

    if (!parts.yml) {
      console.error("Could not parse frontmatter for " + node);
      console.error(parts.frontmatter);
      return;
    }

    if (/\.(html|htm)$/.test(node)) {
      html = parts.body.trim();
    } else if (/\.(md|markdown|mdown|mkdn|mkd|mdwn|mdtxt|mdtext)$/.test(node)) {
      console.log('parsing markdown...');
      html = marked(parts.body.trim());
    } else {
      console.error('unknown parser for ' + node);
    }

    meta = {
      mtime: lstat.mtime
    , ymlsum: sha1sum(parts.frontmatter.trim())
    , textsum: sha1sum(parts.body.trim())
    , htmlsum: sha1sum(html)
    , filesum: sha1sum(data)
    , filename: node
    , filepath: pagedir
    };

    /*
    // TODO
    db.getCached(meta).error(function () {
      // TODO rebuild and save
    });
    */

    // TODO meta.layout
    view = {
      page: parts.yml
    , content: html
    };

    console.log(node);
    console.log(parts.frontmatter);
    console.log(parts.yml); //Mustache.render(pagetpl, view));
    //console.log(meta.mtime.valueOf(), meta.ymlsum, meta.textsum, node);

    return meta;
  }

  function templatePosts() {
    var pagetpl
      , defaulttpl
      ;

    // TODO declare path to theme
    pagetpl = frontmatter.parse(fs.readFileSync(path.join(config.theme, 'layouts', 'page.html'), 'utf8'));
    defaulttpl = frontmatter.parse(fs.readFileSync(path.join(config.theme, 'layouts', 'default.html'), 'utf8'));


  }

  function getCollection() {
  }

  console.log('');
  console.log('');
  console.log('loading caches...');

  getMetaCache().then(function (db) {
    console.log('last update: ' + (db.lastUpdate && new Date(db.lastUpdate) || 'never'));

    console.log('checking for local updates...');


    // TODO get layouts here
    return getCollections('.', Object.keys(config.collections)).then(function (notes) {
      showCollectionNotes(notes);

      return notes.found;
    }).then(function (found) {
      var metas = []
        ;

      return forEachAsync(found, function (collection) {
        begintime = Date.now();
        console.log('begin', ((begintime - starttime) / 1000).toFixed(4));

        return fs.readdirAsync(collection.path).then(function (nodes) {

          // TODO look for companion yml file aside html|md|jade
          nodes = nodes.filter(function (node) {
            // TODO have handlers accept or reject extensions in the order they are registered
            if (!/\.(htm|html|md|markdown|mdown|mkdn|mkd|jade)$/.test(node)) {
              console.warn("ignoring " + collection.name + '/' + node + " (unknown filetype processor)");
              return false;
            }

            return true;
          });

          return forEachAsync(nodes, function (pagename) {
            var pagepath = path.join(collection.path, pagename)
              ;

            // TODO: support walking deep
            // TODO: test .html, .md, etc
            return fs.lstatAsync(pagepath).then(function (lstat) {
              // no funny business allowed
              if (!lstat.isFile()) {
                return;
              }

              return fs.readFileAsync(nodepath, 'utf8').then(function (data) {
                updatePage(pagedir, node, lstat, data);
              });
            });
          });
        }).then(function () {
          console.log('doneish', ((Date.now() - begintime) / 1000).toFixed(4));
        });
      });
    });
  });
}('undefined' !== typeof exports && exports || window));
