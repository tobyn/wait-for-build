"use strict";

var LEVELS = ["debug", "info", "warn", "error"],
    hasConsole = typeof console !== "undefined",
    slice = Array.prototype.slice;


exports.adapt = adapt;

function adapt(options) {
  var log = options.log,
      level = options.logLevel || "error";

  if (!log)
    return NOOP_LOGGER;

  if (hasConsole && log === console)
    log = new ConsoleLogger(level);
  
  return new PrefixLogger(log,level,[]);
}


function noop() { }

var baseMethods = {};

LEVELS.forEach(function(l) {
  baseMethods[l] = noop;
});


var NOOP_LOGGER = Object.create(baseMethods);

NOOP_LOGGER.sub = function() { return NOOP_LOGGER; };


exports.ConsoleLogger = ConsoleLogger;

function ConsoleLogger(level) {
  var index = LEVELS.indexOf(level),
      len = LEVELS.length,
      l;

  while (index < len) {
    l = LEVELS[index];

    if (console[l])
      this[l] = console[l].bind(console);
    else
      this[l] = console.log.bind(console);

    index++;
  }
}

ConsoleLogger.prototype = Object.create(baseMethods);


exports.PrefixLogger = PrefixLogger;

function PrefixLogger(baseLogger, level, prefix) {
  prefix.unshift(baseLogger,null);

  this.level = level;
  this.prefix = prefix;

  var index = LEVELS.indexOf(level),
      len = LEVELS.length;

  while (index < len) {
    var l = LEVELS[index];

    prefix[1] = l.toUpperCase();
    this[l] = Function.bind.apply(baseLogger[l],prefix);

    index++;
  }
}

PrefixLogger.prototype = Object.create(baseMethods);

PrefixLogger.prototype.sub = function() {
  var p = this.prefix,
      np = p.slice(2);

  np.push.apply(np,slice.call(arguments));

  return new PrefixLogger(p[0],this.level,np);
};
