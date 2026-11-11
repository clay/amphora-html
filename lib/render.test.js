'use strict';

const { describe, it, beforeEach, afterEach, mock } = require('node:test'),
  assert = require('node:assert/strict'),
  setup = require('./setup'),
  lib = require('./render'),
  mediaService = require('./media'),
  styleguide = require('./styleguide');

describe('render', () => {
  let fakeLog, getSchemaPathStub, getComponentPathStub, getIndicesStub, hbs;

  beforeEach(() => {
    fakeLog = mock.fn();
    getSchemaPathStub = mock.fn((path) => path && `${path}/schema.yml`);
    getComponentPathStub = mock.fn((name) => `/components/${name}`);
    getIndicesStub = mock.fn();
    hbs = {
      partials: {
        layout: mock.fn(() => '<html></html>'),
        foo: mock.fn(() => '<div></div>')
      }
    };
    setup.plugins = [];

    mock.method(styleguide, 'setDefaultVariations');
    lib.setFsFns({ getSchemaPathStub, getComponentPathStub, getIndicesStub });
    lib.setLog(fakeLog);
    lib.setHbs(hbs);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  function mockRes() {
    return {
      type: mock.fn(),
      send: mock.fn(),
      status: mock.fn()
    };
  }

  function mockData() {
    return {
      _ref: 'site.com/_components/foo/instances/foo',
      bar: true
    };
  }

  function mockPageMeta() {
    return {
      _layoutRef: 'site.com/_layouts/layout/instances/foo',
      _ref: 'site.com/_pages/index',
      locals: {
        host: 'host.com'
      }
    };
  }

  function mockPageMetaWithStyleguide() {
    return {
      _layoutRef: 'site.com/_layouts/layout/instances/foo',
      _ref: 'site.com/_pages/index',
      locals: {
        host: 'host.com',
        site: {
          styleguide: 'stylez'
        }
      }
    };
  }

  function mockCmptMeta() {
    return {
      _ref: 'site.com/_components/foo/instances/foo',
      locals: {
        host: 'host.com'
      }
    };
  }

  // the HTML goes through untouched
  function skipMedia() {
    mock.method(mediaService, 'injectScriptsAndStyles', () => (html) => html);
  }

  describe('render', () => {
    it('if not in edit mode, calls hooks from plugins\' `render` functions', async () => {
      const res = mockRes(),
        plugin = mock.fn(() => 1);

      skipMedia();
      setup.plugins = [{ render: plugin }];

      await lib(mockData(), mockPageMeta(), res);
      assert.equal(plugin.mock.callCount(), 1);
    });

    it('calls the `render` hooks in order, each with what the one before returned, and waits for promises', async () => {
      const res = mockRes(),
        data = mockData(),
        meta = mockPageMeta(),
        first = mock.fn(() => Promise.resolve({ _ref: data._ref, step: 1 })),
        second = mock.fn((ref, val) => ({ _ref: val._ref, step: val.step + 1 }));

      skipMedia();
      setup.plugins = [{ render: first }, { postRender: (ref, html) => html }, { render: second }];

      await lib(data, meta, res);
      assert.deepEqual(first.mock.calls[0].arguments, [meta._layoutRef, data, meta.locals]);
      assert.deepEqual(second.mock.calls[0].arguments[1], { _ref: data._ref, step: 1 });
      assert.equal(hbs.partials.layout.mock.calls[0].arguments[0].step, 2);
    });

    it('with no data, starts from the first `render` plugin instead of calling it', async () => {
      const first = { render: mock.fn() },
        second = { render: mock.fn(() => ({ from: 'second' })) },
        meta = mockPageMeta();

      skipMedia();
      setup.plugins = [first, second];

      await lib(undefined, meta, mockRes());
      assert.equal(first.render.mock.callCount(), 0);
      assert.deepEqual(second.render.mock.calls[0].arguments, [meta._layoutRef, first, meta.locals]);
      assert.equal(hbs.partials.layout.mock.calls[0].arguments[0].from, 'second');
    });

    it('passes no ref to the `render` hooks of a component', async () => {
      const plugin = mock.fn((ref, data) => data);

      skipMedia();
      setup.plugins = [{ render: plugin }];

      await lib(mockData(), mockCmptMeta(), mockRes());
      assert.equal(plugin.mock.calls[0].arguments[0], undefined);
    });

    it('if not in edit mode, calls hooks from plugins\' `postRender` functions', async () => {
      const res = mockRes(),
        meta = mockPageMeta(),
        plugin = mock.fn(() => 'html');

      skipMedia();
      setup.plugins = [{ postRender: plugin }];

      await lib(mockData(), meta, res);
      assert.equal(plugin.mock.callCount(), 1);
      assert.deepEqual(plugin.mock.calls[0].arguments, [meta._layoutRef, '<html></html>', meta.locals, res, meta._ref]);
      assert.equal(res.send.mock.calls[0].arguments[0], 'html');
    });

    it('passes each `postRender` hook the HTML returned by the one before it', async () => {
      const res = mockRes(),
        first = mock.fn((ref, html) => Promise.resolve(html.replace('</html>', '<i>first</i></html>'))),
        second = mock.fn((ref, html) => html.replace('</html>', '<i>second</i></html>'));

      skipMedia();
      setup.plugins = [{ postRender: first }, { postRender: second }];

      await lib(mockData(), mockPageMeta(), res);
      assert.equal(first.mock.calls[0].arguments[1], '<html></html>');
      assert.equal(second.mock.calls[0].arguments[1], '<html><i>first</i></html>');
      assert.equal(res.send.mock.calls[0].arguments[0], '<html><i>first</i><i>second</i></html>');
    });

    it('if in edit mode, do not call hooks from plugins\' `postRender` functions', async () => {
      const res = mockRes(),
        meta = mockPageMeta(),
        plugin = mock.fn(() => 'html');

      skipMedia();
      meta.locals.edit = true;
      setup.plugins = [{ postRender: plugin }];

      await lib(mockData(), meta, res);
      assert.equal(plugin.mock.callCount(), 0);
      assert.equal(res.send.mock.calls[0].arguments[0], '<html></html>');
    });

    it('Given it is edit mode, skips hooks from plugins\' `render` and `postRender` functions', async () => {
      const res = mockRes(),
        meta = mockPageMeta(),
        plugin1 = mock.fn(() => 1),
        plugin2 = mock.fn(() => 1);

      skipMedia();
      getIndicesStub.mock.mockImplementation(() => ({ components: ['foo'] }));
      meta.locals.edit = true;
      setup.plugins = [{ render: plugin1, postRender: plugin2 }];

      await lib('some data', meta, res);
      assert.equal(plugin1.mock.callCount(), 0);
      assert.equal(plugin2.mock.callCount(), 0);
    });

    it('renders a page with a layout', async () => {
      const res = mockRes();

      skipMedia();
      await lib(mockData(), mockPageMeta(), res);
      assert.deepEqual(res.type.mock.calls[0].arguments, ['text/html']);
      assert.equal(res.send.mock.calls[0].arguments[0], '<html></html>');
    });

    it('gives the layout the page data merged into the state', async () => {
      const data = mockData(),
        meta = mockPageMeta();

      skipMedia();
      getIndicesStub.mock.mockImplementation(() => ({ components: ['foo'] }));

      await lib(data, meta, mockRes());

      const state = hbs.partials.layout.mock.calls[0].arguments[0];

      assert.equal(state._self, meta._ref);
      assert.deepEqual(state._components, ['foo']);
      assert.deepEqual(state._layoutData, { name: 'layout', uri: meta._layoutRef });
      assert.equal(state.locals, meta.locals);
      assert.equal(state._layoutRef, meta._layoutRef);
      assert.equal(state.bar, true);
      assert.equal(state._ref, data._ref);
      assert.ok(Array.isArray(state._usedVariations));
      assert.equal(state._componentData, undefined);
    });

    it('look for component variations', async () => {
      skipMedia();
      mock.method(styleguide, 'getVariations', () => ({}));

      await lib(mockData(), mockPageMetaWithStyleguide(), mockRes());
      assert.equal(styleguide.getVariations.mock.callCount(), 1);
      assert.deepEqual(styleguide.getVariations.mock.calls[0].arguments, ['stylez']);
    });

    it('looks for the variations of the _default styleguide when the site has none', async () => {
      skipMedia();
      mock.method(styleguide, 'getVariations', () => ({}));

      await lib(mockData(), mockPageMeta(), mockRes());
      assert.deepEqual(styleguide.getVariations.mock.calls[0].arguments, ['_default']);
    });

    it('set default component variations', async () => {
      skipMedia();
      mock.method(styleguide, 'getVariations', () => ({
        video: ['video_fullbleed', 'video_mobile']
      }));

      await lib(mockData(), mockPageMetaWithStyleguide(), mockRes());
      assert.equal(styleguide.setDefaultVariations.mock.callCount(), 1);
    });

    it('renders a component individually', async () => {
      const res = mockRes();

      skipMedia();
      await lib(mockData(), mockCmptMeta(), res);
      assert.equal(res.send.mock.calls[0].arguments[0], '<div></div>');
    });

    it('in edit mode, gives kiln a copy of the data made before the templates run', async () => {
      const data = { _ref: 'site.com/_components/foo/instances/foo', list: [{ a: 1 }] },
        meta = mockCmptMeta();

      skipMedia();
      meta.locals.edit = true;
      hbs.partials.foo.mock.mockImplementation((state) => {
        // templates are allowed to change what they are given
        state.list.push({ a: 2 });
        return '<div></div>';
      });

      await lib(data, meta, mockRes());

      const state = hbs.partials.foo.mock.calls[0].arguments[0];

      // the default variation is set before the copy is made
      assert.deepEqual(state._componentData, { _ref: data._ref, list: [{ a: 1 }], componentVariation: 'foo' });
      assert.notEqual(state._componentData.list, data.list);
    });

    it('in edit mode, adds the env vars and the schemas of the components', async () => {
      const meta = mockPageMeta();

      skipMedia();
      process.env.AMPHORA_HTML_TEST_VAR = 'value';
      lib.addEnvVars(['AMPHORA_HTML_TEST_VAR', 'AMPHORA_HTML_UNSET_VAR']);
      getIndicesStub.mock.mockImplementation(() => ({ components: ['foo', 'bar'] }));
      meta.locals.edit = true;

      await lib(mockData(), meta, mockRes());

      const state = hbs.partials.layout.mock.calls[0].arguments[0];

      assert.deepEqual(state._envVars, { AMPHORA_HTML_TEST_VAR: 'value' });
      assert.deepEqual(state._componentSchemas, [
        { name: 'foo', schema: '/components/foo/schema.yml' },
        { name: 'bar', schema: '/components/bar/schema.yml' }
      ]);
      delete process.env.AMPHORA_HTML_TEST_VAR;
    });

    it('given a template is not found, returns a reject promise', async () => {
      const res = mockRes(),
        meta = mockCmptMeta();

      meta._ref = 'site.com/_components/bar/instances/bar';

      await lib(mockData(), meta, res);
      assert.equal(res.status.mock.calls[0].arguments[0], 500);
      assert.equal(fakeLog.mock.calls[0].arguments[0], 'error');
      assert.equal(fakeLog.mock.calls[0].arguments[1], 'Missing template for bar');
      assert.equal(res.send.mock.calls[0].arguments[0].message, 'Missing template for bar');
    });

    it('sends a 500 when a `render` hook fails', async () => {
      const res = mockRes();

      setup.plugins = [{ render: () => Promise.reject(new Error('nope')) }];

      await lib(mockData(), mockPageMeta(), res);
      assert.equal(res.status.mock.calls[0].arguments[0], 500);
      assert.equal(fakeLog.mock.calls[0].arguments[1], 'nope');
    });

    it('logs how long the render took', async () => {
      const meta = mockPageMeta();

      skipMedia();
      meta.locals.url = 'http://host.com/';

      await lib(mockData(), meta, mockRes());
      assert.equal(fakeLog.mock.calls[0].arguments[0], 'info');
      assert.match(fakeLog.mock.calls[0].arguments[1], /^rendered route: http:\/\/host\.com\/ \(\d+ms\)$/);
      assert.equal(fakeLog.mock.calls[0].arguments[2].route, meta.locals.url);
      assert.equal(fakeLog.mock.calls[0].arguments[2].type, 'html');
    });

    describe('configure', () => {
      const fn = lib['configure'];

      it('calls the mediaService configure function', () => {
        mock.method(mediaService, 'configure', () => {});
        fn({ editAssetTags: true, cacheBuster: 'abc' });
        assert.deepEqual(mediaService.configure.mock.calls[0].arguments, [true, 'abc']);
      });

      it('adds modulepreload to the edit asset options', () => {
        mock.method(mediaService, 'configure', () => {});
        fn({ editAssetTags: { styles: true }, cacheBuster: 'abc', modulepreload: true });
        assert.deepEqual(mediaService.configure.mock.calls[0].arguments, [{ styles: true, modulepreload: true }, 'abc']);
      });

      it('leaves the edit asset options alone without modulepreload', () => {
        const editAssetTags = { styles: true };

        mock.method(mediaService, 'configure', () => {});
        fn({ editAssetTags });
        assert.deepEqual(mediaService.configure.mock.calls[0].arguments[0], { styles: true });
        assert.notEqual(mediaService.configure.mock.calls[0].arguments[0], editAssetTags);
      });
    });

    describe('addEnvVars', () => {
      const fn = lib['addEnvVars'];

      it('sets env vars', () => {
        fn(['foo', 'bar', 'baz']);
        assert.equal(fakeLog.mock.callCount(), 1);
      });
    });

    describe('makeState', () => {
      const fn = lib['makeState'];

      it('adds layout schema to _layoutData state in edit mode if given a _layoutRef', () => {
        const meta = mockPageMeta();

        getIndicesStub.mock.mockImplementation(() => ({ components: ['foo'] }));
        meta.locals.edit = true;

        assert.ok(Object.hasOwn(fn(mockData(), meta)._layoutData, 'schema'));
      });

      it('does not add layout to state if not given a _layoutRef', () => {
        const meta = mockPageMeta();

        delete meta._layoutRef;
        getIndicesStub.mock.mockImplementation(() => ({ components: ['foo'] }));

        const state = fn(mockData(), meta);

        assert.ok(!Object.hasOwn(state, '_layoutData'));
        assert.ok(!Object.hasOwn(state, '_layoutRef'));
      });

      it('finds the components of the layout, or of the component', () => {
        const data = mockData(),
          meta = mockPageMeta(),
          layoutRef = meta._layoutRef;

        getIndicesStub.mock.mockImplementation(() => ({ components: ['foo'] }));
        fn(data, meta);
        delete meta._layoutRef;
        fn(data, meta);

        assert.deepEqual(getIndicesStub.mock.calls.map((call) => call.arguments), [
          [layoutRef, data],
          [meta._ref, data]
        ]);
      });
    });
  });
});
