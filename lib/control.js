'use strict';

let memoryLeakThreshold = 32768;
const _ = require('lodash'),
  // log = console.log, // TODO: HOW DO WE LOG WITH AMPHORA?
  minute = 60000;

function defineReadOnly(definition) {
  if (!definition.get) {
    definition.writable = false;
  }
  definition.enumerable = false;
  definition.configurable = false;
  delete definition.set;
  return definition;
}

function defineWritable(definition) {
  if (!definition.set && !definition.get) {
    definition.writable = true;
  }
  definition.enumerable = false;
  definition.configurable = false;
  return definition;
}

/**
 * Report that a memory leak occurred
 * @param {function} fn
 * @param {object} cache
 */
function reportMemoryLeak(fn, cache) {
  // TODO: Change to log service
  console.warn('memory leak', fn.name, cache);
}

/**
 * Memoize, but warn if the target is not suitable for memoization
 * @param {function} fn
 * @returns {function}
 */
function memoize(fn) {
  const dataProp = '__data__.string.__data__',
    memFn = _.memoize.apply(_, _.slice(arguments)),
    report = _.throttle(reportMemoryLeak, minute),
    controlFn = function () {
      const result = memFn.apply(null, _.slice(arguments));

      if (_.size(_.get(memFn, `cache.${dataProp}`)) >= memoryLeakThreshold) {
        report(fn, _.get(memFn, `cache.${dataProp}`));
      }

      return result;
    };

  Object.defineProperty(controlFn, 'cache', defineWritable({
    get() { return memFn.cache; },
    set(value) { memFn.cache = value; }
  }));

  return controlFn;
}

function setMemoryLeakThreshold(value) {
  memoryLeakThreshold = value;
}

function getMemoryLeakThreshold() {
  return memoryLeakThreshold;
}

module.exports.defineReadOnly = defineReadOnly;
module.exports.defineWritable = defineWritable;
module.exports.memoize = memoize;

module.exports.setMemoryLeakThreshold = setMemoryLeakThreshold;
module.exports.getMemoryLeakThreshold = getMemoryLeakThreshold;
