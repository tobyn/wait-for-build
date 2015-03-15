"use strict";

var adaptLogger = require("./log").adapt,
    OnDemandBuilder = require("./OnDemandBuilder");

module.exports = builderManager;

module.exports.middleware = middleware;


function builderManager(options) {
  options = normalizeOptions(options);

  var all = [],
      log = options.log;

  add.rebuild = rebuild;

  return add;

  function add(label, factory) {
    options.log = log.sub("[" + label + "]");

    var builder = factory(options);

    // The factory made a task rather than a builder
    if (typeof builder === "function")
      builder = new OnDemandBuilder(builder,options.log);

    all.push(builder);

    return middleware.bind(null,builder);
  }

  function rebuild() {
    all.forEach(function(builder) {
      builder.rebuild();
    });
  }
}

function normalizeOptions(options) {
  if (!options) options = {};
  options.log = adaptLogger(options);
  return options;
}

function middleware(builder, req, res, next) {
  builder.wait(next);
}
