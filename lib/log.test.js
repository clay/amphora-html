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
  });
});
