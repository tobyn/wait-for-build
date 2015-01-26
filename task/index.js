"use strict";

var _ = require("lodash");

var command = exports.command = require("./command");

exports.gulp = _.partial(command,"gulp");
