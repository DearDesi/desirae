Migrating from Ruhoh
====================

There are only a few things in Ruhoh that could only be done in ruby or were otherwise difficult to work around.

config.yml
----------

Instead of having special names for some properties (`_root`)
and `use` sub attributes for others (`twitter` theme, posts directory),
I opted to move related stuff together.

```
RuhohSpec 2.6 -> NuhohSpec 3.0

production_url -> production.canonical_url, development.canonical_url
base_path -> production.base_path, development.base_path
compiled_path -> development.compiled_path

twitter -> themes.twitter
twitter.use = theme -> themes.default = twitter

_root -> root

posts -> collections.posts

asset_pipeline [REMOVED (ruby only)]

widgets [NO CHANGE]
```

All directories are ignored by default. If you want a directory to be interpreted as a collection of pages you need to specify it in the `collections` hash.

data.yml
--------

No changes


config.ru
---------

REMOVED (ruby only)

themes layout
-------------

TODO

`twitter/default.html` has stuff like `{{# data.navigation?to__root }}{{> page_list }}{{/ data.navigation?to__root }}`
that appears to be ruby-only syntax that will need to be changed.
