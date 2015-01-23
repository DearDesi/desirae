/*jshint -W054 */
;(function (exports) {
  'use strict';

  var cores = {}
    , Desi = exports.Desirae || require('desirae').Desirae
    , path          = exports.path          || require('path')
    ;

  cores.lint = function (desi, env, collection, entity) {
    // TODO splice
    //desi.content.collections = desi.content.collections.filter(function (entity) {
      // TODO throw for any files that don't have a registered renderer
      if (!entity.yml) {
        if (!desi.config.empty_frontmatter) {
          throw new Error("no frontmatter for " + (entity.path || entity.name) + "."
            + "Set `config.yml.empty_frontmatter: include|skip` to ignore this error."
          );
        }

        if ('include' === desi.config.empty_frontmatter) {
          entity.yml = {};
        }
        else if ('skip' === desi.config.empty_frontmatter) {
          return false;
        }
        else {
          throw new Error('unrecognize option ' + desi.config.empty_frontmatter + 
            ' for `config.yml.empty_frontmatter: include|skip`.');
        }
      }

      if (!entity.body || !entity.body.trim()) {
        if (!desi.config.empty_body) {
          throw new Error('empty content file ' + (entity.path || entity.name)
            + '. Set `config.yml.empty_body: include|skip` to ignore this error.'
          );
        }

        if ('include' === desi.config.empty_body) {
          entity.body = '';
        }
        else if ('skip' === desi.config.empty_body) {
          return false;
        }
        else {
          throw new Error('unrecognize option ' + desi.config.empty_frontmatter + 
            ' for `config.yml.empty_body: include|skip`.');
        }
      }

      return true;
    //});
  };

  cores.root = function (desi, env, collection, entity) {
    entity.yml = entity.yml || {};

    entity.layout = entity.yml.layout || '__page__';

    // _root is not subject to the same permalink rules as collections,
    // so we just go ahead and define that here
    entity.permalink = entity.yml.permalink || entity.path.replace(/\.\w+$/, '');
  };

  cores.normalize = function (desi, env, collection, entity) {
    entity.title          = entity.yml.title || Desi.firstCap(entity.name.replace(/\.\w+$/, ''));
    entity.date           = entity.yml.date;

    if (!entity.date) {
      // TODO tell YAML parser to keep the date a string
      entity.date = new Date(entity.yml.created_at
        || entity.yml.time
        || entity.yml.updated_at
        || entity.createdDate
        || entity.lastModifiedDate
      ).toISOString();
    }
    if ('object' === typeof entity.date) {
      entity.date = entity.date.toISOString();
    }

    entity.updated_at     = entity.yml.updated_at || entity.lastModifiedDate;

    entity.published_at   = Desi.fromLocaleDate(entity.date || entity.lastModifiedDate);
    entity.year           = entity.published_at.year;
    entity.month          = entity.published_at.month;
    entity.day            = entity.published_at.day;
    entity.hour           = entity.published_at.hour;
    entity.twelve_hour    = entity.published_at.twelve_hour;
    entity.meridian       = entity.published_at.meridian;
    entity.minute         = entity.published_at.minute;
    // let's just agree that that's too far
    //entity.second = entity.published_at.second;

    entity.slug           = Desi.slugify(entity.title);
    entity.slug_path      = Desi.slugifyPath(entity.relativePath);
    entity.slugPath       = Desi.slugifyPath(entity.relativePath);

    // categories
    if (Array.isArray(entity.yml.categories)) {
      entity.categories   = entity.yml.categories;
    }
    else if ('string' === typeof entity.yml.categories) {
      entity.categories   = [entity.yml.categories];
    }
    else if ('string' === typeof entity.yml.category) {
      entity.categories   = [entity.yml.category];
    }
    else {
      entity.categories   = [];
    }

    // tags
    if (Array.isArray(entity.yml.tags)) {
      entity.tags         = entity.yml.tags;
    }
    else if ('string' === typeof entity.yml.tags) {
      entity.tags         = [entity.yml.tags];
    }
    else {
      entity.tags         = [];
    }

    entity.permalink      = entity.permalink || entity.yml.permalink;

    if (!entity.permalink) {
      // try the fallback_permalink first (because we're looking at files that don't have yml)
      // then try the normal permalink (because :filename -> :title and whatnot, so it'll work)
      Desi.permalinkify(desi, collection.fallback_permalink || collection.permalink, entity);
    }
      
    /*
    if (!/\.x?html?$/.test(entity.permalink)) {
      entity.htmllink = path.join(entity.permalink, 'index.html');
    }
    */

    // The root index is the one exception
    if (/^(index)?\/?index(\.x?html?)?$/.test(entity.permalink)) {
      entity.permalink = '';
    }

    // relative to the site
    entity.relative_file  = path.join(env.base_path, entity.permalink)
                              .replace(/\/$/, '/index.html');
    entity.relative_href  = path.join(env.base_path, entity.permalink)
                              .replace(/\/index\.html$/, '/');

    entity.url            = env.base_url + path.join(env.base_path, entity.permalink)
                              .replace(/\/index\.html$/, '/');
    entity.canonical_url  = env.base_url + path.join(env.base_path, entity.permalink)
                              .replace(/\/index\.html$/, '/');
    entity.production_url = desi.site.base_url + path.join(desi.site.base_path, entity.permalink)
                              .replace(/\/index\.html$/, '/');
    entity.relative_url   = path.join(env.base_path, entity.permalink)
                              .replace(/\/index\.html$/, '/');

    if (env.explicitIndexes || env.explicitIndices || env.explicit_indexes || env.explicit_indices) {
      // NOTE: file_url is NOT replaced
      ['url', 'canonical_url', 'production_url', 'relative_url'].forEach(function (url) {
        entity[url] = entity[url].replace(/\/$/, '/index.html');
      });
    }
  };

  cores.disqus = function (desi, env, collection, entity) {
    var yml = entity.yml
      ;

    if (yml.uuid) {
      entity.disqus_identifier = yml.uuid;
    }
    entity.disqus_url = entity.production_url;
  };

  exports.DesiraeTransformCore = cores.DesiraeTransformCore = cores;
}('undefined' !== typeof exports && exports || window));
