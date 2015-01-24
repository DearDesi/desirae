Glossary
========

Canonical URL
--------
base\_url + base\_path + permalink

Base URL
----

base\_url is the point of ownership

In most cases that would be https://johndoe.com

In some cases that might be https://school.edu/~/johndoe

It does NOT include a trailing /

Base Path
-----

base\_path is the blog directory

In most cases that would be / or /blog/

It DOES include BOTH a LEADING and TRAILING slash.

In the case of https://school.edu/~/johndoe/weblog, the base\_path would  be /weblog/.

Permalink
------

The permalink is the permanent part of the URL, after the path to the blog.

For example:

  * http://blog.johndoe.com/articles/first-post.html the permalink is articles/first-post.html
  * http://johndoe.com/blog/articles/first-post.html the permalink is still articles/first-post.html
  * http://school.edu/~/johndoe/blog/articles/first-post.html the permalink is yet still articles/first-post.html

The permalink is ALWAYS RELATIVE (no leading slash)

It is designed so that if you ever move your blog from one domain, point of ownership, or path to a new one,
a very simple one-line redirect can be made to your webserver and all of the posts will end up in the right place
once again.

base\_url  the
permalink refers to 
