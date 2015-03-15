"use strict";

var gaze = require("gaze"),
    rest = require("lodash/array/rest"),
    Builder = require("./Builder");

module.exports = factory;

function factory(taskFactory/*, watchPaths... */) {
  var watchPaths = rest(arguments);

  return function(options) {
    var task = taskFactory(options),
        log = options.log,
        builder = new Builder(task,options.eager,log);

    gaze(watchPaths,watched);

    return builder;


    function watched(err) {
      if (err)
        log.error("Unable to watch files:",err);
      else
        this.on("all",builder.rebuild.bind(builder)); // jshint ignore:line
    }
  };
}
