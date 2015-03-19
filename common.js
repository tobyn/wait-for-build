"use strict";

var last = require("lodash/array/last");

exports.normalizeOptions = normalizeOptions;

function normalizeOptions(options) {
  if (!options)
    options = {};

  if (!options.debug)
    options.debug = noop;

  return options;
}

exports.popOptions = popOptions;

function popOptions(args) {
  var options = last(args);

  if (typeof options === "object")
    args.pop();
  else
    options = {};

  return normalizeOptions(options);
}

function noop() { }
