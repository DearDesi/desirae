Data
====

Every template gets an object with the exact same structure - whether it's a template or a widget or a page or a post.

Here we only document Desirae's default behavior, but there are many objects added for compatibility with Ruhoh that are not documented.

```
desi = {}
```

desi
====

* `config` - literally `config.yml`, parsed
* `site` - literally `site.yml`, parsed
* `authors` - literally the authors from `authors/*.yml`, parsed
* `author` - the primary author of the site
* `env` - urls and paths for this build (be it production, development, staging, etc)
* `content` - pre-rendered content (i.e. content rendered into the post layout rendered into the default layout)
* `collection` - config related to this collection
* `entity` - the page, post, article, etc that is the focus of the present template process
* `themes` - all themes
* `theme` - the default theme
* `layout` - the selected layout for this theme
* `satch` - the selected swatch for this theme
* `categories` - all categories
* `tags` - all tags
* `styles` - ??? goes into the final template in the head
* `scripts` - ?? that goes into the final template just before the body close

desi.entity
===========

stuff

* `uuid`
* `title`
* `disqus_url`
* `disqus_identifier`

more stuff

* `type` - `post`, `page`, etc
* `authors` - literally the relevant authors from `authors/*.yml`, parsed
* `author` - the primary author of this entity
* `theme` - null or a non-default theme
* `layout` - null or a non-default layout for this theme
* `swatch` - null or a non-default swatch for this theme
* `categories`: []    // *all* categories in all collections
* `tags`: []    // *all* categories in all collections
* `production_canonical_url` the PRODUCTION canonical_url for this entity
* `production_url` the PRODUCTION url for this entity
* `production_path` the PRODUCTION path for this entity
* `url` the full url in the current environment (might be production, development, etc)
* `path` the non-host part (i.e. `/compiled_dev/articles/my-first-post.html`)
* `previous` the previous entity in this collection
* `next` the next entitiy in this collection

NOTE: Plugins, widgets, etc SHOULD NOT modify config, site, authors, author, or env.

desi.posts
==========

      , posts: { collated: desi.collated }

desi.config
===========

desi.site
===========

desi.env
===========
