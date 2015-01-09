curl 'http://local.dear.desi:8080/api/fs/files?compiled=true&_method=PUT' \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{
        "files": [
          { "path": "posts/foo.md"
          , "name": "foo.md"
          , "relativePath": "posts"
          , "lastModifiedDate": "2013-08-01T22:47:37.000Z"
          , "contents": "..."
          , "sha1": "6eae3a5b062c6d0d79f070c26e6d62486b40cb46"
          }
        ]
      }'
