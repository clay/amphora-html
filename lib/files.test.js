'use strict';

const { describe, it, before, after, beforeEach } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  lib = require('./files');

describe('files', () => {
  let tmp;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amphora-html-files-'));
    fs.mkdirSync(path.join(tmp, 'dir', 'sub.css'), { recursive: true });
    ['a.css', 'a_b.css', 'a.test.css', 'README.md', 'a.md.css'].forEach((file) => fs.writeFileSync(path.join(tmp, 'dir', file), `/* ${file} */`));
  });

  after(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  beforeEach(() => {
    lib.fileExists.cache.clear();
    lib.getFiles.cache.clear();
    lib.readFilePromise.cache.clear();
  });

  describe('fileExists', () => {
    const fn = lib['fileExists'];

    it('is true for files and folders, false otherwise', () => {
      assert.equal(fn(path.join(tmp, 'dir', 'a.css')), true);
      assert.equal(fn(path.join(tmp, 'dir')), true);
      assert.equal(fn(path.join(tmp, 'dir', 'missing.css')), false);
      assert.equal(fn(undefined), false);
    });

    it('remembers the answer', () => {
      const file = path.join(tmp, 'later.css');

      assert.equal(fn(file), false);
      fs.writeFileSync(file, '');
      assert.equal(fn(file), false);
      lib.fileExists.cache.clear();
      assert.equal(fn(file), true);
    });

    it('only looks at the first argument, so it can be given to filter', () => {
      assert.deepEqual([path.join(tmp, 'dir', 'a.css'), path.join(tmp, 'nope')].filter(fn), [path.join(tmp, 'dir', 'a.css')]);
    });
  });

  describe('getFiles', () => {
    const fn = lib['getFiles'];

    it('lists the files of a folder, without folders, tests and documentation', () => {
      assert.deepEqual(fn(path.join(tmp, 'dir')).sort(), ['a.css', 'a_b.css']);
    });

    it('lists a link it can not follow as a file', () => {
      fs.mkdirSync(path.join(tmp, 'links'));
      fs.symlinkSync(path.join(tmp, 'nowhere'), path.join(tmp, 'links', 'broken_x.css'));
      assert.deepEqual(fn(path.join(tmp, 'links')), ['broken_x.css']);
    });

    it('lists nothing for a folder that does not exist', () => {
      assert.deepEqual(fn(path.join(tmp, 'missing')), []);
    });

    it('remembers the list', () => {
      assert.equal(fn(path.join(tmp, 'dir')), fn(path.join(tmp, 'dir')));
    });
  });

  describe('readFilePromise', () => {
    const fn = lib['readFilePromise'];

    it('reads a file once', async () => {
      const file = path.join(tmp, 'dir', 'a.css');

      assert.equal(await fn(file), '/* a.css */');
      assert.equal(fn(file), fn(file));
    });

    it('rejects with the error of fs, and remembers it', async () => {
      const file = path.join(tmp, 'dir', 'missing.css');

      await assert.rejects(fn(file), { code: 'ENOENT', syscall: 'open', path: file });
      assert.equal(fn(file), fn(file));
      await assert.rejects(fn(file), { code: 'ENOENT' });
    });

    it('rejects when the name is not a string', async () => {
      await assert.rejects(fn(undefined), { code: 'ERR_INVALID_ARG_TYPE' });
    });
  });
});
