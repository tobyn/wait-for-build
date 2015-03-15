"use strict";

var defaults = require("lodash/object/defaults"),
    rest = require("lodash/array/rest"),
    spawn = require("child_process").spawn,
    Builder = require("./Builder");

module.exports = factory;
module.exports.run = run;


function factory(command/*, args... */) {
  var args = rest(arguments);

  return function(options) {
    var log = options.log.sub("(" + command + ")");
    return run.bind(null,command,args,log);
  };
}


function run(command, args, log, callback) {
  var output = [],
      writeOutput = output.push.bind(output),
      env = process.env,
      envPath = env.PATH;

  log.debug("Running",command,args.join(" "));

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
    log.debug("Killing process");
    callback = cancelledCallback;
    child.kill("SIGINT");
  }

  
  function exit(code) {
    if (code === 0) {
      log.debug("Success");
      callback();
    } else {
      var err = new Error(command + " exited with error status " + code);
      err.stack = output.join("");
      callback(err);
    }
  }
}
