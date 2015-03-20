"use strict";

var slice = Array.prototype.slice;

var FRESH = 1,
    STALE = 2,
    BUILDING = 3,
    BUILDING_STALE = 4;

module.exports = Builder;

/*
 * Builders run tasks to execute builds. Each Builder manages a single
 * task, and will only allow one build to be in progress at a time.
 *
 * Builders ensure that callbacks passed to `wait` are only called once
 * a build finishes that was started after the most recent call to
 * `rebuild` prior to the `wait`.
 */
function Builder(task, debug) {
  var cancelTask,
      currentBuildCallbacks,
      cachedResult,
      nextBuildCallbacks,
      state = STALE;

  if (!debug) debug = function noop() { };

  this.rebuild = rebuild;
  this.wait = wait;


  function rebuild(eager) {
    switch (state) {
      case FRESH:
        if (eager)
          startBuild([]);
        else
          state = STALE;

        break;

      case STALE:
        if (eager)
          startBuild([]);

        break;

      case BUILDING:
        state = BUILDING_STALE;

        if (eager) {
          if (!nextBuildCallbacks)
            nextBuildCallbacks = [];

          if (cancelTask)
            cancelBuild();
        }

        break;

      case BUILDING_STALE:
        if (eager && !nextBuildCallbacks)
          nextBuildCallbacks = [];

        break;
    }
  }

  function wait(callback) {
    switch (state) {
      case FRESH:
        debug("No build needed");
        callback.apply(null,cachedResult);
        break;

      case STALE:
        startBuild([callback]);
        break;

      case BUILDING:
        debug("Waiting on build in progress");
        currentBuildCallbacks.push(callback);
        break;

      case BUILDING_STALE:
        debug("Waiting on the next build");

        if (cancelTask)
          cancelBuild();

        if (nextBuildCallbacks)
          nextBuildCallbacks.push(callback);
        else
          nextBuildCallbacks = [callback];

        break;
    }
  }


  function startBuild(callbacks) {
    state = BUILDING;
    cachedResult = null;
    currentBuildCallbacks = callbacks;

    debug("Starting a build");

    cancelTask = task(finishedBuild.bind(null,callbacks));
  }

  function cancelBuild() {
    debug("Canceling obsolete build");

    cancelTask(canceledBuild.bind(null,currentBuildCallbacks));
    cancelTask = null;
  }


  function canceledBuild(callbacks) {
    if (callbacks !== currentBuildCallbacks) return;
    currentBuildCallbacks = null;

    debug("Build has been canceled");

    nextBuild(callbacks);
  }

  function finishedBuild(callbacks) {
    if (callbacks !== currentBuildCallbacks) return;

    currentBuildCallbacks = null;
    cancelTask = null;

    var len = callbacks.length;
    if (len > 0)
      debug(len,"wait(s) fulfilled");

    var result = slice.call(arguments,1);
    callbacks.forEach(function(callback) {
      callback.apply(null,result);
    });

    if (state === BUILDING) {
      state = FRESH;
      cachedResult = result;
      debug("Build is ready");
    } else if (nextBuildCallbacks) {
      debug("Obsolete build finished");
      nextBuild();
    }
  }

  function nextBuild(callbacks) {
    if (callbacks)
      callbacks = callbacks.concat(nextBuildCallbacks || []);
    else if (nextBuildCallbacks)
      callbacks = nextBuildCallbacks;
    else
      callbacks = [];

    if (nextBuildCallbacks)
      nextBuildCallbacks = null;

    startBuild(callbacks);
  }
}
