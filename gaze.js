"use strict";

var gaze = require("gaze"),
    errorStack = require("./error").stack;

module.exports = GazeBuildManager;

function GazeBuildManager(log, paths, manager) {
  var state = "stale",
      blocked = [],
      lastError;

  this.fresh = fresh;
  this.invalidate = invalidate;

  gaze(paths,function(err) {
    if (err)
      log.error("Watch failed:\n" + errorStack(err));
    else
      this.on("any",touch);
  });


  function fresh(path, callback) {
    if (state === "fresh")
      return callback(lastError);

    blocked.push(callback);

    if (state === "stale")
      manager.fresh(built);
  }

  function invalidate() {
    state = "stale";
    manager.invalidate();
  }


  function built(err) {
    var unblocked = blocked;

    blocked = [];
    lastError = err;

    unblocked.forEach(function(callback) {
      callback(err);
    });
  }

  function touch() {
    if (state === "fresh")
      state = "stale";
    else if (state === "building")
      manager.invalidate();
  }
}
