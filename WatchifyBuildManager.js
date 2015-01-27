"use strict";

var _ = require("lodash"),
    watchify = require("watchify"),
    errorStack = require("./error").stack;

module.exports = WatchifyBuildManager;

var STALE = 1, BUILDING = 2, FRESH = 3;

function WatchifyBuildManager(log, browserifyFactory) {
  var state = STALE,
      blocked = [],
      cache,
      version = 1,
      wify = createBundle();

  log.info("Monitoring browserify bundle for changes");

  this.fresh = fresh;
  this.invalidate = invalidate;

  function fresh(path, callback) {
    var pathStr = JSON.stringify(path);
    if (state === FRESH) {
      log.debug(pathStr,"is fresh",par(version));
      callback.apply(null,cache);
    } else {
      blocked.push(callback);

      if (state === BUILDING) {
        log.debug(pathStr,"has a build in progress");
      } else {
        state = BUILDING;
        log.debug("Requesting a build for",pathStr,par(version));
        build();
      }
    }
  }

  function invalidate() {
    log.info("Discarding cached bundle state",par(version));
    wify.close();
    wify = createBundle();
    touch();
  }


  function createBundle() {
    var w = watchify(browserifyFactory());
    w.on("update",changed);
    return w;
  }

  function bundled(bundleVersion, err, buf) {
    if (bundleVersion < version) {
      log.debug("Built obsolete bundle",lt(bundleVersion));
      build();
      return;
    }

    state = FRESH;

    if (err) {
      log.error("Build failed",par(version) + ":\n" + errorStack(err));
      cache = [err];
    } else {
      log.info("Build succeeded",par(version));
      cache = [err, _.partial(sendJS,buf)];
    }

    var unblocked = blocked;
    blocked = [];

    unblocked.forEach(function(callback) {
      callback.apply(null,cache);
    });
  }

  function build() {
    wify.bundle(_.partial(bundled,version));
  }

  function changed() {
    log.debug("Bundle has changed");
    touch();
  }

  function touch() {
    version++;
    if (state === FRESH) state = STALE;
  }

  function lt(v) {
    return par(v + " < " + version);
  }
}

function par(s) {
  return "(" + s + ")";
}

function sendJS(buf, res) {
  res.writeHead(200,{
    "Content-Type": "application/json",
    "Content-Length": buf.length
  });

  res.end(buf);
}
