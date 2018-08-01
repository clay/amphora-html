'use strict';

const dirname = __dirname.split('/').pop(),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  clayLog = require('clay-log'),
  fakeLog = {};

describe(dirname, () => {
  describe(filename, () => {
    describe('init', () => {
      const fn = lib['init'];

      test('initializes a logger when non-exists', () => {
        fn();
        expect(clayLog.init.mock.calls.length).toBe(1);
      });

      test('returns if a log instance is set', () => {
        lib.setLogger(fakeLog);
        fn();
        expect(clayLog.init.mock.calls.length).toBe(0);
      });
    });

    describe('setup', () => {
      const fn = lib['setup'];

      test('calls clayLog.meta with a default when provided no meta', () => {
        fn();
        expect(clayLog.meta.mock.calls.length).toBe(1);
        expect(clayLog.meta.mock.calls[0][0]).toEqual({});
      });

      test('passed meta through to clayLog.meta', () => {
        fn({hello: 'world'});
        expect(clayLog.meta.mock.calls.length).toBe(1);
        expect(clayLog.meta.mock.calls[0][0]).toEqual({hello: 'world'});
      });
    });
  });
});
