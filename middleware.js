"use strict";

var _ = require("lodash"),
    Buffer = require("buffer").Buffer,
    errorStack = require("./error").stack;


exports.factory = factory;

function factory(mapper) {
  var m = _.partial(middleware,mapper);
  m.invalidateAll = mapper.invalidateAll;
  return m;
}


exports.middleware = middleware;

function middleware(mapper, req, res, next) {
  var path = getRelativePath(req.url),
      build = mapper.get(path);

  if (build)
    build.fresh(path,next);
  else
    next();
}

function getRelativePath(absolutePathAndQuery) {
  var m = absolutePathAndQuery.match(/\/([^?;]+)/);
  if (m)
    return m[1];
  else
    return "";
}


exports.plainTextErrors = plainTextErrors;

function plainTextErrors(err, req, res, next) {
  var stack = errorStack(err),
      buffer = new Buffer(stack,"utf8");

  res.writeHead(500,{
    "Content-Length": buffer.length,
    "Content-Type": "text/plain"
  });

  res.end(buffer);

  console.error(stack);
}
