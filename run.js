"use strict";

var defaults = require("lodash/object/defaults"),
    last = require("lodash/array/last"),
    rest = require("lodash/array/rest"),
    spawn = require("child_process").spawn,
    trimRight = require("lodash/string/trimRight"),
    popOptions = require("./common").popOptions,
    Builder = require("./Builder");

module.exports = factory;
module.exports.run = run;


function factory(command/*, args..., [options] */) {
  var args = rest(arguments),
      options = popOptions(args);

  var debug = options.debug,
      log = debug.bind(null,"(" + command + ")"),
      task = run.bind(null,command,args,log),
      builder = new Builder(task,options.eager,debug),
      rebuild = builder.rebuild,
      wait = builder.wait;

  middleware.wait = wait;
  middleware.rebuild = rebuild;

  return middleware;

  function middleware(req, res, next) {
    rebuild();
    wait(next);
  }
}


function run(command, args, log, callback) {
  var output = [],
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
  child.stdout.on("data",writeOut);

  child.stderr.setEncoding("utf8");
  child.stderr.on("data",writeErr);

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

  function writeErr(data) {
    writeIO("err:",data);
  }

  function writeOut(data) {
    writeIO("out:",data);
  }

  function writeIO(prefix, data) {
    var lines = data.split("\n");
    if (!last(lines).trim())
      lines.pop();

    lines.forEach(function(line) {
      log(prefix,trimRight(line));
    });

    output.push(data);
  }
}
