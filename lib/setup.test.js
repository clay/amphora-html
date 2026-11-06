'use strict';

const { describe, it, before, after, beforeEach, afterEach, mock } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  lib = require('./setup'),
  render = require('./render');

describe('setup', () => {
  let tmp, fakeLog, getComponentPathStub, getComponentsStub, getLayoutsStub, getLayoutPathStub;

  // components/<name>/<file> with the given contents, under a temporary directory
  function write(dir, file, contents) {
    fs.mkdirSync(path.join(tmp, dir), { recursive: true });
    fs.writeFileSync(path.join(tmp, dir, file), contents);
  }

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amphora-html-setup-'));
    write('components/c1', 'template.handlebars', '<p class="c1">{{ a }}</p>');
    write('components/c2', 'template.hbs', '<p class="c2">{{ a }}</p>');
    write('components/c3', 'template.nunjucks', '<p class="c3">{{ a }}</p>');
    write('components/c5', 'schema.yml', '');
    // several template files: the first one in sorted order is used
    write('components/c6', 'template.hbs', 'hbs');
    write('components/c6', 'template.handlebars', 'handlebars');
    write('components/c7', 'template.js', 'js');
    write('components/c7', 'template.zz.hbs', 'zz');
    write('components/outer', 'template.hbs', '<pre>\n  {{> inner this }}\n</pre>');
    write('components/inner', 'template.hbs', 'a\nb');
    write('layouts/layout', 'template.handlebars', '<html>{{ a }}</html>');
  });

  after(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  beforeEach(() => {
    fakeLog = mock.fn();
    getComponentPathStub = mock.fn((name) => name === 'c4' ? null : path.join(tmp, 'components', name));
    getComponentsStub = mock.fn(() => []);
    getLayoutsStub = mock.fn(() => []);
    getLayoutPathStub = mock.fn((name) => path.join(tmp, 'layouts', name));

    lib.setFsFns({ getComponentPathStub, getComponentsStub, getLayoutsStub, getLayoutPathStub });
    lib.setLog(fakeLog);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('init', () => {
    const fn = lib['init'];

    it('grabs handlebars templates from component directories', () => {
      getComponentsStub.mock.mockImplementation(() => ['c1', 'c2', 'c3', 'c4', 'c5']);
      fn();

      assert.equal(typeof lib.hbs.partials.c1, 'function');
      assert.equal(typeof lib.hbs.partials.c2, 'function');
      assert.equal(lib.hbs.partials.c3, undefined);
      assert.equal(lib.hbs.partials.c4, undefined);
      assert.equal(lib.hbs.partials.c5, undefined);
      assert.match(lib.hbs.partials.c1({ _ref: 'site.com/_components/c1/instances/a', a: 'x' }), /<p class="c1">x<\/p>/);
      assert.match(lib.hbs.partials.c2({ _self: 'site.com/_components/c2/instances/a', a: 'y' }), /<p class="c2">y<\/p>/);
    });

    it('wraps each template so it renders nothing without a _ref', () => {
      getComponentsStub.mock.mockImplementation(() => ['c1']);
      fn();

      assert.match(lib.hbs.partials.c1({ a: 'x' }), /<!-- unable to render partial c1 without a supplied context -->/);
    });

    it('grabs handlebars templates from layout directories', () => {
      getLayoutsStub.mock.mockImplementation(() => ['layout']);
      fn();

      assert.match(lib.hbs.partials.layout({ _ref: 'site.com/_layouts/layout/instances/a', a: 'z' }), /<html>z<\/html>/);
    });

    it('uses the first template file in sorted order', () => {
      getComponentsStub.mock.mockImplementation(() => ['c6', 'c7']);
      fn();

      assert.match(lib.hbs.partials.c6({ _ref: 'x' }), /handlebars/);
      // template.js comes first and is not handlebars, so nothing is registered
      assert.equal(lib.hbs.partials.c7, undefined);
    });

    it('finds templates in folders whose names a glob would read as a pattern', () => {
      // glob read [x] as a character class and found nothing
      write('components/c[x]', 'template.hbs', 'brackets');
      getComponentsStub.mock.mockImplementation(() => ['c[x]']);
      fn();

      assert.match(lib.hbs.partials['c[x]']({ _ref: 'x' }), /brackets/);
    });

    it('finds templates from a relative path', () => {
      const cwd = process.cwd();

      write('components/relative', 'template.hbs', 'relative');
      getComponentsStub.mock.mockImplementation(() => ['relative']);
      getComponentPathStub.mock.mockImplementation((name) => path.join('components', name));
      process.chdir(tmp);
      try {
        fn();
      } finally {
        process.chdir(cwd);
      }

      assert.match(lib.hbs.partials.relative({ _ref: 'x' }), /relative/);
    });

    it('skips a path that is not a folder', () => {
      getComponentsStub.mock.mockImplementation(() => ['file']);
      getComponentPathStub.mock.mockImplementation(() => path.join(tmp, 'components', 'c1', 'template.handlebars'));
      fn();

      assert.equal(lib.hbs.partials.file, undefined);
    });

    it('compiles the templates without indenting the partials they call', () => {
      getComponentsStub.mock.mockImplementation(() => ['outer', 'inner']);
      fn();

      const html = lib.hbs.partials.outer({ _ref: 'x' });

      // with indenting, the second line of the inner partial would start with two spaces too
      assert.match(html, /a\nb\n<\/pre>/);
    });

    it('registers the partials on the environment it exports', () => {
      getComponentsStub.mock.mockImplementation(() => ['c1']);
      fn();

      assert.equal(lib.hbs, lib.handlebars);
      assert.equal(lib.handlebars.partials.c1, lib.hbs.partials.c1);
    });

    it('hands the partials to the renderer', () => {
      mock.method(render, 'setHbs');
      fn();

      assert.equal(render.setHbs.mock.calls[0].arguments[0], lib.hbs);
    });

    it('compiles a partial once', () => {
      getComponentsStub.mock.mockImplementation(() => ['c1']);
      fn();
      const compiled = lib.hbs.partials.c1;

      getComponentsStub.mock.mockImplementation(() => []);
      fn();
      assert.equal(lib.hbs.partials.c1, compiled);
    });
  });

  describe('addHelpers', () => {
    const fn = lib['addHelpers'];

    it('calls the `registerHelper` function for each prop/value', () => {
      const helper = () => 'helped';

      mock.method(lib.hbs, 'registerHelper');
      fn({ test: helper });
      assert.deepEqual(lib.hbs.registerHelper.mock.calls[0].arguments, ['test', helper]);
    });

    it('registers inherited helpers too', () => {
      const helper = () => 'inherited';

      mock.method(lib.hbs, 'registerHelper');
      fn(Object.create({ inherited: helper }));
      assert.deepEqual(lib.hbs.registerHelper.mock.calls[0].arguments, ['inherited', helper]);
    });
  });

  describe('configureRender', () => {
    const fn = lib['configureRender'];

    it('calls the render `configure` function', () => {
      mock.method(render, 'configure', () => {});
      fn({ foo: 'bar' });
      assert.deepEqual(render.configure.mock.calls[0].arguments, [{ foo: 'bar' }]);
    });

    it('exposes the render options on the module', () => {
      mock.method(render, 'configure', () => {});
      fn({ foo: 'bar' });
      assert.deepEqual(lib.renderSettings, { foo: 'bar' });
    });
  });

  describe('addPlugins', () => {
    const fn = lib['addPlugins'];

    beforeEach(() => {
      // clear plugins
      lib.plugins.splice(0, lib.plugins.length);
    });

    it('adds render plugins', () => {
      fn([{ render: () => {} }]);
      assert.equal(lib.plugins.length, 1);
    });

    it('adds postRender plugins', () => {
      fn([{ postRender: () => {} }]);
      assert.equal(lib.plugins.length, 1);
    });

    it('skips plugins with no `render` or `postRender` function', () => {
      fn([{ render: () => {} }, {}]);
      assert.equal(lib.plugins.length, 1);
      assert.deepEqual(fakeLog.mock.calls[0].arguments, ['error', 'Error in amphora-html addPlugins: No `render` or `postRender` func found for plugin at index 1']);
    });
  });

  describe('addResolveMedia', () => {
    const fn = lib['addResolveMedia'];

    afterEach(() => {
      lib.resolveMedia = undefined;
    });

    it('attaches resolveMedia to the module if it is a function', () => {
      const resolveMedia = () => {};

      fn(resolveMedia);
      assert.equal(lib.resolveMedia, resolveMedia);
    });

    it('does not attach non-function arguments', () => {
      fn(1);
      assert.equal(lib.resolveMedia, undefined);
    });
  });
});
