"use strict";

exports.normalizeOptions = normalizeOptions;

function normalizeOptions(options) {
  if (!options)
    options = {};

  if (!options.debug)
    options.debug = noop;

  return options;
}

function noop() { }
