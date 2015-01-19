# wait-for-build

`wait-for-build` is a Connect/Express middleware for use in development
environments. It compiles assets on demand.


## Install

```
npm install wait-for-build
```

## API

```js
var waitForBuild = require("wait-for-build");
```

### `waitForBuild(groups, [config])`

Returns a new middleware. This middleware maps sets of request paths to
sets of source files via a user-defined build task. Requests to matching
paths trigger the associated task, and the middleware waits for the task
to complete before passing control down the pipeline.

The source files are watched for changes, and the task is not triggered
again unless one or more of them has changed since the last build. Since
event-based file watching isn't quite perfect, the middleware also has
an `invalidateAll` method that can be hooked up to a mechanism of your
choice (see the example below).

If the task fails with an error, the error is passed down the pipeline
in response to all requests for a matching path until another build is
triggered.

#### `groups: object`

Each entry in this object describes a set of paths, a set of source
files, and an associated build task. The entry key is a human-friendly
label, and its value is an object with the following mandatory entries:

* `task: function`

  The task to run to build the associated files. Tasks are functions
  that take node-style callbacks as their only argument. They *may* also
  return an additional function, which will be called if the build is
  cancelled.

* `match: string | string[]`

  Request paths that match this group. Paths are relative to / and globs
  are matched.

* `watch: string | string[]`

  Source files to watch for changes. Paths are relative to the root of
  the application and globs are matched.

#### `config: object`

The only valid entry for this object is currently:

`logger: object`

A [`winston`](https://github.com/flatiron/winston)-compatible logger.
`wait-for-build` doesn't depend on `winston`, but it will use a logger
if one is provided.


### `waitForBuild.command(name, [args...])`

Returns a task that executes a command in a child process with the given
arguments.


### `waitForBuild.gulp(task)`

Returns a task that executes the given gulp task in a child process.


### `waitForBuild.plainTextErrors`

An error handling middleware that sends a stack trace as plain text.


## Example

```js
var connect = require("connect"),
    path = require("path"),
    serveStatic = require("serve-static");

var waitForBuild = require("wait-for-build"),
    command = waitForBuild.command,
    gulp = waitForBuild.gulp;


var wait = waitForBuild({
  HTML: {
    task: gulp("jade"),
    match: "", // root path
    watch: "*.jade"
  },

  JS: {
    task: gulp("js"),
    match: ["**/*.js", "**/*.js.map"],
    watch: ["*.js", "components/**/*.js"]
  },

  CSS: {
    task: command("make","css"),
    match: "**/*.css",
    watch: ["*.styl", "components/**/*.styl"]
  }
});


var built = serveStatic(path.join(__dirname,"build"));

connect()
  .use(wait)
  .use(built)
  .use(waitForBuild.plainTextErrors)
  .listen(8080);

process.stdin.on("data",function() {
  // Pressing enter on the console will force all assets to be rebuilt
  // on the next request.
  console.log("All assets will be rebuilt.");
  wait.invalidateAll();
});
```
