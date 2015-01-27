"use strict";

var gaze = require("gaze"),
    errorStack = require("./error").stack;

module.exports = GazeBuildManager;

var STALE = 1, BUILDING = 2, FRESH = 3;

function GazeBuildManager(log, paths, manager) {
  var state = STALE,
      blocked = [],
      lastError;

  this.fresh = fresh;
  this.invalidate = invalidate;

  gaze(paths,function(err) {
    if (err) {
      log.error("Watch failed:\n" + errorStack(err));
    } else {
      log.info("Monitoring source files for changes:",
               JSON.stringify(paths));
      this.on("all",touch);
    }
  });


  function fresh(path, callback) {
    var pathStr = JSON.stringify(path);
    if (state === FRESH) {
      log.debug(pathStr,"is fresh");
      callback(lastError);
    } else {
      blocked.push(callback);

      if (state === BUILDING) {
        log.debug(pathStr,"has a build in progress");
      } else {
        state = BUILDING;
        log.debug("Requesting a build for",pathStr);
        manager.fresh(path,built);
      }
    }
  }

  function invalidate() {
    if (state === FRESH) {
      log.info("Rebuilding on next request");
      state = STALE;
    } else if (state === BUILDING) {
      log.info("Current build became obsolete");
    }

    manager.invalidate();
  }


  function built(err) {
    var unblocked = blocked;

    state = FRESH;
    blocked = [];
    lastError = err;

    log.debug("Build is fresh");

    unblocked.forEach(function(callback) {
      callback(err);
    });
  }

  function touch() {
    if (state === FRESH) {
      log.debug("Source files have changed");
      state = STALE;
    } else if (state === BUILDING) {
      log.debug("Requesting build restart");
      manager.invalidate();
    }
  }
}
