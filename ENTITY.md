This is what an entity looks like:

```yml
# inherited from File Entity
path              : My Posts/My-Old-Name.html
lastModifiedDate  : 2015-07-04T13:56:01Z
createdDate       : 2015-07-04T13:56:01Z
contents          : '...'           # whatever the file is

# inherited from Collection Entity
name              : My-Old-Name.html
relativePath      : My Posts
ext               : .html
collection        : posts

# inherited from Content Entity
frontmatter       : '---\n...\n---' # frontmatter as a string
yml               : {}              # frontmatter, parsed
body              : 'I think ...'   # body, after frontmatter

# inherited from Normalized Entity
title             : My Title        # yml.title | titlize(entity.name)
slug              : my-title        # slugify(title)
slug_path         : my-posts        # slugifyPath(relativePath)

year              : 2014
month             : 07
day               : 04
hour              : 13
twelve_hour       : 1
meridian          : pm
minute            : 22

categories        : ['tech']
tags              : ['http','url','website']

                    # includes index.html
relative_file     : /posts/foo/index.html

                    # excludes index.html
relative_link     : /posts/foo/

                    # actual url of this file, even if redirect
                    # excludes index.html
url               : http://dev.example.com/posts/foo/

                    # the appropriate url, even in a redirect or duplicate
                    # excludes index.html
canonical_url     : http://dev.example.com/posts/foo/

                    # production url, even in development (for disqus, etc)
                    # excludes index.html
production_url    : http://example.com/posts/foo/
```

Note: The option `env.explicitIndexes` turns on `/index.html`. This option is automatically turned on when Dropbox is the host.

TODO
----

* path relative from / in the browser
* path relative from base_path on the file system
