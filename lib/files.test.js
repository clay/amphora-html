'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  expect = require('chai').expect,
  sinon = require('sinon'),
  fs = require('fs'),
  path = require('path'),
  glob = require('glob'),
  lib = require('./' + filename),
  pkg = require('../test/config/package.json');

  // log = require('./services/log'),
  // temp2env = require('template2env');

describe(_.startCase(filename), function () {
  let req, sandbox;

  function createMockStat(options) {
    return {
      isDirectory: _.constant(!!options.isDirectory)
    };
  }

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(fs, 'statSync');
    sandbox.stub(fs, 'readdirSync');
    sandbox.stub(fs, 'existsSync');
    sandbox.stub(fs, 'readFileSync');
    sandbox.stub(path, 'resolve');
    sandbox.stub(glob, 'sync');

    // clear the caches
    lib.getComponents.cache = new _.memoize.Cache();
    lib.getComponentPath.cache = new _.memoize.Cache();
    lib.isDirectory.cache = new _.memoize.Cache();
    lib.tryRequire.cache = new _.memoize.Cache();
    lib.readFilePromise.cache = new _.memoize.Cache();

    // package file can never be real
    lib.setPackageConfiguration(pkg);

    // require shouldn't be called dynamically, but here we go
    req = sandbox.stub();
    req.resolve = sandbox.stub();
    lib.setRequire(req);
  });

  afterEach(function () {
    sandbox.restore();
    lib.setRequire(require);
  });

  describe('getComponents', function () {
    const fn = lib[this.title];

    it('gets a list of internal components', function () {
      fs.readdirSync.withArgs('components').returns(['c1', 'c2']);
      fs.statSync.withArgs('components/c1').returns(createMockStat({isDirectory: true}));
      fs.statSync.withArgs('components/c2').returns(createMockStat({isDirectory: false}));
      path.resolve.returnsArg(0);

      expect(fn()).to.contain('c1', 'c2');
    });

    it('gets a list of npm components', function () {
      fs.readdirSync.withArgs('components').returns([]);
      path.resolve.returnsArg(0);

      expect(fn()).to.contain('clay-c3', 'clay-c4');
    });
  });

  describe('getComponentPath', function () {
    const fn = lib[this.title];

    beforeEach(function () {
      sandbox.stub(lib, 'getComponents');
      lib.getComponents.returns(['c1', 'clay-c5', 'clay-c3']);
      fs.existsSync.returns(false);
      fs.existsSync.withArgs('components/c1').returns(true);
      fs.existsSync.withArgs('node_modules/clay-c3').returns(true);
      fs.existsSync.withArgs('node_modules/@a/clay-c5').returns(true);
      path.resolve.withArgs('components', 'c1').returns('components/c1');
      path.resolve.withArgs('node_modules', 'clay-c3').returns('node_modules/clay-c3');
      path.resolve.withArgs('node_modules', '@a/clay-c5').returns('node_modules/@a/clay-c5');
    });

    it('returns null if name isn\'t a component', function () {
      expect(fn('c0')).to.equal(null);
    });

    it('gets an internal path', function () {
      expect(fn('c1')).to.equal('components/c1');
    });

    it('gets an npm path', function () {
      expect(fn('clay-c3')).to.equal('node_modules/clay-c3');
    });

    it('gets a scoped npm path', function () {
      expect(fn('clay-c5')).to.equal('node_modules/@a/clay-c5');
    });
  });

  describe('readFilePromise', function () {
    const fn = lib[this.title];

    it('returns file contents', function () {
      const result = 'result',
        name = 'article.css';

      sandbox.stub(fs, 'readFile', function (path, options, callback) {
        return callback(null, result);
      });

      fn(name).then(function (fileResult) {
        expect(fileResult).to.equal(result);
      });
    });

    it('throws error', function () {
      sandbox.stub(fs, 'readFile', function (path, x, callback) {
        return callback(new Error(), '');
      });

      fn('.').catch(function (result) {
        expect(result).to.be.an.instanceof(Error);
      });
    });
  });
});
