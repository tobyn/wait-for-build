"use strict";

var browserify = require("browserify"),
    defaults = require("lodash/object/defaults"),
    watchify = require("watchify"),
    Builder = require("./Builder");

var REQUIRED_BROWSERIFY_OPTIONS = {
  cache: {},
  packageCache: {},
  fullPaths: true
};

module.exports = factory;
module.exports.WatchifyBuilder = WatchifyBuilder;


function factory(configure) {
  var bundle = configure(browserifyProxy);

  return function(options) {
    return new WatchifyBuilder(bundle,options.eager,options.log);
  };
}

function browserifyProxy(options) {
  if (Array.isArray(options))
    options = { entries: options };

  defaults(options,REQUIRED_BROWSERIFY_OPTIONS);

  return browserify(options);
}


function WatchifyBuilder(bundle, eager, log) {
  var w = this.watchify = watchify(bundle);

  Builder.call(this,this.bundle.bind(this),eager,log);

  w.on("update",this.updated.bind(this));

  w.on("bytes",function(bytes) {
    log.debug("Bundle generated (" + bytes,"bytes)");
  });
}

WatchifyBuilder.prototype = Object.create(Builder.prototype);

WatchifyBuilder.prototype.bundle = function(callback) {
  this.log.debug("Browserifying");
  this.watchify.bundle(callback);
};

WatchifyBuilder.prototype.updated = function(ids) {
  this.log.debug("Module changes:",ids.join(", "));
};
