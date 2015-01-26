"use strict";

var _ = require("lodash"),
    noop = _.noop;


exports.adapt = adapt;

function adapt(logger, level, prefix) {
  return new ConsoleLogger(logger,level,prefix);
}


exports.ConsoleLogger = ConsoleLogger;

var LEVELS = ["debug", "info", "warn", "error"];

function ConsoleLogger(console, level, prefixElements) {
  var log = this,
      on = false;

  this.sub = sub;

  LEVELS.forEach(function(l) {
    if (l === level)
      on = true;

    if (on)
      proxy(l);
    else
      log[l] = noop;
  });

  function proxy(level) {
    var method = console[level] || console.log;

    var prefix = _.clone(prefixElements);
    prefix.unshift(level);
    prefix = prefix.map(function(s) {
      return "[" + s + "]";
    }).join(" ");

    log[level] = _.bind(method,console,prefix);
  }


  function sub() {
    var newPrefix = prefixElements.concat(_.flatten(arguments));
    return new ConsoleLogger(console,level,newPrefix);
  }
}
