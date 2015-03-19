"use strict";

var flattenDeep = require("lodash/array/flatten"),
    last = require("lodash/array/last"),
    watchGlobs = require("glob-watcher"),
    popOptions = require("./common").popOptions;

module.exports = watch;

function watch(/* globs..., [options] */) {
  var globs = flattenDeep(arguments),
      options = popOptions(globs),
      debug = options.debug;

  var watcher = watchGlobs(globs);

  watcher.on("change",function(evt) {
    debug("File changed:",evt.path);
  });

  return middlewareFactory.bind(null,watcher);
}

function middlewareFactory(watcher, builder) {
  var rebuild = builder.rebuild,
      wait = builder.wait;

  watcher.on("change",rebuild);

  middleware.wait = wait;
  middleware.rebuild = rebuild;

  return middleware;

  function middleware(req, res, next) {
    wait(next);
  }
}
