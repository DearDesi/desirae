Did you mean DearDesi?
======================

If you're looking for [DearDesi](http://dear.desi), the DIY blog platform for normal people
you should go to <http://dear.desi>.

Desirae (this repo) is the code that programmers to use to make DearDesi better
for everyone and to make Desirae-compatible blog platforms. (it's blog-ception!)

Desirae (v0.9)
=======

Desirae is a static webpage compiler written in JavaScript.

It can run entirely in the browser
(with a little help from a minimal just to serve to read and save files).

It can also run entirely from the commandline (with io.js / node.js).

**Features:**

  * `JavaScript` - it's so stable it takes 10 years to get new any features.
    * Won't break every time you upgrade OS X and reinstall `brew` (*cough* ruby)
  * Decent use of `try { ... } catch(e) ...` and `promise.catch()`
    * the idea is that it shouldn't blow up at the slightest parse error without telling you which page is to blame (*cough* ruhoh *cough* jekyll)... bless me
  * Browser (optional)
    * using your front-end templates to build in your front-end? Imagine that!
  * io.js (node.js) (optional)
    * if you'd prefer to go headless, you can.
  * The server is *very* minimal and could easily be implemented in any language (such as ruby or python).

Installation
============

```bash
bower install --save desirae

npm install --save desirae
```

Why
===

Because I hate ruby.

Well, I don't hate it, but it hates me. Or at least it moves too fast and has
too many breaking changes between updates.

Anyway, I had to drop [ruhoh](http://ruhoh.com) because I made a new year's resolution to blog
more (last year I made dozens of gists and 0 blog posts) and I just couldn't get the right ruby
versions and gems and whatnot... so I gave up and wrote my own (because I needed something
compatible with ruhoh).

Usage Overview
==============

### Before we get started

(disclaimers)

**Browser**: The default fs adapter will request the config files from `/api/fs/`. 

**Node**: Remember that desirae is built browser-first, and optimized to reduce the number of round-trips
(in case someone actually desides to host a Desi service, y'know?), so... the node adapter is built with
the server in mind. If you can't respect that, don't look at the code. :-)

**NOTE**: The mixing of `snake_case` with `camelCase` is somewhat intentional.
It's an artifact of this project being born out of the ashes of my
[ruhoh](http://ruhoh.com/) blog, which is built in ruby and uses YAML.

### Getting Started

First off you need to have a browser and io.js/node.js compatible IIFE and declare a state object that will be used in every *desirae* action.

```javascript
/*jshint -W054 */
;(function (exports) {
  'use strict';
 
  var DesiraeMyModule = {}
    , desi = {}
    ;

  // ... a bunch of code ...

  DesiraeMyModule.doStuff = doStuff;

  exports.DesiraeMyModule = DesiraeMyModule.DesiraeMyModule = DesiraeMyModule;
}('undefined' !== typeof exports && exports || window));

;(function () {})
```

After that you'll load any plugins you need.

```javascript
Desi.registerDataMapper('ruhoh', window.DesiraeDatamapRuhoh || require('desirae-datamap-ruhoh').DesiraeDatamapRuhoh);
```

And then you'll initialize Desirae with an *environment*.

```javascript
Desirae.init(
  desi
, { url:                'https://johndoe.exmaple.com/blog'
  , base_url:           'https://johndoe.exmaple.com'
  , base_path:          '/blog'
  , compiled_path:      'compiled_dev'

                        // default: continue when possible
  , onError:            function (e) {
                          return Promise.reject(e);
                        }

                        // io.js / node.js only
  , working_path:       './path/to/blog'
  }
).then(function () {
  console.log('Desirae is initialized');
});
```

Using the paths specified in the environment it will read the appropriate
`config.yml`, `site.yml`, and `authors/*.yml` files to initialize itself.

Then you can specify to build the static blog. You'll need to pass the environment again.

```
Desirae.buildAll(desi, env).then(function () {
  console.log('Desirae built your blog!');
});
```

Finally, you save the built out to disk.

```
Desirae.write(desi, env).then(function () {
  console.log('Desirae pushd all files to the appropriate fs adapter!');
});
```

And be mindful that your code needs to run in both iojs/node and browser environments,
so steer away from things that are super iojs/node-ish or super window-ish.

Configuration
=============

There are a few configuration files:

* `site.yml` is stuff that might be unique to your site, such as (title, url, adwords id, etc)
* `authors/<<your-handle.yml>>` contains information about you (name, handle, facebook, etc)
* `config.yml` contains directives that describe *how* the blog should be compiled - more technical stuff.

If any of these files change, the entire site needs to be retemplated.

API
===

I'd like to make the plugin system connect-style API for adding plugins or whatever so that,
for example, so you could have a custom markdown preprocessor (that handles includes, perhaps)
and still pass the string along to the 'real' markdown parser afterwards.

But here's what I've got so far:

## Rendering Engines

### (html, markdown, jade)

* `Desirae.registerRenderer(ext, fn)`

For example, if you want to add the ability to render from `slim` or `haml`
instead of just `markdown` you could find the appropriate
JavaScript module (or make requests to an API service that renders them for you) and do this

```javascript
var slim = exports.slimjs || require('slimjs')
  ;

function render(contentstr/*, desi*/) {
  return PromiseA.resolve(slim(contentstr));
}

Desirae.registerRenderer('.slim', render);
```

## Data Mapping

### (desirae, ruhoh, etc)

* `Desirae.registerDataMapper(ext, fn)`

If you want to use a non-desirae theme that uses attributes in a different than
how Desirae creates the view object internally
(i.e. it wants `{{ page.name }}` instead of `{{ entity.title }}`), you can use a
data mapper to accomplish this.

Please try not to modify the original object if you can avoid it.

*TODO: maybe pass in a two-level deep shallow copy ?*

```javascript
Desirae.registerDataMapper('ruhoh@3.0', function (view) {
  return {
    page: {
      name: view.entity.title
    }
  , author: {
      nickname: view.author.twitter
    }
    // ... 
  };
});
```

The default datamapper is `ruhoh@2.6`

(note that that might be misnamed, I'm a little confused as to how Ruhoh's template versions correspond
to Ruhoh proper versions).

## Adapters

### (fs, http, dropbox)

I'd love to work with anyone who is familiar with the Dropbox or similar APIs.

I think it would be awesome to support various means of storage. Perhaps github gists too.


Server
======

Obviously there has to be a server with some sort of storage and retrieval mechanism.

I've implemented a very simple node server using the filesystem.

GET /api/fs/walk
------------

`GET http://local.dear.desi:8080/api/fs/walk?dir=posts&dotfiles=true&extensions=md,markdown,jade,htm,html`

* `dir` **must** be supplied. returns a flat list of all files, recursively
* `dotfiles` default to `false`. includes dotfiles when `true`.
* `extensions` defaults to `null`. inclode **only** the supplied extensions when `true`.

```json
[
  { "name": "happy-new-year.md"
  , "createdDate": "2015-01-05T18:19:30.000Z"
  , "lastModifiedDate": "2015-01-05T18:19:30.000Z"
  , "size": 2121
  , "relativePath": "posts/2015"
  }

, { "name": "tips-for-the-ages.jade"
  , "createdDate": "2014-06-16T18:19:30.000Z"
  , "lastModifiedDate": "2014-06-16T18:19:30.000Z"
  , "size": 389
  , "relativePath": "posts"
  }
, { "name": "my-first-post.html"
  , "createdDate": "2013-08-01T22:47:37.000Z"
  , "lastModifiedDate": "2013-08-01T22:47:37.000Z"
  , "size": 4118
  , "relativePath": "posts/2013"
  }
]
```

To retrieve multiple dir listings at once:

* for a few simple dirs without special chars just change `dir` to `dirs` and separate with commas

`GET http://local.dear.desi:8080/api/fs/walk?dirs=posts/2015,posts/2013&dotfiles=true&extensions=md,markdown,jade,htm,html`

* for many dirs, or dirs with special chars, `POST` an object containing an array of `dirs` with  `&_method=GET` appended to the url.

```
POST http://local.dear.desi:8080/api/fs/walk?dotfiles=true&extensions=md,markdown,jade,htm,html&_method=GET

{ "dirs": [ "old", "2013,12", "2013,11" ] }
```

```javascript
{
  "posts/2015": [ { "name": ... }, { ... } ]
, "posts/2013": [ ... ]
}
```

GET /api/fs/files
-------------

`GET http://local.dear.desi:8080/api/fs/files?path=posts/happy-new-year.md`

```json
{ "path": "posts/intro-to-http-with-netcat-node-connect.md"
, "createdDate": "2013-08-01T22:47:37.000Z"
, "lastModifiedDate": "2013-08-01T22:47:37.000Z"
, "contents": "..."
, "sha1": "6eae3a5b062c6d0d79f070c26e6d62486b40cb46"
}
```

To retrieve multiple files at once:

* for a few simple files without special chars just change `path` to `paths` and separate with commas

`GET http://local.dear.desi:8080/api/fs/files?paths=posts/foo.md,posts/bar.md`

* for many files, or files with special chars, `POST` an object containing an array of `pathss` with  `&_method=GET` appended to the url.

```
POST http://local.dear.desi:8080/api/fs/files?dotfiles=true&extensions=md,markdown,jade,htm,html&_method=GET

{ "paths": [ "posts/foo.md", "posts/2013,11,30.md" ] }
```

```json
[
  { "path": "posts/foo.md"
  , "lastModifiedDate": "2013-08-01T22:47:37.000Z"
  , "contents": "..."
  , "sha1": "6eae3a5b062c6d0d79f070c26e6d62486b40cb46"
  }
, ...
]
```

POST /api/fs/files
------------------

By default this should assume that you intended to write to the compiled directory
and return an error if you try to write to any other directory, unless `compiled=false` (not yet implemented).

`_method=PUT` is just for funzies.

Including `sha1` is optional, but recommended.

`lastModifiedDate` is optional and may or may not make any difference.

`strict` (not yet implemented) fail immediately and completely on any error

```json
POST http://local.dear.desi:8080/api/fs/files?compiled=true&_method=PUT

{
  "files": [
    { "path": "posts/foo.md"
    , "name": "foo.md"
    , "relativePath": "posts"
    , "createdDate": "2013-08-01T22:47:37.000Z"
    , "lastModifiedDate": "2013-08-01T22:47:37.000Z"
    , "contents": "..."
    , "sha1": "6eae3a5b062c6d0d79f070c26e6d62486b40cb46"
    , "delete": false
    }
  , ...
  ]
}
```

The response may include errors of all shapes and sizes.

```json
{ "error": { message: "any top-level error", ... }
, "errors": [
    { "type": "file|directory"
    , "message": "maybe couldn't create the directory, but maybe still wrote the file. Maybe not"
    }
  , ...
  ]
}
```

POST /api/fs/copy
------------------

```json
{ files: { "assets/logo.png": "compiled/assets/logo.png" } }
```
