"use strict";

module.exports = Builder;

function Builder(task, eager, log) {
  this.task = task;
  this.eager = eager;
  this.log = log;

  if (eager)
    this.startBuild([]);
  else
    this.state = "stale";
}

Builder.prototype = {
  rebuild: function() {
    switch (this.state) {
      case "fresh":
        if (this.eager) {
          this.startBuild([]);
        } else {
          this.log.debug("Rebuilding on the next request");
          this.state = "stale";
        }

        break;

      case "building":
        this.state = "building stale";

        if (this.eager && this.cancelTask)
          this.cancelBuild();

        break;
    }
  },

  wait: function(callback) {
    switch (this.state) {
      case "fresh":
        this.log.debug("No build needed");
        callback(this.lastError);
        break;

      case "stale":
        this.startBuild([callback]);
        break;

      case "building":
        this.log.debug("Waiting on build in progress");
        this.currentBuildCallbacks.push(callback);
        break;

      case "building stale":
        this.log.debug("Waiting on the next build");

        if (this.cancelTask)
          this.cancelBuild();

        var callbacks = this.nextBuildCallbacks;
        if (callbacks)
          callbacks.push(callback);
        else
          this.nextBuildCallbacks = [callback];

        break;
    }
  },


  startBuild: function(callbacks) {
    this.state = "building";

    this.log.debug("Starting a build");

    delete this.lastError;

    this.currentBuildCallbacks = callbacks;
    this.cancelTask = this.task(this.finishedBuild.bind(this,callbacks));
  },

  cancelBuild: function() {
    this.log.info("Canceling obsolete build");

    var callbacks = this.currentBuildCallbacks;
    this.cancelTask(this.canceledBuild.bind(this,callbacks));
    delete this.cancelTask;
  },


  canceledBuild: function(callbacks) {
    if (callbacks !== this.currentBuildCallbacks) return;

    this.log.debug("Build has been canceled");

    delete this.currentBuildCallbacks;

    this.nextBuild(callbacks);
  },

  finishedBuild: function(callbacks, err) {
    if (callbacks !== this.currentBuildCallbacks) return;

    delete this.cancelTask;
    delete this.currentBuildCallbacks;

    var len = callbacks.length;
    if (len > 0)
      this.log.debug(callbacks.length,"wait(s) complete");

    callbacks.forEach(function(callback) {
      callback(err);
    });

    if (this.state === "building") {
      this.state = "fresh";
      this.lastError = err;
      this.log.debug("Build is ready");
    } else if (this.eager || this.nextBuildCallbacks) {
      this.log.debug("Obsolete build finished");
      this.nextBuild();
    }
  },

  nextBuild: function(callbacks) {
    var nbc = this.nextBuildCallbacks;
    if (nbc)
      delete this.nextBuildCallbacks;
    else
      nbc = [];

    if (callbacks)
      nbc = callbacks.concat(nbc);

    this.startBuild(nbc);
  }
};
