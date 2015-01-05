/*jshint -W054 */
var tmpglobal
  ;

try {
  tmpglobal = new Function('return this')();
}  catch(e) {
  tmpglobal = window;
}

;(function (exports) {
  'use strict';

  // Chrome, Firefox, and even MSIE11+ all support crypto
  var crypto = window.crypto || window.msCrypto
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
}('undefined' !== typeof exports && exports || tmpglobal));

;(function () {
  'use strict';

  exports.getStats
  exports.getContents
  exports.getMetaCache
  exports.getContentCache
  //require('./db').create(path.join(_dirname, 'db.json'))
}());
