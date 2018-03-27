'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  render = require('./render'),
  nymagHbs = require('clayhandlebars'),
  hbs = nymagHbs(),
  fs = require('fs'),
  glob = require('glob'),
  expect = require('chai').expect,
  sinon = require('sinon');

describe(_.startCase(filename), function () {
  let sandbox, fakeLog, getComponentPathStub, getComponentsStub;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    fakeLog = sandbox.stub();
    getComponentPathStub = sandbox.stub();
    getComponentsStub = sandbox.stub();

    sandbox.stub(glob, 'sync');
    lib.setFsFns({ getComponentPathStub, getComponentsStub });
    sandbox.stub(render, 'configure');
    lib.setLog(fakeLog);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('init', function () {
    const fn = lib[this.title];

    it('grabs handlebars templates from component directories', function () {
      sandbox.stub(fs, 'readFileSync');
      getComponentsStub.returns(['c1', 'c2', 'c3', 'c4']);
      getComponentPathStub.withArgs('c1').returns('/components/c1');
      getComponentPathStub.withArgs('c2').returns('/components/c2');
      getComponentPathStub.withArgs('c3').returns('/components/c3');
      getComponentPathStub.withArgs('c4').returns(null);
      glob.sync.withArgs('/components/c1/template.*').returns(['/components/c1/template.handlebars']);
      glob.sync.withArgs('/components/c2/template.*').returns(['/components/c2/template.hbs']);
      glob.sync.withArgs('/components/c3/template.*').returns(['/components/c3/template.nunjucks']);

      fn();
    });
  });

  describe('addHelpers', function () {
    const fn = lib[this.title];

    it('calls the `registerHelper` function for each prop/value', function () {
      sandbox.stub(hbs, 'registerHelper');
      fn({test: _.noop});
      expect(hbs.registerHelper.calledWith('test', _.noop)).to.be.true;
    });
  });

  describe('configureRender', function () {
    const fn = lib[this.title];

    it('calls the render `configure` function', function () {
      fn({ foo: 'bar' });

      sinon.assert.calledOnce(render.configure);
    });

    it('exposes the render options on the module', function () {
      fn({ foo: 'bar' });

      expect(lib.renderSettings).to.eql({ foo: 'bar' });
    });
  });

  describe('addPlugins', function () {
    const fn = lib[this.title];

    beforeEach(() => {
      // clear plugins
      lib.plugins.splice(0, lib.plugins.length);
    });

    it ('adds plugins', () => {
      fn([{
        render: _.noop
      }]);
      expect(lib.plugins).to.have.length(1);
    });

    it ('skips plugins with no `render` function', () => {
      fn([{}]);
      expect(lib.plugins).to.have.length(0);
    });
  });

  describe('addResolveMedia', function () {
    const fn = lib[this.title];

    it('attaches resolveMedia to the module if it is a function', function () {
      fn(_.noop);

      expect(lib.resolveMedia).to.be.a('function');
      lib.resolveMedia = undefined;
    });

    it('does not attach non-function arguments', function () {
      fn(1);

      expect(lib.resolveMedia).to.not.be.a('function');
      lib.resolveMedia = undefined;
    });
  });
});
