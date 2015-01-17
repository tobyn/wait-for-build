(function() {

"use strict";

var _ = require("lodash"),
    gaze = require("gaze"),
    inspect = require("util").inspect,
    match = require("globule").isMatch,
    spawn = require("child_process").spawn,
    slice = Array.prototype.slice;


module.exports = exports = waitForBuild;

function waitForBuild(groups, config) {
  var mapper = new Mapper(groups,config || {});

  function middleware(req, res, next) {
    var path = getRelativePath(req.url);
    mapper.fresh(path,next);
  }

  middleware.invalidateAll = mapper.invalidateAll;

  return middleware;
}

function getRelativePath(uri) {
  var m = uri.match(/\/([^?;]+)/);
  if (m)
    return m[1];
  else
    return "";
}


function Mapper(groups, config) {
  var mappings = [];

  this.fresh = fresh;
  this.invalidateAll = invalidateAll;

  _.each(groups, function(attrs, label) {
    mappings.push([attrs.match, new BuildManager(label,attrs,config)]);
  });

  
  function fresh(path, callback) {
    var manager = get(path);
    if (manager)
      manager.fresh(path,callback);
    else
      callback();
  }
  
  function get(path) {
    var mapping = _.find(mappings,function(m) {
      return match(m[0],path);
    });

    if (mapping)
      return mapping[1];
  }

  function invalidateAll() {
    mappings.forEach(function(mapping) {
      mapping[1].touch();
    });
  }
}


function BuildManager(label, attrs, config) {
  var state = "STALE",
      task = attrs.task,
      queue,
      cancel,
      lastError;

  var log = config.logger,
      logPrefix = "[" + label + "]",
      debug = logProxy(log,"debug",logPrefix),
      info = logProxy(log,"info",logPrefix),
      error = logProxy(log,"error",logPrefix);

  this.label = label;
  this.fresh = fresh;
  this.touch = touch;

  gaze(attrs.watch).on("all",touch);


  function fresh(path, callback) {
    if (state === "FRESH") {
      debug(inspect(path),"is fresh");
      callback(lastError);
    } else if (state === "BUILDING") {
      debug("Waiting on build for",inspect(path));
      queue.push(callback);
    } else {
      info("Starting build for",inspect(path));
      start(callback);
    }
  }

  function touch() {
    if (state === "FRESH") {
      debug("Build has become stale");
      state = "STALE";
    } else if (state === "BUILDING") {
      info("Restarting build due to file change");
      restart();
    }
  }


  function start(callback) {
    state = "BUILDING";
    queue = [callback];
    execute();
  }

  function restart() {
    cancel();
    execute();
  }

  function execute() {
    cancel = runTask(task,function(err) {
      if (err)
        error("Build failed:\n" + errorStack(err));
      else
        info("Build successful");

      queue.forEach(function(callback) {
        callback(err);
      });

      state = "FRESH";
      lastError = err;
      queue = null;
      cancel = null;
    });
  }
}

function logProxy(log, level, prefix) {
  if (!log) return function log() { };

  var logMethod = log[level];

  return function log() {
    var args = slice.call(arguments);
    args.unshift(prefix);

    logMethod.apply(log,args);
  };
}

function runTask(task, callback) {
  var cancelled = false;

  var cancelTask = task(function() {
    if (!cancelled)
      return callback.apply(this,arguments);
  });

  return function cancel() {
    cancelled = true;

    if (typeof cancelTask === "function")
      cancelTask();
  };
}


exports.gulp = gulp;

function gulp(task) {
  return command("gulp",task);
}


exports.command = command;

function command(name/*, args... */) {
  var args = slice.call(arguments,1);

  return function(callback) {
    var log = [],
        logger = log.push.bind(log),
        env = process.env,
        envPath = env.PATH;

    env = _.defaults({
      PATH: "node_modules/.bin:" + envPath
    },env);

    var child = spawn(name,args,{
      env: env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.setEncoding("utf8");
    child.stdout.on("data",logger);

    child.stderr.setEncoding("utf8");
    child.stderr.on("data",logger);

    child.on("exit",function(code) {
      if (code === 0) {
        callback();
      } else {
        var err = new Error("Command failed");
        err.stack = log.join("");
        callback(err);
      }
    });
    
    return function stop() {
      child.kill("SIGINT");
    };
  };
}


function errorMessage(err) {
  if (err && err.message)
    return err.message;
  else
    return String(err);
}

function errorStack(err) {
  if (err && err.stack)
    return err.stack;
  else
    return errorMessage(err);
}


exports.plainTextErrors = plainTextErrors;

function plainTextErrors(err, req, res, next) {
  res.writeHead(500,{ "Content-Type": "text/plain" });
  res.end(errorStack(err));
}

})();
