'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  files = require('nymag-fs'),
  path = require('path'),
  render = require('./render'),
  nymagHbs = require('nymag-handlebars'),
  hbs = nymagHbs(),
  expect = require('chai').expect,
  sinon = require('sinon'),
  FAKE_ROOT = path.resolve(__dirname, '../test/config');

describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(render, 'configure');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('addHelpers', function () {
    const fn = lib[this.title];

    it('calls the `registerHelper` function for each prop/value', function () {
      sandbox.stub(hbs, 'registerHelper');
      fn({test: _.noop});
      expect(hbs.registerHelper.calledWith('test', _.noop)).to.be.true;
    });
  });

  describe('assignPkg', function () {
    const fn = lib[this.title],
      fakePkg = require('../test/config/package.json');

    it('assigns the pkg value', function () {
      expect(fn(fakePkg)).to.eql(fakePkg);
    });
  });

  describe('addRootPath', function () {
    const fn = lib[this.title];

    it('exposes the Handlebars on the module', function () {
      sandbox.stub(hbs);
      hbs.compile.returns(_.noop);
      hbs.registerPartial.returns(_.noop);
      sandbox.stub(files, 'getFolders').returns([]);
      fn(FAKE_ROOT);
      expect(lib).to.not.be.undefined;
    });

    it('checks if a template is handlebars then register and compiles it', function () {
      sandbox.stub(hbs, 'compile');
      fn(FAKE_ROOT);
      expect(hbs.compile.calledWith('foo')).to.not.be.undefined;
    });

    it('handles if a component does not exist', function () {
      sandbox.stub(lib, 'getComponentName').returns(false);
      sandbox.stub(hbs, 'registerPartial');
      fn(FAKE_ROOT);
      expect(hbs.registerPartial.calledOnce).to.be.false;
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
        render(ref, data, locals) { // eslint-disable-line no-unused-vars
          return data;
        }
      }]);
      expect(lib.plugins).to.have.length(1);
    });

    it ('skips plugins with no `render` function', () => {
      fn([{}]);
      expect(lib.plugins).to.have.length(0);
    });
  });

});
