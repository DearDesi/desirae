format should change permalink
date
show file path
show prod url
show dev url


POST tests
create a title and delete it (no error)
change the format. does the permalink change? (yes)
change the permalink. change the title. does the permalink stay? (yes)

change the format. does the permalink change? (yes)
change the format in the frontmatter permalink. does the format change? (yes)

create a description and delete it (no error)
create a description. does the frontmatter change? (yes)


protection
Don't allow changing the uuid, original_url, or original_date

TODO
---

check that no other post uses the same permalink



default data-model 'ruhoh@2.2'
other data-model 'desirae@1.0'

Widgets
=======

All widgets should export an object with a `create(widgetConf, desiState)` function that returns a promise.

```yaml
widgets:
  foogizmo:
    # only stuff that is intensely specific to foogizmo goes here
    # stuff like google ad and disqus ids should go in config.yml or data.yml
    config:
      foobeep: boop
      
    handle:
      - html
      - markdown
    handlers:
      post: fooposter
      page: foopager
```

```javascript
'use strict';

module.exports.Foogizmo.create = function (foogizmoConf, desiState) {
  return new Promise(function (resolve) {

    function pager(desiPageState) {
      // Do processing

      return Promise.resolve();
    }

    function poster(desiPostState) {
      // Do processing

      desiPostState.fooembedinator = function (fooval) {
        // figure out what type of link fooval is and return iframe html
        return '<iframe src="http://embedinator.com/"' + foovalProcessed + '></iframe>'
      }
    }

    resolve({ foopager: pager, fooposter: poster });
  });
}
```

Overlays
--------

For any config a widget uses, it should also check on post.fooconfig and theme.fooconfig to make sure that they don't override the foogizmo.config.fooconfig


