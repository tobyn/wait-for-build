"use strict";

module.exports = TaskBuild;

var noop = require("lodash").noop;

var STARTED = 1, FINISHED = 2, CANCELING = 3, CANCELED = 4;

function TaskBuild(manager, task) {
  var b = this,
      state = null,
      taskCancel;

  b.callbacks = [];

  b.start = start;
  b.cancel = cancel;

  b.override = override;
  b.usurp = usurp;


  function start() {
    if (state !== null) return;
    state = STARTED;
    taskCancel = task(finished);
  }

  function cancel() {
    if (state !== STARTED) return;
    state = CANCELING;
    if (taskCancel) taskCancel(finished);
  }

  function override(err) {
    if (state === FINISHED || state === CANCELED) return;
    state = CANCELED;

    if (taskCancel) taskCancel(noop);

    sendResult(err);
  }

  function usurp(otherBuild) {
    var bc = b.callbacks;
    bc.push.apply(bc,otherBuild.callbacks);
    otherBuild.callbacks = [];
  }


  function finished(err) {
    if (state === STARTED) {
      state = FINISHED;

      if (err)
        manager.buildFailed(b,err);
      else
        manager.buildSucceeded(b);

      sendResult(err);
    } else if (state === CANCELING) {
      state = CANCELED;
      manager.buildCanceled(b);
    }
  }

  function sendResult(err) {
    b.callbacks.forEach(function(callback) {
      callback(err);
    });
  }
}
