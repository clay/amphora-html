'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  render = require('./render'),
  nymagHbs = require('clayhandlebars'),
  hbs = nymagHbs(),
  fs = require('fs'),
  glob = require('glob');

jest.mock('fs', () => ({
  readdirSync: () => '',
  readFileSync: () => ''
}));

describe(_.startCase(filename), () => {
  let fakeLog, getComponentPathStub, getComponentsStub;

  beforeEach(() => {
    fakeLog = jest.fn();
    getComponentPathStub = jest.fn();
    getComponentsStub = jest.fn();

    jest.spyOn(glob, 'sync');
    lib.setFsFns({ getComponentPathStub, getComponentsStub });
    jest.spyOn(render, 'configure');
    lib.setLog(fakeLog);
  });

  describe('init', () => {
    const fn = lib['init'];

    test('grabs handlebars templates from component directories', () => {
      jest.spyOn(fs, 'readFileSync');
      getComponentsStub.mockReturnValue(['c1', 'c2', 'c3', 'c4']);
      getComponentPathStub.mockImplementation((name) => {
        if (name === 'c1') return '/components/c1';
        if (name === 'c2') return '/components/c2';
        if (name === 'c3') return '/components/c3';
        if (name === 'c4') return null;
        return undefined;
      });

      glob.sync.mockImplementation((path) => {
        if (path === '/components/c1/template.*') return ['/components/c1/template.handlebars'];
        if (path === '/components/c2/template.*') return ['/components/c2/template.hbs'];
        if (path === '/components/c3/template.*') return ['/components/c3/template.nunjucks'];
        return null;
      });

      fn();
    });
  });

  describe('addHelpers', () => {
    const fn = lib['addHelpers'];

    test('calls the `registerHelper` function for each prop/value', () => {
      jest.spyOn(hbs, 'registerHelper');
      fn({test: _.noop});
      expect(hbs.registerHelper.mock.calls[0]).toEqual([
        'test',
        _.noop
      ]);
    });
  });

  describe('configureRender', () => {
    const fn = lib['configureRender'];

    test('calls the render `configure` function', () => {
      fn({ foo: 'bar' });
      expect(render.configure.mock.calls.length).toBe(1);
    });

    test('exposes the render options on the module', () => {
      fn({ foo: 'bar' });
      expect(lib.renderSettings).toEqual({ foo: 'bar' });
    });
  });

  describe('addPlugins', () => {
    const fn = lib['addPlugins'];

    beforeEach(() => {
      // clear plugins
      lib.plugins.splice(0, lib.plugins.length);
    });

    test('adds plugins', () => {
      fn([{
        render: _.noop
      }]);
      expect(lib.plugins.length).toBe(1);
    });

    test('skips plugins with no `render` function', () => {
      fn([{}]);
      expect(lib.plugins.length).toBe(0);
    });
  });

  describe('addResolveMedia', () => {
    const fn = lib['addResolveMedia'];

    afterEach(function () {
      lib.resolveMedia = undefined;
    });

    test('attaches resolveMedia to the module if it is a function', () => {
      fn(_.noop);

      expect(lib.resolveMedia).toBeInstanceOf(Function);
    });

    test('does not attach non-function arguments', () => {
      fn(1);
      expect(lib.resolveMedia).toBeUndefined();
    });
  });
});
