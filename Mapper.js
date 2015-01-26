"use strict";

var _ = require("lodash");

module.exports = Mapper;

function Mapper(match) {
  var mappings = [];

  this.map = map;
  this.get = get;
  this.invalidateAll = invalidateAll;


  function map(keyMatcher, value) {
    mappings.push([keyMatcher, value]);
  }

  function get(key) {
    var mapping = _.find(mappings,function(m) {
      return match(m[0],key);
    });

    if (mapping)
      return mapping[1];
  }

  function invalidateAll() {
    mappings.forEach(function(m) {
      m[1].invalidate();
    });
  }
}
