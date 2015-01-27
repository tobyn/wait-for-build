"use strict";

var glob = require("globule").isMatch,
    adaptLogger = require("./log").adapt,
    Mapper = require("./Mapper"),
    TaskBuildManager = require("./task/TaskBuildManager"),
    gulp = require("./task").gulp,
    middlewareFactory = require("./middleware").factory;

module.exports = createMiddleware;

function createMiddleware() {
  var log = adaptLogger(console,"debug"),
      nlog = adaptLogger(undefined,"debug"),
      paths,
      mapper = new Mapper(glob);

  paths = "";
  mapper.map(paths,new TaskBuildManager("Jade",log,gulp("jade"),1));

  paths = "**/*.css";
  mapper.map(paths,new TaskBuildManager("CSS",log,gulp("css"),1));

  paths = ["**/*.js","**/*.js.map"];
  mapper.map(paths,new TaskBuildManager("JS",log,gulp("js"),3));

  return middlewareFactory(mapper);
}
