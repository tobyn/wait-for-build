"use strict";

var defaults = require("lodash/object/defaults"),
    stripAnsi = require("strip-ansi"),
    normalizeOptions = require("./common").normalizeOptions,
    Builder = require("./Builder");

module.exports = initialize;


function initialize(browserify, watchify) {
  return factory.bind(null,browserify,watchify);
}

function factory(browserify, watchify, configure, options) {
  options = normalizeOptions(options);

  var debug = options.debug,
      eager = options.eager,
      bify = configure(browserifyProxy),
      wify = watchify(bify),
      builder = new Builder(bundle,debug),
      rebuild = builder.rebuild,
      wait = builder.wait;

  wify.on("update",updated);

  wify.on("bytes",function(bytes) {
    debug("Bundle generated (" + bytes,"bytes)");
  });

  middleware.wait = builder.wait;
  middleware.rebuild = builder.rebuild;

  return middleware;


  function middleware(req, res, next) {
    wait(function(err, buf) {
      if (err)
        next(decolorize(err));
      else
        sendJS(res,buf);
    });
  }


  function browserifyProxy(options) {
    if (Array.isArray(options))
      options = { entries: options };
    else if (typeof options !== "object")
      options = { entries: [options] };

    options = defaults({},options,watchify.args);

    return browserify(options);
  }

  function bundle(callback) {
    debug("Browserifying");
    wify.bundle(callback);
  }

  function updated(ids) {
    debug("Module changes:",ids.join(", "));
    rebuild(eager);
  }
}

function decolorize(err) {
  var stack = err.stack;
  if (stack)
    err.stack = stripAnsi(stack);

  return err;
}

function sendJS(res, buf) {
  res.writeHead(200,{
    "Content-Type": "application/javascript",
    "Content-Length": buf.length
  });

  res.end(buf);
}
