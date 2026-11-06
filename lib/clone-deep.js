'use strict';

const { types } = require('util'),
  { isObject, assignValue } = require('./utils'),
  toString = Object.prototype.toString,
  // what gets copied; anything else (functions, errors, promises, weak maps...)
  // stays the same object, or becomes {} when it is the value given
  CLONEABLE = new Set([
    '[object Arguments]', '[object Array]', '[object ArrayBuffer]', '[object Boolean]',
    '[object DataView]', '[object Date]', '[object Float32Array]', '[object Float64Array]',
    '[object Int8Array]', '[object Int16Array]', '[object Int32Array]', '[object Map]',
    '[object Number]', '[object Object]', '[object RegExp]', '[object Set]', '[object String]',
    '[object Symbol]', '[object Uint8Array]', '[object Uint8ClampedArray]', '[object Uint16Array]',
    '[object Uint32Array]'
  ]);

/**
 * @param {ArrayBuffer} buffer
 * @returns {ArrayBuffer}
 */
function cloneArrayBuffer(buffer) {
  const result = new buffer.constructor(buffer.byteLength);

  new Uint8Array(result).set(new Uint8Array(buffer));
  return result;
}

/**
 * An empty object of the same kind, for the kinds that are not plain objects or arrays
 *
 * @param {Object} value
 * @param {string} tag
 * @returns {Object}
 */
function initCloneByTag(value, tag) { // eslint-disable-line complexity
  const Ctor = value.constructor;

  switch (tag) {
    case '[object ArrayBuffer]':
      return cloneArrayBuffer(value);
    case '[object Boolean]':
    case '[object Date]':
      return new Ctor(+value);
    case '[object DataView]':
      return new Ctor(cloneArrayBuffer(value.buffer), value.byteOffset, value.byteLength);
    case '[object Number]':
    case '[object String]':
      return new Ctor(value);
    case '[object RegExp]': {
      const result = new Ctor(value.source, /\w*$/.exec(value));

      result.lastIndex = value.lastIndex;
      return result;
    }
    case '[object Map]':
    case '[object Set]':
      return new Ctor();
    case '[object Symbol]':
      return Object(Symbol.prototype.valueOf.call(value));
    default:
      // typed arrays
      return new Ctor(cloneArrayBuffer(value.buffer), value.byteOffset, value.length);
  }
}

/**
 * An empty object with the prototype of `value`, unless `value` is a prototype
 * itself or its constructor is not a function
 *
 * @param {Object} value
 * @returns {Object}
 */
function initCloneObject(value) {
  const Ctor = value.constructor,
    proto = Object.getPrototypeOf(value),
    isPrototype = value === (typeof Ctor === 'function' && Ctor.prototype || Object.prototype);

  return typeof Ctor === 'function' && !isPrototype && isObject(proto) ? Object.create(proto) : {};
}

/**
 * An array of the same kind and length, with what RegExp#exec adds to its results
 *
 * @param {Array} array
 * @returns {Array}
 */
function initCloneArray(array) {
  const result = new array.constructor(array.length);

  if (array.length && typeof array[0] === 'string' && Object.hasOwn(array, 'index')) {
    result.index = array.index;
    result.input = array.input;
  }

  return result;
}

/**
 * Own enumerable keys, symbols included
 *
 * @param {Object} value
 * @returns {Array}
 */
function ownKeys(value) {
  return Object.keys(value).concat(Object.getOwnPropertySymbols(value).filter((symbol) => Object.prototype.propertyIsEnumerable.call(value, symbol)));
}

/**
 * @param {*} value
 * @param {Object} [parent]  the object `value` was read from
 * @param {Map} copies  the copy of every object copied so far
 * @returns {*}
 */
function baseClone(value, parent, copies) { // eslint-disable-line complexity
  if (!isObject(value)) {
    return value;
  }

  const isArray = Array.isArray(value);
  let result;

  if (isArray) {
    result = initCloneArray(value);
  } else {
    const tag = toString.call(value),
      isFunction = tag === '[object Function]' || tag === '[object GeneratorFunction]';

    if (Buffer.isBuffer(value)) {
      // a view of the same memory, as lodash's cloneDeep gave
      return value.subarray();
    }

    if (tag === '[object Object]' || tag === '[object Arguments]' || isFunction && !parent) {
      result = isFunction ? {} : initCloneObject(value);
    } else if (CLONEABLE.has(tag)) {
      result = initCloneByTag(value, tag);
    } else {
      return parent ? value : {};
    }
  }

  // an object met before (shared or circular) gets the same copy
  if (copies.has(value)) {
    return copies.get(value);
  }
  copies.set(value, result);

  if (types.isSet(value)) {
    value.forEach((item) => result.add(baseClone(item, value, copies)));
  } else if (types.isMap(value)) {
    value.forEach((item, key) => result.set(key, baseClone(item, value, copies)));
  }

  if (isArray) {
    // every index, holes included
    for (let index = 0; index < value.length; index++) {
      assignValue(result, index, baseClone(value[index], value, copies));
    }
  } else {
    for (const key of ownKeys(value)) {
      assignValue(result, key, baseClone(value[key], value, copies));
    }
  }

  return result;
}

/**
 * A deep copy, made the way lodash's cloneDeep made it: objects keep their
 * prototype, a shared or circular object is copied once, Dates, RegExps, Maps,
 * Sets, typed arrays and boxed values are copied, and functions, errors and
 * other objects that can't be copied are kept as they are.
 *
 * @param {*} value
 * @returns {*}
 */
function cloneDeep(value) {
  return baseClone(value, undefined, new Map());
}

module.exports = cloneDeep;
