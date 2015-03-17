"use strict";

var defaults = require("lodash/object/defaults"),
    normalizeOptions = require("./common").normalizeOptions,
    Builder = require("./Builder");

var REQUIRED_BROWSERIFY_OPTIONS = {
  cache: {},
  packageCache: {},
  fullPaths: true
};

module.exports = initialize;


function initialize(browserify, watchify) {
  return factory.bind(null,browserify,watchify);
}

function factory(browserify, watchify, configure, options) {
  options = normalizeOptions(options);

  var debug = options.debug,
      bify = configure(browserifyProxy),
      wify = watchify(bify),
      builder = new Builder(bundle,options.eager,debug),
      rebuild = builder.rebuild,
      wait = builder.wait;

  wify.on("update",updated);

  wify.on("bytes",function(bytes) {
    debug("Bundle generated (" + bytes,"bytes)");
  });

  return middleware;


  function middleware(req, res, next) {
    wait(function(err, buf) {
      if (err)
        next(err);
      else
        sendJS(res, buf);
    });
  }

  function sendJS(res, buf) {
    res.writeHead(200,{
      "Content-Type": "application/javascript",
      "Content-Length": buf.length
    });

    res.end(buf);
  }


  function browserifyProxy(options) {
    if (Array.isArray(options))
      options = { entries: options };

    defaults(options,REQUIRED_BROWSERIFY_OPTIONS);

    return browserify(options);
  }

  function bundle(callback) {
    debug("Browserifying");
    wify.bundle(callback);
  }

  function updated(ids) {
    debug("Module changes:",ids.join(", "));
    rebuild();
  }
}
