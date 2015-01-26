"use strict";

var _ = require("lodash"),
    noop = _.noop,
    log = require("../log"),
    errorStack = require("../error").stack;

module.exports = TaskBuildManager;

function TaskBuildManager(log, task, concurrency) {
  var active = 0,
      blocked = [];

  this.fresh = fresh;
  this.invalidateAll = invalidateAll;


  function fresh(path, callback) {
    log.debug("Received a request for a fresh",JSON.stringify(path));

    if (active >= concurrency)
      block(callback);
    else
      build(callback);
  }

  function invalidateAll() {
  }


  function block(callback) {
    log.debug(progress("Waiting for a fresh build",1));
    blocked.push(callback);
  }

  function build(callback) {
    active++;

    var msg = "Build starting";
    log.info(progress("Build starting",2));

    runTask(task,finished);

    function finished(err) {
      active--;

      if (err)
        log.error(progress("Build failed",1) + ":\n" + errorStack(err));
      else
        log.info(progress("Build finished",1));

      callback(err);

      if (blocked.length > 0) {
        var unblocked = blocked;
        blocked = [];
        build(all(unblocked));
      }
    }
  }

  function all(callbacks) {
    return function() {
      var args = arguments;
      callbacks.forEach(function(callback) {
        callback.apply(null,args);
      });
    };
  }

  function progress(msg, min) {
    if (active < min)
      return msg;
    else
      return msg + " (" + active + " in progress)";
  }
}

function runTask(task, callback) {
  var cancelled;

  var finish = _.once(function(err) {
    if (cancelled)
      cancelled();
    else if (callback)
      callback(err);
  });

  var cancel = task(finish);

  return _.once(function(callback) {
    cancelled = callback || noop;
    if (cancel) cancel(finish);
  });
}
