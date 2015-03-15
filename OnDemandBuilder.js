"use strict";

var Builder = require("./Builder"),
    superWait = Builder.prototype.wait;

module.exports = OnDemandBuilder;

function OnDemandBuilder(task, log) {
  Builder.call(this,task,false,log);
}

OnDemandBuilder.prototype = Object.create(Builder.prototype);

OnDemandBuilder.prototype.wait = function(callback) {
  this.rebuild();
  superWait.call(this,callback);
};
