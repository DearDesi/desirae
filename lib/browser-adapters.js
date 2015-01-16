/*jshint -W054 */
;(function (exports) {
  'use strict';

  function create(Desi) {
    // Chrome, Firefox, and even MSIE11+ all support crypto
    var crypto = window.crypto || window.msCrypto
      , PromiseA = window.Promise
      , algos
      ;

    // convenience mappings for common digest algorithms
    algos = {
      'sha1': 'SHA-1'
    , 'sha256': 'SHA-256'
    , 'sha512': 'SHA-512'
    };

    // The function to generate a sha1sum is the same as generating any digest
    // but here's a shortcut function anyway
    function sha1sum(str) {
      return hashsum('sha1', str);
    }

    // a more general convenience function
    function hashsum(hash, str) {
        // you have to convert from string to array buffer
      var ab
        // you have to represent the algorithm as an object 
        , algo = { name: algos[hash] }
        ;

      if ('string' === typeof str) {
        ab = str2ab(str);
      } else {
        ab = str;
      }

      // All crypto digest methods return a promise
      return crypto.subtle.digest(algo, ab).then(function (digest) {
        // you have to convert the ArrayBuffer to a DataView and then to a hex String
        return ab2hex(digest);
      }).catch(function (e) {
        // if you specify an unsupported digest algorithm or non-ArrayBuffer, you'll get an error
        console.error('sha1sum ERROR');
        console.error(e);
        throw e;
      });
    }

    // convert from arraybuffer to hex
    function ab2hex(ab) {
      var dv = new DataView(ab)
        , i
        , len
        , hex = ''
        , c
        ;

      for (i = 0, len = dv.byteLength; i < len; i += 1) {
        c = dv.getUint8(i).toString(16);

        if (c.length < 2) {
          c = '0' + c;
        }

        hex += c;
      }

      return hex;
    }

    // convert from string to arraybuffer
    function str2ab(stringToEncode, insertBom) {
      stringToEncode = stringToEncode.replace(/\r\n/g,"\n");

      var utftext = []
        , n
        , c
        ;

      if (true === insertBom)  {
        utftext[0] =  0xef;
        utftext[1] =  0xbb;
        utftext[2] =  0xbf;
      }

      for (n = 0; n < stringToEncode.length; n += 1) {

        c = stringToEncode.charCodeAt(n);

        if (c < 128) {
            utftext[utftext.length]= c;
        }
        else if((c > 127) && (c < 2048)) {
            utftext[utftext.length] = (c >> 6) | 192;
            utftext[utftext.length] = (c & 63) | 128;
        }
        else {
            utftext[utftext.length] = (c >> 12) | 224;
            utftext[utftext.length] = ((c >> 6) & 63) | 128;
            utftext[utftext.length] = (c & 63) | 128;
        }

      }
      return new Uint8Array(utftext).buffer;
    }

    exports.hashsum = hashsum;
    exports.sha1sum = sha1sum;

    //
    // FSAPI
    //
    var fsapi
      ;

    function request() {
    }
    request.get = function (url/*, query*/) {
      // Return a new promise.
      return new PromiseA(function(resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest()
          ;

        req.onload = function() {
          // This is called even on 404 etc
          // so check the status
          if (200 === req.status) {
            // Resolve the promise with the response text
            resolve(req.response);
          }
          else {
            // Otherwise reject with the status text
            // which will hopefully be a meaningful error
            reject(Error(req.statusText));
          }
        };

        // Handle network errors
        req.onerror = function() {
          reject(Error("Network Error"));
        };

        // Make the request
        req.open('GET', url);
        req.send();
      });
    };
    request.post = function (url/*, query*/, body) {
      // Return a new promise.
      return new PromiseA(function(resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest()
          ;

        req.onload = function() {
          // This is called even on 404 etc
          // so check the status
          if (200 === req.status) {
            // Resolve the promise with the response text
            resolve(req.response);
          }
          else {
            // Otherwise reject with the status text
            // which will hopefully be a meaningful error
            reject(Error(req.statusText));
          }
        };

        // Handle network errors
        req.onerror = function() {
          reject(Error("Network Error"));
        };

        req.open('POST', url);
        req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        // Make the request
        if ('string' !== typeof body) {
          body = JSON.stringify(body);
        }
        req.send(body);
      });
    };

    Desi.fsapi = fsapi = Desi.fsapi || {};
    fsapi.getMeta = function (collections, opts) {
      opts = opts || {};

      var extensions = ''
        , dotfiles = ''
        , contents = ''
        , sha1sum = ''
        ;

      if (Array.isArray(opts.extensions)) {
        extensions = '&extensions=' + opts.extensions.join(','); // md,markdown,jade,htm,html
      }
      if (opts.dotfiles) {
        dotfiles = '&dotfiles=true';
      }
      if (opts.contents) {
        contents = '&contents=true';
      }
      if (false === opts.sha1sum) {
        sha1sum = '&sha1sum=false';
      }

      return request.post('/api/fs/walk?_method=GET' + dotfiles + extensions + contents + sha1sum, {
        dirs: collections
      }).then(function (resp) {
        return JSON.parse(resp);
      }).catch(function (e) {
        throw e;
      });
    };

    fsapi.getContents = function (filepaths) {
      return request.post('/api/fs/files?_method=GET', {
        paths: filepaths
      }).then(function (resp) {
        return JSON.parse(resp);
      });
    };

    fsapi.getCache = function () {
      return request.get('/api/fs/static/cache.json').then(function (resp) {
        return JSON.parse(resp);
      }).catch(function (/*e*/) {
        return {};
      }).then(function (obj) {
        return obj;
      });
    };

    fsapi.copy = function (files) {
      var body = { files: files };
      body = JSON.stringify(body); // this is more or less instant for a few MiB of posts
      return request.post('/api/fs/copy', body).then(function (resp) {
        var response = JSON.parse(resp)
          ;

        // not accurate for utf8/unicode, but close enough
        response.size = body.length;
        return response;
      });

    };

    fsapi.putFiles = function (files) {
      var body = { files: files }
        ;

      files.forEach(function (file) {
        if (!file.contents || 'string' === typeof file.contents) {
          return;
        }
        if (/\.json$/i.test(file.path)) {
          file.contents = JSON.stringify(file.contents);
        }
        else if (/\.ya?ml$/i.test(file.path)) {
          file.contents = exports.jsyaml.dump(file.contents); 
        }
      });

      body = JSON.stringify(body); // this is more or less instant for a few MiB of posts
      return request.post('/api/fs/files', body).then(function (resp) {
        var response = JSON.parse(resp)
          ;

        // not accurate for utf8/unicode, but close enough
        response.size = body.length;
        return response;
      });
    };
  }

  if (exports.Desirae) {
    create(exports.Desirae);
  } else {
    exports.create = create;
  }
}('undefined' !== typeof exports && exports || window));
