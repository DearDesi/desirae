Desirae
=====

(in development)

A blog platform built for Developers, but with normal people in mind.

Desirae runs entirely in the browser, but needs a little help from Node.js for saving and retrieving files.

She can also be run from entirely headless from node.js.

Key Features
------------

Really good use of `try { ... } catch(e) ...` - it won't all blow up at the slightest parse error (*cough* ruhoh *cough* jekyll)... bless me.

JavaScript - it's so stable it takes 10 years to get new any features. Won't break every time you upgrade OS X and reinstall brew (*cough* ruby).

Browser (optional) - using your front-end templates to build in your front-end? Imagine that!

Node (optional) - if you'd prefer to go headless, you can.

The server is *very* minimal and could easily be implemented in any language (such as ruby or python).


Configuration
=============

There are a few configuration files:

* `site.yml` is stuff that might be unique to your site, such as (title, url, adwords id, etc)
* `authors/<<your-handle.yml>>` contains information about you (name, handle, facebook, etc)
* `desirae.yml` contains directives that describe *how* the blog should be compiled - more technical stuff.

If any of these files change, the entire site needs to be retemplated.


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


TODO
----

**TODO** Allow rename and delete?

option for client write to a hidden `.desi-revisions` (as well as indexeddb)
to safeguard against accidental blow-ups for people who aren't using git.
