/*jshint -W054 */
;(function (exports) {
  'use strict';

  var path = exports.path || require('path')
    , months
    , cores = {}
    ;

  months = {
    1: 'January'
  , 2: 'February'
  , 3: 'March'
  , 4: 'April'
  , 5: 'May'
  , 6: 'June'
  , 7: 'July'
  , 8: 'August'
  , 9: 'September'
  , 10: 'October'
  , 11: 'November'
  , 12: 'December'
  };

  function byDate(a, b) {
    a.year = parseInt(a.year, 10) || 0;
    b.year = parseInt(b.year, 10) || 0;
    if (a.year > b.year) {
      return -1;
    } else if (a.year < b.year) {
      return 1;
    }

    a.month = parseInt(a.month, 10) || 0;
    b.month = parseInt(b.month, 10) || 0;
    if (a.month > b.month) {
      return -1;
    } else if (a.month < b.month) {
      return 1;
    }

    a.day = parseInt(a.day, 10) || 0;
    b.day = parseInt(b.day, 10) || 0;
    if (a.day > b.day) {
      return -1;
    } else if (a.day < b.day) {
      return 1;
    }

    if (a.hour > b.hour) {
      return -1;
    } else if (a.hour < b.hour) {
      return 1;
    }

    if (a.minute > b.minute) {
      return -1;
    } else if (a.minute < b.minute) {
      return 1;
    }

    if (a.title.toLowerCase() <= b.title.toLowerCase()) {
      return -1;
    }

    return 1;
  }

  function collate(entities, env) {
    var yearsArr = []
      ;

    entities.forEach(function (f) {
      var set
        , yindex = 3000 - f.year
        , mindex = 12 - f.month
        ;

      f.url = path.join(env.base_path, f.permalink);

      if (!yearsArr[yindex]) {
        yearsArr[yindex] = { year: f.year, months: [] };
      }
      set = yearsArr[yindex];

      if (!set.months[mindex]) {
        set.months[mindex] = { month: months[parseInt(f.month, 10)], pages: [] };
      }
      set = set.months[mindex];

      set.pages.push(f);
    });

    yearsArr = yearsArr.filter(function (y) {
      if (!y) {
        return false;
      }

      y.months = y.months.filter(function (m) {
        return m && m.pages.length;
      });

      if (!y.months.length) {
        return false;
      }

      return true;
    });

    return { years: yearsArr };
  }

  cores.collate = function (desi, env) {
    // TODO categories
    // TODO tags
    desi.content.collections.sort(byDate);
    desi.collated = collate(desi.content.collections, env);
  };

  exports.DesiraeAggregateCore = cores.DesiraeAggregateCore = cores;
}('undefined' !== typeof exports && exports || window));
