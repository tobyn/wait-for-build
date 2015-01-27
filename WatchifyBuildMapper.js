"use strict";

var _ = require("lodash"),
    WatchifyBuildManager = require("./WatchifyBuildManager"),
    slice = Array.prototype.slice;

module.exports = WatchifyBuildMapper;

function WatchifyBuildMapper(log, browserifyFactory) {
  var managers = {};

  this.fresh = fresh;
  this.invalidate = invalidate;


  function fresh(path, callback) {
    var mpath = modulePath(path),
        manager = managers[mpath];

    if (!manager) {
      log.debug("Creating a new build manager for",JSON.stringify(mpath));

      var slog = log.sub("(" + mpath + ")"),
          fact = _.partial(browserifyFactory,mpath);
      manager = managers[mpath] = new WatchifyBuildManager(slog,fact);
    }

    manager.fresh(path,callback);
  }

  function invalidate() {
    var paths = Object.keys(managers),
        count = paths.length;

    log.debug("Discarding all watchify bundles (" + count + ")");

    _.each(managers,function(manager) {
      manager.close();
    });

    managers = {};
  }
}

var JS_PATHS = /(.+)\.js(\.map)?$/i;

function modulePath(relativePath) {
  var m = relativePath.match(JS_PATHS);
  if (m)
    return m[1];
}
