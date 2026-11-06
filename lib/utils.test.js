'use strict';

const { describe, it } = require('node:test'),
  assert = require('node:assert/strict'),
  lib = require('./utils');

describe('utils', () => {
  describe('isObject', () => {
    const fn = lib['isObject'];

    it('is true for objects and functions', () => {
      assert.equal(fn({}), true);
      assert.equal(fn([]), true);
      assert.equal(fn(() => {}), true);
      assert.equal(fn(new String('a')), true);
    });

    it('is false for null and primitives', () => {
      [null, undefined, 0, 'a', true, Symbol('a'), 1n].forEach((value) => assert.equal(fn(value), false));
    });
  });

  describe('assignValue', () => {
    const fn = lib['assignValue'];

    it('sets a property', () => {
      const object = { a: 1 };

      fn(object, 'b', 2);
      fn(object, 'a', 3);
      assert.deepEqual(object, { a: 3, b: 2 });
    });

    it('writes nothing when the object already has the value', () => {
      let writes = 0;
      const object = Object.defineProperty({}, 'a', { get: () => NaN, set: () => { writes++; }, enumerable: true });

      fn(object, 'a', NaN);
      assert.equal(writes, 0);
      fn(object, 'a', 1);
      assert.equal(writes, 1);
    });

    it('sets an inherited value as a property of its own', () => {
      const object = Object.create({ a: 1 });

      fn(object, 'a', 1);
      assert.ok(Object.hasOwn(object, 'a'));
    });

    it('makes a __proto__ key a property of its own', () => {
      const object = {},
        value = { polluted: true };

      fn(object, '__proto__', value);
      assert.equal(Object.getPrototypeOf(object), Object.prototype);
      assert.ok(Object.hasOwn(object, '__proto__'));
      assert.deepEqual(Object.keys(object), ['__proto__']);
      assert.equal(object.polluted, undefined);
    });

    it('leaves a property that can\'t be written as it is', () => {
      const frozen = Object.freeze({ a: 1 });

      fn(frozen, 'a', 2);
      fn(frozen, 'b', 2);
      assert.deepEqual(frozen, { a: 1 });
    });
  });

  describe('assign', () => {
    const fn = lib['assign'];

    it('copies the own enumerable properties, not symbols', () => {
      const symbol = Symbol('s'),
        source = Object.create({ inherited: 1 }),
        target = { a: 1 };

      source.b = 2;
      source[symbol] = 3;
      Object.defineProperty(source, 'hidden', { value: 4 });

      assert.equal(fn(target, source), target);
      assert.deepEqual(target, { a: 1, b: 2 });
    });

    it('copies a __proto__ key as a property of its own', () => {
      const target = fn({}, JSON.parse('{"__proto__": {"polluted": true}}'));

      assert.equal(target.polluted, undefined);
      assert.deepEqual(Object.keys(target), ['__proto__']);
    });

    it('copies the characters of a string, and nothing from null or numbers', () => {
      assert.deepEqual(fn({}, 'ab'), { 0: 'a', 1: 'b' });
      assert.deepEqual(fn({}, null), {});
      assert.deepEqual(fn({}, undefined), {});
      assert.deepEqual(fn({}, 5), {});
    });
  });

  describe('pick', () => {
    const fn = lib['pick'];

    it('picks own and inherited properties, in the order asked', () => {
      const object = Object.create({ inherited: 1 });

      object.own = 2;
      object.undef = undefined;
      assert.deepEqual(fn(object, ['own', 'inherited', 'undef', 'missing']), { own: 2, inherited: 1, undef: undefined });
      assert.deepEqual(Object.keys(fn(object, ['undef', 'own'])), ['undef', 'own']);
    });

    it('takes a single name', () => {
      assert.deepEqual(fn({ a: 1, b: 2 }, 'a'), { a: 1 });
    });

    it('never picks what reaches a prototype', () => {
      assert.deepEqual(fn({}, ['__proto__', 'constructor', 'prototype', 'toString']), { toString: Object.prototype.toString });
    });

    it('picks nothing from null or undefined', () => {
      assert.deepEqual(fn(null, ['a']), {});
      assert.deepEqual(fn(undefined, ['a']), {});
    });

    it('picks environment variables', () => {
      process.env.AMPHORA_HTML_PICK = 'yes';
      assert.deepEqual(fn(process.env, ['AMPHORA_HTML_PICK', 'AMPHORA_HTML_NOT_SET']), { AMPHORA_HTML_PICK: 'yes' });
      delete process.env.AMPHORA_HTML_PICK;
    });
  });

  describe('toList', () => {
    const fn = lib['toList'];

    it('lists every index of an array, holes included', () => {
      assert.deepEqual(fn(['a', , 'c']), ['a', undefined, 'c']); // eslint-disable-line no-sparse-arrays
    });

    it('lists the characters of a string, and the indices of anything with a length', () => {
      assert.deepEqual(fn('a😀'), ['a', '\ud83d', '\ude00']);
      assert.deepEqual(fn({ length: 2, 0: 'a', extra: 'b' }), ['a', undefined]);
    });

    it('lists the own values of other objects and functions', () => {
      const fnWithProps = Object.assign(() => {}, { a: 1 });

      assert.deepEqual(fn({ a: 1, b: 2 }), [1, 2]);
      assert.deepEqual(fn(fnWithProps), [1]);
      assert.deepEqual(fn({ length: -1, a: 1 }), [-1, 1]);
    });

    it('lists nothing for null, undefined and other primitives', () => {
      [null, undefined, 5, true].forEach((value) => assert.deepEqual(fn(value), []));
    });
  });

  describe('memoize', () => {
    const fn = lib['memoize'];

    it('remembers the result for each first argument, undefined included', () => {
      let calls = 0;
      const memoized = fn((a, b) => {
        calls++;
        return a === 'none' ? undefined : `${a}${b}`;
      });

      assert.equal(memoized('a', 1), 'a1');
      assert.equal(memoized('a', 2), 'a1');
      assert.equal(memoized('none'), undefined);
      assert.equal(memoized('none'), undefined);
      assert.equal(calls, 2);
    });

    it('does not remember an error', () => {
      let calls = 0;
      const memoized = fn(() => {
        calls++;
        throw new Error('nope');
      });

      assert.throws(() => memoized('a'));
      assert.throws(() => memoized('a'));
      assert.equal(calls, 2);
    });

    it('reads the cache on every call, so it can be cleared or replaced', () => {
      let calls = 0;
      const memoized = fn(() => ++calls);

      memoized('a');
      memoized.cache.clear();
      memoized('a');
      memoized.cache = new Map();
      memoized('a');
      assert.equal(calls, 3);
    });

    it('keeps a cache whose set returns nothing', () => {
      const store = new Map(),
        memoized = fn((a) => a + 1);

      memoized.cache = { has: (key) => store.has(key), get: (key) => store.get(key), set: (key, value) => { store.set(key, value); } };
      const cache = memoized.cache;

      assert.equal(memoized(1), 2);
      assert.equal(memoized.cache, cache);
      assert.equal(store.get(1), 2);
    });

    it('calls the function with the same this', () => {
      const object = { name: 'object', method: fn(function () { return this.name; }) };

      assert.equal(object.method('a'), 'object');
    });
  });
});
