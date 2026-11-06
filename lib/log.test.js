'use strict';

const { describe, it, beforeEach, afterEach, mock } = require('node:test'),
  assert = require('node:assert/strict'),
  clayLog = require('clay-log'),
  pkg = require('../package.json');

describe('log', () => {
  let lib, logger;

  beforeEach(() => {
    logger = { name: 'logger' };
    mock.method(clayLog, 'init', () => {});
    mock.method(clayLog, 'getLogger', () => logger);
    mock.method(clayLog, 'meta', () => 'child logger');
    // the logger is set up when the module is first required
    delete require.cache[require.resolve('./log')];
    lib = require('./log');
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('init', () => {
    it('sets up clay-log when the module is required', () => {
      assert.equal(clayLog.init.mock.callCount(), 1);
      assert.deepEqual(clayLog.init.mock.calls[0].arguments, [{
        name: 'amphora-html',
        prettyPrint: true,
        meta: { amphoraHtmlVersion: pkg.version }
      }]);
    });

    it('does nothing when a logger is set', () => {
      lib.init();
      assert.equal(clayLog.init.mock.callCount(), 1);
    });

    it('sets up a logger when there is none', () => {
      lib.setLogger(undefined);
      lib.init();
      assert.equal(clayLog.init.mock.callCount(), 2);
    });
  });

  describe('setup', () => {
    it('calls clayLog.meta with a default when given no meta', () => {
      assert.equal(lib.setup(), 'child logger');
      assert.deepEqual(clayLog.meta.mock.calls[0].arguments, [{}, logger]);
    });

    it('passes meta through to clayLog.meta', () => {
      lib.setup({ hello: 'world' });
      assert.deepEqual(clayLog.meta.mock.calls[0].arguments, [{ hello: 'world' }, logger]);
    });

    it('uses the logger given to setLogger', () => {
      const other = { name: 'other' };

      lib.setLogger(other);
      lib.setup({ hello: 'world' });
      assert.equal(clayLog.meta.mock.calls[0].arguments[1], other);
    });
  });
});
