"use strict";

var _ = require("lodash"),
    noop = _.noop;


var LEVELS = ["debug", "info", "warn", "error"];


var nullLogger = exports.nullLogger = {
  sub: function() { return nullLogger; }
};

LEVELS.forEach(function(l) {
  nullLogger[l] = noop;
});


exports.adapt = adapt;

function adapt(logger, level) {
  if (logger)
    return new ConsoleLogger(logger,level,[]);
  else
    return nullLogger;
}



exports.ConsoleLogger = ConsoleLogger;

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
    prefix.unshift(level.toUpperCase());
    prefix = prefix.join(" ");

    log[level] = _.bind(method,console,prefix);
  }


  function sub() {
    var newPrefix = prefixElements.concat(_.flatten(arguments));
    return new ConsoleLogger(console,level,newPrefix);
  }
}
