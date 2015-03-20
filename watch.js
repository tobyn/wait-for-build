"use strict";

var defaults = require("lodash/object/defaults"),
    flattenDeep = require("lodash/array/flattenDeep"),
    last = require("lodash/array/last"),
    watchGlobs = require("glob-watcher"),
    common = require("./common"),
    normalizeOptions = common.normalizeOptions,
    popOptions = common.popOptions;

module.exports = watch;

function watch(/* globs..., [options] */) {
  var globs = flattenDeep(arguments),
      options = popOptions(globs),
      debug = options.debug;

  var watcher = watchGlobs(globs);

  watcher.on("change",function(evt) {
    debug("File changed:",evt.path);
  });

  return middlewareFactory.bind(null,watcher,options);
}

function middlewareFactory(watcher, defaultOptions, builder, options) {
  var rebuild = builder.rebuild,
      wait = builder.wait;

  options = normalizeOptions(defaults(options,defaultOptions));

  watcher.on("change",rebuild.bind(builder,options.eager));

  middleware.wait = wait;
  middleware.rebuild = rebuild;

  if (options.eager)
    rebuild(true);

  return middleware;

  function middleware(req, res, next) {
    wait(next);
  }
}
