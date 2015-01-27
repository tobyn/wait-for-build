"use strict";

var _ = require("lodash"),
    noop = _.noop,
    uuid = require("node-uuid"),
    log = require("../log"),
    TaskBuild = require("./TaskBuild");

module.exports = TaskBuildManager;

function TaskBuildManager(log, task, concurrency) {
  var m = this,
      builds = [],
      nextBuild = createBuild();

  m.fresh = fresh;
  m.invalidate = invalidate;

  m.buildSucceeded = buildSucceeded;
  m.buildFailed = buildFailed;
  m.buildCanceled = buildCanceled;


  function fresh(path, callback) {
    nextBuild.callbacks.push(callback);

    if (concurrency > 0 && builds.length >= concurrency)
      log.debug(progress("Waiting for a fresh build",1));
    else
      startBuild();
  }

  function invalidate() {
    var l = builds.length;
    if (l === 0) return;

    var r;
    if (l === 1)
      r = "a build";
    else
      r = l + " builds";

    log.info("Restarting",r);

    builds.forEach(function(b) {
      b.cancel();
    });
  }


  function buildSucceeded(build) {
    var position = builds.indexOf(build),
        resolved = builds;

    builds = builds.slice(position+1);

    log.info(progress("Build succeeded",1));

    if (position > 0) {
      var r;
      if (position === 1)
        r = "an earlier build";
      else
        r = position + " earlier builds";

      log.debug("Ignoring",r,"due to successful build");
    }

    for (var i = 0; i < position; i++)
      resolved[i].override();

    if (nextBuild.callbacks.length > 0)
      startBuild();
  }
  
  function buildFailed(build, err) {
    var position = untrack(build);

    log.error(progress("Build failed",1));

    var len = builds.length;
    if (position < len) {
      log.info("Failed build requests being handled by a newer build");
      builds[len-1].usurp(build);
    }

    if (nextBuild.callbacks.length > 0)
      startBuild();
  }

  function buildCanceled(build) {
    var position = untrack(build);

    log.info(progress("Build canceled",1));

    var len = builds.length;
    if (position === len) {
      log.debug("Canceled build requests require a new build");
      nextBuild.usurp(build);
      startBuild();
    } else {
      log.debug("Canceled build requests being handled by newer build");
      builds[len-1].usurp(build);
    }

    if (nextBuild.callbacks.length > 0)
      startBuild();
  }


  function createBuild() {
    return new TaskBuild(m,task);
  }

  function progress(msg, min) {
    var active = builds.length;
    if (active < min)
      return msg;
    else
      return msg + " (" + active + " in progress)";
  }

  function startBuild() {
    var build = nextBuild;
    builds.push(build);

    nextBuild = createBuild();

    var msg = "Build starting",
        reqs = build.callbacks.length;
    if (reqs > 1)
      msg += " for " + reqs + " requests";

    log.info(progress(msg,2));
    build.start();
  }

  function untrack(build) {
    var position = builds.indexOf(build);
    builds.splice(position,1);
    return position;
  }
}
