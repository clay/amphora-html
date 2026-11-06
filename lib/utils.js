'use strict';

// The few behaviors of lodash that amphora-html depends on, in native code.

/**
 * Whether a value is an object or a function, as lodash's isObject
 *
 * @param {*} value
 * @returns {boolean}
 */
function isObject(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

/**
 * Set a property the way lodash's assign and set did: nothing is written when
 * the object already has that value, a `__proto__` key becomes a property of
 * its own instead of replacing the prototype, and a property that can't be
 * written is left as it is instead of throwing.
 *
 * @param {Object} object
 * @param {string|symbol} key
 * @param {*} value
 */
function assignValue(object, key, value) {
  const current = object[key];

  // SameValueZero, like lodash's eq
  if (Object.hasOwn(object, key) && (current === value || Number.isNaN(current) && Number.isNaN(value))) {
    return;
  }

  if (key === '__proto__') {
    Object.defineProperty(object, key, { configurable: true, enumerable: true, value, writable: true });
  } else {
    Reflect.set(object, key, value);
  }
}

/**
 * Copy the own enumerable properties of `source` onto `target`, as lodash's assign
 *
 * @param {Object} target
 * @param {*} source
 * @returns {Object} target
 */
function assign(target, source) {
  for (const key of Object.keys(Object(source))) {
    assignValue(target, key, source[key]);
  }

  return target;
}

/**
 * The properties of `object` with these names, as lodash's pick: a name is
 * picked when it is `in` the object, inherited or not, except the ones that
 * would reach a prototype.
 *
 * @param {Object} object
 * @param {string[]|string} keys
 * @returns {Object}
 */
function pick(object, keys) {
  const picked = {};

  for (const key of [].concat(keys)) {
    if (object != null && key in Object(object) && key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
      picked[key] = object[key];
    }
  }

  return picked;
}

/**
 * The items of a collection, as lodash's map and each see them: nothing for
 * null or undefined, every index of an array or anything with a length
 * (holes included), the own values of anything else.
 *
 * @param {*} collection
 * @returns {Array}
 */
function toList(collection) {
  if (collection == null) {
    return [];
  }

  if (typeof collection !== 'function' && Number.isSafeInteger(collection.length) && collection.length >= 0) {
    return Array.from({ length: collection.length }, (item, index) => collection[index]);
  }

  return Object.values(Object(collection));
}

/**
 * Remember what `fn` returns for each first argument, as lodash's memoize:
 * the cache is read from `memoized.cache` on every call, so it can be cleared
 * or replaced with anything that has `get`, `set` and `has`.
 *
 * @param {Function} fn
 * @returns {Function}
 */
function memoize(fn) {
  function memoized(key) {
    const cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, arguments);

    memoized.cache = cache.set(key, result) || cache;
    return result;
  }

  memoized.cache = new Map();
  return memoized;
}

module.exports.isObject = isObject;
module.exports.assignValue = assignValue;
module.exports.assign = assign;
module.exports.pick = pick;
module.exports.toList = toList;
module.exports.memoize = memoize;
