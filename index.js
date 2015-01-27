"use strict";

var glob = require("globule").isMatch,
    adaptLogger = require("./log").adapt,
    Mapper = require("./Mapper"),
    GazeBuildManager = require("./GazeBuildManager"),
    TaskBuildManager = require("./task/TaskBuildManager"),
    gulp = require("./task").gulp,
    middlewareFactory = require("./middleware").factory;

module.exports = createMiddleware;

function createMiddleware() {
  var blog = adaptLogger(console,"debug"),
      mapper = new Mapper(glob);

  map("HTML",gulp("html"),"","*.jade");

  map("CSS",gulp("css"),
    "**/*.css",
    ["*.styl","components/**/*.styl"]);

  map("JS",gulp("js"),
    ["**/*.js","**/*.js.map"],
    ["*.jsx","components/**/*.jsx"]);

  return middlewareFactory(mapper);


  function map(label, task, paths, watch) {
    var gazeLog = blog.sub("[" + label + "] (watch)"),
        gulpLog = blog.sub("[" + label + "] (gulp)"),
        gulpBm = new TaskBuildManager(gulpLog,task,1);

    mapper.map(paths,new GazeBuildManager(gazeLog,watch,gulpBm));
  }
}
