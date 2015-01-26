"use strict";

var _ = require("lodash"),
    spawn = require("child_process").spawn;

module.exports = command;

function command(name/*, args... */) {
  var args = _.rest(arguments),
      label = name + " " + args.join(" ");

  return function(callback) {
    var output = [],
        writeOutput = output.push.bind(output),
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
    child.stdout.on("data",writeOutput);

    child.stderr.setEncoding("utf8");
    child.stderr.on("data",writeOutput);

    child.on("exit",exit);
    
    return stop;

    
    function stop(cancelledCallback) {
      callback = cancelledCallback;
      child.kill("SIGINT");
    }

    
    function exit(code) {
      if (code === 0) {
        callback();
      } else {
        var err = new Error(name + " exited with error status " + code);
        err.stack = output.join("");
        callback(err);
      }
    }
  };
}
