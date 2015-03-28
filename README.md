# wait-for-build

`wait-for-build` is a set of
[`connect`](https://github.com/senchalabs/connect#readme)/[`express`](
http://expressjs.com/) middleware for ensuring
assets are up to date before serving them.


## Install

```
npm install wait-for-build
```


## Example

```js
var app = require("express")(),
    staticFiles = require("serve-static")(__dirname + "/build");

var run = require("wait-for-build/run"),
    gulp = require("wait-for-build/gulp"),
    watch = require("wait-for-build/watch");

// wait-for-build doesn't directly depend on browserify or watchify, so
// they have to be provided if you want to use them.
var watchify = require("wait-for-build/watchify")(
  require("browserify"),
  require("watchify")
);


// Run an external command to build the home page.
app.get("/",run("make","templates"));


// Run a gulp task to build the main stylesheet, but only when one of
// the watched files changes.
var watchStylus = watch("stylesheets/**/*.styl"),
    buildCSS = watchStylus(gulp("css"));

app.get("/app.css",buildCSS);


// Use watchify to build a JS bundle.
var buildJS = watchify(function(browserify) {
  return browserify("./my-module");
});

app.get("/app.js",buildJS);


/* 
 * run and gulp just execute tasks. You need a static file server to
 * serve requested files once the tasks are complete.
 *
 * Due to the way watchify works, the watchify middleware sends the JS
 * itself, so requests to /app.js won't reach here.
 */
app.use(staticFiles);


process.stdin.on("data",function() {
  console.log("All assets will be rebuilt.");

  /*
   * You can request a rebuild manually whenever you want. This ensures
   * that any subsequent requests will be processed after a future
   * build.
   */
  buildCSS.rebuild();
  buildJS.rebuild();
});


app.listen(8080);
```


## API

Each `wait-for-build` middleware is a wrapper around a `Builder`.
Builders ensure that builds are started at the right time, and that
requests are served current assets. Each middleware assigns the methods
from its `Builder` to itself, so each middleware is also a builder.


### `Builder`

```js
var Builder = require("wait-for-build/Builder"),
    b = new Builder(myTask);

function myTask(callback) {
  // Do some possibly-asynchronous thing
  doSomethingAsync(callback);

  // Optional
  return function cancel(cancelCallback) {
    // Cancel task (possibly asynchronously)
    cancelCallback();
  };
}
```

A `Builder` executes a task. A task is a function that takes one
argument, a node-style callback. When executed, the task must perform a
build. When finished, the task must call the callback with the result
(or error).

Optionally, executing a task can return a cancel function. This function
will again accept a single callback argument, and will be called in the
event that `wait-for-build` determines that a build in progress has
become stale and needs to be restarted. When executed, this function
should attempt to cancel the build in progress, and must call the
provided callback when finished.

`Builder`s never run more than one build at a time. Separate `Builder`s
can run builds concurrently.

#### `builder.wait(callback)`

Calling `wait` on a `Builder` will cause `callback` to be called as soon
as the `Builder` has completed a sufficiently fresh build. The `Builder`
considers a build sufficiently fresh if it was started prior to the most
recent call to `rebuild`.

`callback` is called with whatever result was passed to the callback of
the most recently finished build. This depends on the task provided to
the `Builder`.

#### `builder.rebuild(eager)`

Calling `rebuild` on a `Builder` will ensure that all subsequent calls
to `wait` will not call their callbacks until a new build has finished.

If `eager` is truthy, this build will be started as soon as possible.
Otherwise, it won't be triggered until the next call to `wait`.


### `run`

```js
var run = require("wait-for-build/run"),
    middleware = run(command, [arguments...]);
```

Runs an external process to perform a build. If the process exits with a
zero status code, the request proceeds. Otherwise, an error is sent.

Since this middleware has no way of knowing whether its asset has
changed, it calls `rebuild` on each request.


### `gulp`

```js
var gulp = require("wait-for-build/gulp"),
    middleware = gulp([tasks...]);
```

Runs [Gulp](http://gulpjs.com) tasks in a separate process. Works just
like the `run` middleware.


### `watch`

```js
var watch = require("wait-for-build/watch"),
    watchFiles = watch(patterns...),
    middleware = watchFiles(builder, [options]);
```

Returns a middleware factory function. This function can be called with
a `builder` in order to produce a middleware that will only require a
rebuild when the files glob matched by `patterns` change.

The middleware factory function may also be provided an `options`
object. If `options.eager` is true, then a build is started whenever a
file changes (similar to most build tools with watch functionality).
Normally a build occurs on the next request.


### `watchify`

```js
var watchify = require("wait-for-build/watchify")(browserify,watchify),
    middleware = watchify(makeBundle, [options]);

function makeBundle(browserify) {
  return browserify("./my-module");
}
```

Uses [`watchify`](https://github.com/substack/watchify) to build a
[Browserify](http://browserify.org/) bundle. `wait-for-build` doesn't
directly depend on these tools, so they must be provided.

The `browserify` function passed to `makeBundle` is a proxy for the
`browserify` you passed in, so you can use the full Browserify API.

If an `options` object is provided, and `options.eager` is true, then a
new build will be started whenever the bundle changes. Normally a build
occurs on the next request.
