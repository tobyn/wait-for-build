"use strict";

var glob = require("globule").isMatch,
    adaptLogger = require("./log").adapt,
    Mapper = require("./Mapper"),
    TaskBuildManager = require("./task/TaskBuildManager"),
    gulp = require("./task").gulp,
    middlewareFactory = require("./middleware").factory;

module.exports = createMiddleware;

function createMiddleware() {
  var log,
      paths,
      mapper = new Mapper(glob);

  log = adaptLogger(console,"debug",["Jade"]);
  paths = "";
  mapper.map(paths,new TaskBuildManager(log,gulp("jade"),1));

  log = adaptLogger(console,"error",["CSS"]);
  paths = "**/*.css";
  mapper.map(paths,new TaskBuildManager(log,gulp("css"),1));

  log = adaptLogger(console,"debug",["JS"]);
  paths = ["**/*.js","**/*.js.map"];
  mapper.map(paths,new TaskBuildManager(log,gulp("js"),3));

  return middlewareFactory(mapper);
}
