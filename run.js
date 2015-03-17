"use strict";

var defaults = require("lodash/object/defaults"),
    last = require("lodash/array/last"),
    rest = require("lodash/array/rest"),
    spawn = require("child_process").spawn,
    watchGlob = require("glob-watcher"),
    normalizeOptions = require("./common").normalizeOptions,
    Builder = require("./Builder");

module.exports = factory;
module.exports.run = run;


function factory(command/*, args..., [options] */) {
  var args = rest(arguments),
      options = last(args);

  if (typeof options !== "object")
    options = {};
  else
    args.pop();

  options = normalizeOptions(options);

  var debug = options.debug,
      log = debug.bind(null,"(" + command + ")"),
      task = run.bind(null,command,args,log),
      builder = new Builder(task,options.eager,debug),
      rebuild = builder.rebuild;

  if (options.watch) {
    watchGlob(options.watch,function() {
      debug("Watched files changed");
      rebuild();
    });

    return justWait.bind(null,builder.wait);
  } else {
    return rebuildThenWait.bind(null,rebuild,builder.wait);
  }
}

function justWait(wait, req, res, next) {
  wait(next);
}

function rebuildThenWait(rebuild, wait, req, res, next) {
  rebuild();
  wait(next);
}


function run(command, args, log, callback) {
  var output = [],
      writeOutput = output.push.bind(output),
      env = process.env,
      envPath = env.PATH;

  log("Running","`" + command,args.join(" ") + "`");

  env = defaults({
    PATH: "node_modules/.bin:" + envPath
  },env);

  var child = spawn(command,args,{
    env: env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.setEncoding("utf8");
  child.stdout.on("data",writeOutput);

  child.stderr.setEncoding("utf8");
  child.stderr.on("data",writeOutput);

  child.on("exit",exit);
  
  return stop;

  
  function stop(cancelledCallback) {
    log("Killing process");
    callback = cancelledCallback;
    child.kill("SIGINT");
  }

  
  function exit(code) {
    if (code === 0) {
      log("Success");
      callback();
    } else {
      var err = new Error(command + " exited with error status " + code);
      err.stack = output.join("");
      callback(err);
    }
  }
}
