'use strict';

const { describe, it } = require('node:test'),
  assert = require('node:assert/strict'),
  cloneDeep = require('./clone-deep');

describe('cloneDeep', () => {
  it('returns primitives as they are', () => {
    [undefined, null, 0, -0, NaN, 'a', true, 1n].forEach((value) => assert.ok(Object.is(cloneDeep(value), value)));

    const symbol = Symbol('s');

    assert.equal(cloneDeep(symbol), symbol);
  });

  it('copies objects and arrays all the way down', () => {
    const value = { a: [1, { b: 'c' }], d: { e: null, f: undefined } },
      copy = cloneDeep(value);

    assert.deepEqual(copy, value);
    assert.notEqual(copy, value);
    assert.notEqual(copy.a, value.a);
    assert.notEqual(copy.a[1], value.a[1]);
    assert.notEqual(copy.d, value.d);
    assert.ok(Object.hasOwn(copy.d, 'f'));
  });

  it('keeps the prototype of objects', () => {
    class Thing { constructor() { this.a = 1; } toJSON() { return 'thing'; } }
    const copy = cloneDeep({ thing: new Thing() });

    assert.ok(copy.thing instanceof Thing);
    assert.equal(JSON.stringify(copy), '{"thing":"thing"}');
  });

  it('gives a plain object for objects without a usable constructor, and for prototypes', () => {
    const bare = Object.assign(Object.create(null), { a: 1 }),
      selfMade = Object.assign(Object.create(null), { constructor: function () {} });

    function Thing() {}
    Thing.prototype.a = 1;

    assert.equal(Object.getPrototypeOf(cloneDeep(bare)), Object.prototype);
    assert.deepEqual(Object.keys(cloneDeep(bare)), ['a']);
    assert.equal(Object.getPrototypeOf(cloneDeep(selfMade)), Object.prototype);
    assert.equal(Object.getPrototypeOf(cloneDeep(Thing.prototype)), Object.prototype);
    assert.deepEqual(cloneDeep(Thing.prototype), { a: 1 });
  });

  it('copies a shared or circular object once', () => {
    const shared = { a: 1 },
      value = { first: shared, second: shared, list: [shared] };

    value.self = value;
    value.list.push(value.list);

    const copy = cloneDeep(value);

    assert.equal(copy.first, copy.second);
    assert.equal(copy.list[0], copy.first);
    assert.notEqual(copy.first, shared);
    assert.equal(copy.self, copy);
    assert.equal(copy.list[1], copy.list);
  });

  it('fills the holes of arrays, keeps what RegExp#exec adds and drops other properties', () => {
    const sparse = [1, , 3], // eslint-disable-line no-sparse-arrays
      match = /b(c)/.exec('abc'),
      extra = Object.assign([1], { name: 'x' });

    assert.ok(Object.hasOwn(cloneDeep(sparse), 1));
    assert.equal(cloneDeep(match).index, 1);
    assert.equal(cloneDeep(match).input, 'abc');
    assert.deepEqual([...cloneDeep(match)], ['bc', 'c']);
    assert.equal(cloneDeep(extra).name, undefined);
  });

  it('copies dates, regular expressions and boxed values', () => {
    const date = new Date(2020, 1, 2),
      regexp = /a(b)/gi,
      boxedString = new String('ab'),
      boxedSymbol = Object(Symbol('s'));

    regexp.lastIndex = 3;

    assert.notEqual(cloneDeep(date), date);
    assert.equal(cloneDeep(date).getTime(), date.getTime());
    assert.equal(cloneDeep(regexp).source, 'a(b)');
    assert.equal(cloneDeep(regexp).flags, 'gi');
    assert.equal(cloneDeep(regexp).lastIndex, 3);
    assert.equal(cloneDeep(/a/).flags, '');
    assert.equal(cloneDeep(new Boolean(false)).valueOf(), false);
    assert.equal(cloneDeep(new Number(2)).valueOf(), 2);
    assert.notEqual(cloneDeep(boxedString), boxedString);
    assert.equal(cloneDeep(boxedString).valueOf(), 'ab');
    assert.equal(cloneDeep(boxedSymbol).valueOf(), boxedSymbol.valueOf());
  });

  it('copies maps and sets, keeping the keys of maps', () => {
    const key = { k: 1 },
      item = { i: 1 },
      map = new Map([[key, item]]),
      set = new Set([item]),
      copy = cloneDeep({ map, set });

    assert.equal([...copy.map.keys()][0], key);
    assert.deepEqual(copy.map.get(key), item);
    assert.notEqual(copy.map.get(key), item);
    assert.equal(copy.map.get(key), [...copy.set][0]);
  });

  it('copies array buffers, data views and typed arrays', () => {
    const buffer = new Uint8Array([1, 2, 3, 4]).buffer,
      view = new DataView(buffer, 1, 2),
      typed = new Int16Array(buffer, 2, 1),
      copy = cloneDeep({ buffer, view, typed });

    assert.notEqual(copy.buffer, buffer);
    assert.deepEqual(new Uint8Array(copy.buffer), new Uint8Array([1, 2, 3, 4]));
    assert.equal(copy.view.byteOffset, 1);
    assert.equal(copy.view.byteLength, 2);
    assert.notEqual(copy.view.buffer, buffer);
    assert.equal(copy.typed[0], typed[0]);
    assert.notEqual(copy.typed.buffer, buffer);
  });

  it('gives a view of the same memory for buffers', () => {
    const buffer = Buffer.from('ab'),
      copy = cloneDeep(buffer);

    assert.notEqual(copy, buffer);
    copy[0] = 0x7a;
    assert.equal(buffer.toString(), 'zb');
  });

  it('keeps functions, errors and other objects it can\'t copy, or gives {} for them at the top', () => {
    const fn = Object.assign(function () {}, { a: { b: 1 } }),
      error = new Error('e'),
      weak = new WeakMap(),
      promise = Promise.resolve(),
      copy = cloneDeep({ fn, error, weak, promise });

    assert.equal(copy.fn, fn);
    assert.equal(copy.error, error);
    assert.equal(copy.weak, weak);
    assert.equal(copy.promise, promise);
    assert.deepEqual(cloneDeep(fn), { a: { b: 1 } });
    assert.notEqual(cloneDeep(fn).a, fn.a);
    assert.deepEqual(cloneDeep(error), {});
    assert.deepEqual(cloneDeep(async () => {}), {});
  });

  it('copies enumerable symbol keys and a __proto__ key', () => {
    const symbol = Symbol('s'),
      hidden = Symbol('h'),
      value = JSON.parse('{"__proto__": {"a": 1}}');

    value[symbol] = { b: 2 };
    Object.defineProperty(value, hidden, { value: 3 });

    const copy = cloneDeep(value);

    assert.deepEqual(copy[symbol], { b: 2 });
    assert.notEqual(copy[symbol], value[symbol]);
    assert.equal(copy[hidden], undefined);
    assert.equal(Object.getPrototypeOf(copy), Object.prototype);
    assert.deepEqual(Object.keys(copy), ['__proto__']);
  });

  it('copies the arguments object as a plain object', () => {
    const args = (function () { return arguments; }('a', 'b')),
      copy = cloneDeep(args);

    assert.equal(Object.getPrototypeOf(copy), Object.prototype);
    assert.deepEqual(copy, { 0: 'a', 1: 'b' });
  });
});
