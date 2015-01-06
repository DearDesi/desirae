;(function (exports) {
  'use strict';

  exports.verifyConfig = function (conf) {
    if (!conf.NuhohSpec) {
      throw new Error("missing key NuhohSpec");
    }

    if (!conf.production) {
      throw new Error("missing key production");
    }

    if (!conf.production.canonical_url) {
      throw new Error("missing key production.canonical_url");
    }

    if (!conf.production.base_path) {
      throw new Error("missing key production.base_path");
    }

    if (!conf.development) {
      throw new Error("missing key development");
    }

    if (!conf.development.compiled_path) {
      throw new Error("missing key development.compiled_path");
    }

    if (!Array.isArray(conf.collections)) {
      if (conf.posts) {
        console.error("Please indent and nest 'posts' under the key 'collection' to continue");
      }
      throw new Error("missing key 'collections'.");
    }

    if (!conf.themes) {
      if (conf.twitter) {
        console.error("Please indent and nest 'twitter' under the key 'themes' to continue");
      }
      throw new Error("missing key 'themes'");
    }

    if (!conf.themes.default) {
      if (conf.twitter) {
        console.error("Please set themes.default to 'twitter'");
      }
      throw new Error("missing key 'themes.default'");
    }

    if (!conf.root) {
      throw new Error("missing key root");
    }

    if (!conf.widgets) {
      throw new Error("missing key root");
    }
  };
}('undefined' !== typeof exports && exports || window));
