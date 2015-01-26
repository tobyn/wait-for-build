"use strict";

exports.message = message;

function message(err) {
  if (err && err.message)
    return err.message;
  else
    return String(err);
}


exports.stack = stack;

function stack(err) {
  if (err && err.stack)
    return err.stack;
  else
    return message(err);
}
