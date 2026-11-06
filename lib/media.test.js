'use strict';

const { describe, it, beforeEach, afterEach, mock } = require('node:test'),
  assert = require('node:assert/strict'),
  path = require('path'),
  lib = require('./media'),
  setup = require('./setup'),
  styleguideUtil = require('./styleguide'),
  files = require('nymag-fs');

describe('media', () => {
  const basicHtml = '<html><head></head><body></body></html>',
    basicSection = '<section><header></header><footer></footer></section>',
    styleString = '.test { color: red; }',
    linkString = '/css/article.css',
    tagString = '/js/a.js',
    scriptString = 'console.log("Tests!");',
    componentStyleHtml = '<html><head><style>' + styleString + '</style></head><body></body></html>',
    componentScriptHtml = `<html><head></head><body><script type="text/javascript">
      // <![CDATA[
        ${scriptString}
      // ]]
    </script></body></html>`,
    componentStyleSection = '<section><style>' + styleString + '</style><header></header><footer></footer></section>',
    componentLinkedSection = `<section><link rel="stylesheet" type="text/css" href="${linkString}"><header></header><footer></footer></section>`,
    componentScriptSection = `<section><header></header><footer></footer><script type="text/javascript">
      // <![CDATA[
        ${scriptString}
      // ]]
    </script></section>`,
    componentTaggedSection = `<section><header></header><footer></footer><script type="text/javascript" src="${tagString}"></script></section>`,
    componentTaggedSectionWithBust = `<section><header></header><footer></footer><script type="text/javascript" src="${tagString}?version=a"></script></section>`;

  let fileExists, readFilePromise;

  function makeState() {
    return {
      locals: {
        edit: true,
        site: {
          slug: 'foo',
          assetDir: '/foo'
        }
      },
      _components: []
    };
  }

  function emptyMediaMap() {
    return { scripts: [], styles: [] };
  }

  function cssMediaMap() {
    return { scripts: [], styles: ['/css/article.css'] };
  }

  function scriptMediaMap() {
    return { scripts: ['/js/a.js'], styles: [] };
  }

  beforeEach(() => {
    // no files, unless a test says otherwise
    fileExists = mock.method(files, 'fileExists', () => false);
    readFilePromise = mock.method(files, 'readFilePromise', () => Promise.resolve(''));
  });

  afterEach(() => {
    mock.restoreAll();
    lib.configure({ modulepreload: false });
    lib.configure(false);
    setup.resolveMedia = undefined;
  });

  describe('configure', () => {
    const fn = lib['configure'];

    it('sets both edit styles and scripts to true if a boolean is passed in', () => {
      fn(true);

      assert.equal(lib.editStylesTags, true);
      assert.equal(lib.editScriptsTags, true);
    });

    it('sets both edit styles and scripts to false if a boolean is passed in', () => {
      fn(false);

      assert.equal(lib.editStylesTags, false);
      assert.equal(lib.editScriptsTags, false);
    });

    it('uses object properties to set the values', () => {
      fn({ styles: true, scripts: false });

      assert.equal(lib.editStylesTags, true);
      assert.equal(lib.editScriptsTags, false);
    });

    it('sets the cache buster, empty by default', () => {
      fn(true, 'abc');
      assert.equal(lib.cacheBuster, 'abc');
      fn(true);
      assert.equal(lib.cacheBuster, '');
    });

    it('turns modulepreload on and off, and leaves it alone when not given', () => {
      fn({ modulepreload: true });
      assert.equal(lib.modulepreload, true);
      assert.equal(lib.omitCacheBusterOnModules, true);

      fn({ styles: true });
      assert.equal(lib.modulepreload, true);

      fn({ modulepreload: 0 });
      assert.equal(lib.modulepreload, false);
      assert.equal(lib.omitCacheBusterOnModules, false);
    });
  });

  describe('getMediaMap', () => {
    const fn = lib['getMediaMap'];

    it('accepts state with empty components', () => {
      assert.deepEqual(fn(makeState()), { scripts: [], styles: [] });
    });

    it('accepts list, empty slug (non-existent components)', () => {
      const state = makeState();

      delete state.locals.site.slug;
      state._components = ['a', 'b', 'c'];
      assert.deepEqual(fn(state), { scripts: [], styles: [] });
    });

    it('accepts list and slug (non-existent components)', () => {
      const state = makeState();

      state._components = ['a', 'b', 'c'];
      assert.deepEqual(fn(state), { scripts: [], styles: [] });
    });

    it('retrieves media map based on getScriptFiles and getStyleFiles', () => {
      const expectedScriptFiles = ['/e/a', '/e/b', '/e/c', '/e/cc'],
        state = makeState();

      mock.method(lib, 'getScriptFiles', () => expectedScriptFiles);
      state._components = ['a', 'b', 'c'];
      assert.deepEqual(fn(state), { scripts: expectedScriptFiles, styles: [] });
    });
  });

  describe('getStyleFiles', () => {
    const fn = lib['getStyleFiles'];

    it('utilizes the default MEDIA_DIRECTORY when site has not assetDir defined', () => {
      fileExists.mock.mockImplementation((path) => path === `${process.cwd()}/public/css/a.css` || path === `${process.cwd()}/public/css/a.foo.css`);

      assert.deepEqual(fn({
        locals: { edit: true, site: { slug: 'foo' } },
        _components: ['a', 'b']
      }), ['/css/a.css', '/css/a.foo.css']);
    });

    it('utilizes the assetHost when provided', () => {
      fileExists.mock.mockImplementation((path) => path === '/foo/css/a.css' || path === '/foo/css/a.foo.css');

      assert.deepEqual(fn({
        locals: { edit: true, site: { slug: 'foo', assetDir: '/foo', assetHost: 'https://cache.foo.com' } },
        _components: ['a', 'b']
      }), ['https://cache.foo.com/css/a.css', 'https://cache.foo.com/css/a.foo.css']);
    });

    it('utilizes the assetPath when provided', () => {
      fileExists.mock.mockImplementation((path) => path === '/foo/css/a.css');

      assert.deepEqual(fn({
        locals: { site: { slug: 'foo', assetDir: '/foo', assetPath: '/site-path' } },
        _components: ['a']
      }), ['/site-path/css/a.css']);
    });

    it('returns no styles when there is a style guide but no _usedVariations object', () => {
      assert.deepEqual(fn({
        locals: { edit: false, site: { slug: 'foo', assetDir: '/foo', styleguide: 'bar' } },
        _components: []
      }), []);
    });

    it('adds the font css of the _default and the site styleguides', () => {
      fileExists.mock.mockImplementation((path) => path === '/foo/css/_linked-fonts._default.css' || path === '/foo/css/_linked-fonts.bar.css');

      assert.deepEqual(fn({
        locals: { edit: false, site: { slug: 'foo', assetDir: '/foo', styleguide: 'bar' } },
        _components: [],
        _usedVariations: []
      }), ['/css/_linked-fonts._default.css', '/css/_linked-fonts.bar.css']);
    });

    describe('with no site styleguide (legacy)', () => {
      it('handles an empty component list', () => {
        assert.deepEqual(fn({ locals: makeState().locals, _components: [] }), []);
      });

      it('handles non-existent components', () => {
        assert.deepEqual(fn({ locals: makeState().locals, _components: ['a', 'b'] }), []);
      });

      it('handles existent and non-existent components', () => {
        fileExists.mock.mockImplementation((path) => path === '/foo/css/a.css' || path === '/foo/css/a.foo.css');

        assert.deepEqual(fn({ locals: makeState().locals, _components: ['a', 'b'] }), ['/css/a.css', '/css/a.foo.css']);
      });

      it('checks the component and site css of every component, then the fonts', () => {
        fn({ locals: makeState().locals, _components: ['a', 'b'] });

        assert.deepEqual(fileExists.mock.calls.map((call) => call.arguments[0]), [
          '/foo/css/a.css',
          '/foo/css/a.foo.css',
          '/foo/css/b.css',
          '/foo/css/b.foo.css',
          '/foo/css/_linked-fonts._default.css',
          '/foo/css/_linked-fonts.undefined.css'
        ]);
      });
    });

    describe('with site styleguide (modern)', () => {
      function styleguideState(edit, usedVariations, components = ['a', 'b']) {
        return {
          locals: { edit, site: { slug: 'foo', assetDir: '/foo', styleguide: 'bar' } },
          _components: components,
          _usedVariations: usedVariations
        };
      }

      it('handles an empty component list', () => {
        assert.deepEqual(fn(styleguideState(false, [], [])), []);
      });

      it('handles an empty _usedVariations', () => {
        assert.deepEqual(fn(styleguideState(false, [])), []);
      });

      it('it handles non-existent component', () => {
        assert.deepEqual(fn(styleguideState(false, ['a_baz', 'b'])), []);
      });

      it('defaults to the _default styleguide if the site styleguide file cannot be found', () => {
        fileExists.mock.mockImplementation((path) => path === '/foo/css/a_baz._default.css');

        assert.deepEqual(fn(styleguideState(false, ['a_baz', 'b'])), ['/css/a_baz._default.css']);
      });

      it('prefers the site styleguide file when it can be found', () => {
        fileExists.mock.mockImplementation((path) => path === '/foo/css/a_baz.bar.css');

        assert.deepEqual(fn(styleguideState(false, ['a_baz', 'b'])), ['/css/a_baz.bar.css']);
      });

      it('includes all variations in edit mode', () => {
        mock.method(styleguideUtil, 'getVariations', (styleguide) => styleguide === 'bar' ? { a: ['a_x', 'a_y'] } : {});
        fileExists.mock.mockImplementation((path) => [
          '/foo/css/a_x.bar.css',
          '/foo/css/a_y._default.css',
          '/foo/css/b.bar.css',
          '/foo/css/c._default.css'
        ].includes(path));

        assert.deepEqual(fn(styleguideState(true, [], ['a', 'b', 'c'])), [
          '/css/a_x.bar.css',
          '/css/a_y._default.css',
          '/css/b.bar.css',
          '/css/c._default.css'
        ]);
      });

      it('includes layout styles', () => {
        const state = styleguideState(true, [], ['a', 'b', 'c']);

        state._layoutData = { name: 'layout' };
        mock.method(styleguideUtil, 'getVariations', (styleguide) => styleguide === 'bar' ? { a: ['a_x', 'a_y'] } : {});
        fileExists.mock.mockImplementation((path) => [
          '/foo/css/a_x.bar.css',
          '/foo/css/a_y._default.css',
          '/foo/css/b.bar.css',
          '/foo/css/c._default.css',
          '/foo/css/layout.bar.css'
        ].includes(path));

        assert.deepEqual(fn(state), [
          '/css/a_x.bar.css',
          '/css/a_y._default.css',
          '/css/b.bar.css',
          '/css/c._default.css',
          '/css/layout.bar.css'
        ]);
      });

      it('falls back to the _default layout styles', () => {
        const state = styleguideState(false, []);

        state._layoutData = { name: 'layout' };
        fileExists.mock.mockImplementation((path) => path === '/foo/css/layout._default.css');

        assert.deepEqual(fn(state), ['/css/layout._default.css']);
      });
    });
  });

  describe('getScriptFiles', () => {
    const fn = lib['getScriptFiles'];

    function scriptState(components, site = { slug: 'foo', assetDir: '/foo' }) {
      return { locals: { site }, _components: components };
    }

    it('handles an empty component list', () => {
      assert.deepEqual(fn(scriptState([])), []);
    });

    it('handles non-existent components', () => {
      assert.deepEqual(fn(scriptState(['a'])), []);
    });

    it('handles a mixture non-existent components and existent components', () => {
      fileExists.mock.mockImplementation((path) => ['/foo/js/a.js', '/foo/js/a.foo.js', '/foo/js/a.client.js'].includes(path));

      assert.deepEqual(fn(scriptState(['a', 'b'])), ['/js/a.js', '/js/a.foo.js', '/js/a.client.js']);
    });

    it('uses the MEDIA_DIRECTORY if one is not defined on the site', () => {
      const dir = path.join(process.cwd(), 'public', 'js');

      fileExists.mock.mockImplementation((path) => [`${dir}/a.js`, `${dir}/a.foo.js`, `${dir}/a.client.js`].includes(path));

      assert.deepEqual(fn(scriptState(['a', 'b'], { slug: 'foo' })), ['/js/a.js', '/js/a.foo.js', '/js/a.client.js']);
    });

    it('uses the assetHost value if one is passed in', () => {
      fileExists.mock.mockImplementation((path) => ['/foo/js/a.js', '/foo/js/a.foo.js', '/foo/js/a.client.js'].includes(path));

      assert.deepEqual(fn(scriptState(['a', 'b'], { slug: 'foo', assetDir: '/foo', assetHost: 'https://cache.foo.com' })), [
        'https://cache.foo.com/js/a.js',
        'https://cache.foo.com/js/a.foo.js',
        'https://cache.foo.com/js/a.client.js'
      ]);
    });

    it('makes 3 file exists calls for every component in the component list', () => {
      fn(scriptState(['a', 'b']));
      assert.deepEqual(fileExists.mock.calls.map((call) => call.arguments[0]), [
        '/foo/js/a.js',
        '/foo/js/a.foo.js',
        '/foo/js/a.client.js',
        '/foo/js/b.js',
        '/foo/js/b.foo.js',
        '/foo/js/b.client.js'
      ]);
    });
  });

  describe('injectScriptsAndStyles', () => {
    const fn = lib['injectScriptsAndStyles'];

    it('calls resolveMedia if it\'s defined', async () => {
      const state = makeState();

      state._components = ['a'];
      setup.resolveMedia = mock.fn(() => emptyMediaMap());
      await fn(state)(basicHtml);
      assert.equal(setup.resolveMedia.mock.callCount(), 1);
      assert.deepEqual(setup.resolveMedia.mock.calls[0].arguments, [{ styles: [], scripts: [] }, state.locals]);
      // resolveMedia can see the components of the page
      assert.deepEqual(state.locals._components, ['a']);
    });

    it('uses default media map if resolve media returns false', async () => {
      setup.resolveMedia = mock.fn(() => false);

      assert.equal(await fn(makeState())(basicHtml), basicHtml);
      assert.equal(setup.resolveMedia.mock.callCount(), 1);
    });

    it('throws when missing html', () => {
      assert.throws(() => fn(makeState())(), { message: 'Missing html parameter' });
    });

    it('adds nothing to bottom of head when no styles', async () => {
      assert.equal(await fn(makeState())(basicHtml), basicHtml);
    });

    it('if in view mode, just inlines immediately', async () => {
      assert.equal(await fn({ locals: { edit: false, site: {} }, _components: [] })(basicHtml), basicHtml);
    });

    it('adds nothing to top of root when no components', async () => {
      assert.equal(await fn(makeState())(basicSection), basicSection);
    });

    it('adds nothing to bottom of root when no components', async () => {
      assert.equal(await fn(makeState())(basicHtml), basicHtml);
    });

    describe('with styles', () => {
      it('adds to bottom of head', async () => {
        mock.method(lib, 'getMediaMap', () => cssMediaMap());
        readFilePromise.mock.mockImplementation(() => Promise.resolve(styleString));

        assert.equal(await fn(makeState())(basicHtml), componentStyleHtml);
      });

      it('reads the files from public/css under the current directory', async () => {
        mock.method(lib, 'getMediaMap', () => ({ scripts: [], styles: ['https://cache.foo.com/css/a.css', '/css/b.css'] }));
        readFilePromise.mock.mockImplementation((file) => Promise.resolve(`/* ${file} */`));

        const html = await fn({ locals: { site: {} }, _components: [] })(basicHtml);

        assert.equal(html, `<html><head><style>/* ${process.cwd()}/public/css/a.css *//* ${process.cwd()}/public/css/b.css */</style></head><body></body></html>`);
      });

      it('throws an error if there is an error reading the file', async () => {
        mock.method(lib, 'getMediaMap', () => cssMediaMap());
        readFilePromise.mock.mockImplementation(() => Promise.reject('darn'));

        await assert.rejects(fn(makeState())(basicHtml), (err) => err === 'darn');
      });

      it('adds to top of root', async () => {
        mock.method(lib, 'getMediaMap', () => cssMediaMap());
        readFilePromise.mock.mockImplementation(() => Promise.resolve(styleString));

        assert.equal(await fn(makeState())(basicSection), componentStyleSection);
      });

      it('inlines styles in edit mode if the options', async () => {
        mock.method(lib, 'getMediaMap', () => cssMediaMap());
        lib.configure({ styles: true, scripts: false });

        assert.equal(await fn(makeState())(basicSection), componentLinkedSection);
      });

      it('adds the cache buster to linked styles', async () => {
        mock.method(lib, 'getMediaMap', () => cssMediaMap());
        lib.configure({ styles: true, scripts: false }, 'v1');

        assert.equal(await fn(makeState())(basicHtml), `<html><head><link rel="stylesheet" type="text/css" href="${linkString}?version=v1"></head><body></body></html>`);
      });

      it('links nothing when resolveMedia drops the styles', async () => {
        setup.resolveMedia = () => ({ scripts: [] });
        lib.configure({ styles: true, scripts: true });

        assert.equal(await fn(makeState())(basicHtml), basicHtml);
      });
    });

    describe('with scripts', () => {
      it('adds to bottom of body', async () => {
        mock.method(lib, 'getMediaMap', () => scriptMediaMap());
        readFilePromise.mock.mockImplementation(() => Promise.resolve(scriptString));

        assert.equal(await fn(makeState())(basicHtml), componentScriptHtml);
      });

      it('adds to bottom of root', async () => {
        mock.method(lib, 'getMediaMap', () => scriptMediaMap());
        readFilePromise.mock.mockImplementation(() => Promise.resolve(scriptString));

        assert.equal(await fn(makeState())(basicSection), componentScriptSection);
      });

      it('inlines scripts in edit mode if the options', async () => {
        mock.method(lib, 'getMediaMap', () => scriptMediaMap());
        lib.configure({ styles: false, scripts: true });

        assert.equal(await fn(makeState())(basicSection), componentTaggedSection);
      });

      it('inlines scripts in edit mode if the options with the cache busting', async () => {
        mock.method(lib, 'getMediaMap', () => scriptMediaMap());
        lib.configure({ styles: false, scripts: true }, 'a');

        assert.equal(await fn(makeState())(basicSection), componentTaggedSectionWithBust);
      });

      it('reads the files from public/js under the current directory', async () => {
        mock.method(lib, 'getMediaMap', () => ({ scripts: ['/js/a.js', '/site/js/b.js'], styles: [] }));
        readFilePromise.mock.mockImplementation((file) => Promise.resolve(`/* ${file} */`));

        const html = await fn({ locals: { site: {} }, _components: [] })(basicSection);

        assert.ok(html.includes(`/* ${process.cwd()}/public/js/a.js *//* ${process.cwd()}/public/js/b.js */`));
      });
    });

    describe('with module scripts', () => {
      function moduleMediaMap() {
        return {
          styles: [],
          scripts: [],
          moduleScripts: ['/js/main.abc.js', '/js/other.def.js'],
          modulePreloads: ['/js/chunk.123.js']
        };
      }

      it('adds the module scripts to the bottom of the body, before the other scripts', async () => {
        setup.resolveMedia = () => Object.assign(moduleMediaMap(), { scripts: ['/js/a.js'] });
        readFilePromise.mock.mockImplementation(() => Promise.resolve(scriptString));

        const html = await fn({ locals: { edit: false, site: {} }, _components: [] })(basicHtml);

        assert.equal(html, '<html><head></head><body>'
          + '<script type="module" src="/js/main.abc.js"></script>\n<script type="module" src="/js/other.def.js"></script>'
          + `<script type="text/javascript">
      // <![CDATA[
        ${scriptString}
      // ]]
    </script>`
          + '</body></html>');
      });

      it('adds the cache buster to module scripts unless modulepreload is on', async () => {
        setup.resolveMedia = () => moduleMediaMap();
        lib.configure(false, 'v1');

        assert.ok((await fn(makeState())(basicHtml)).includes('<script type="module" src="/js/main.abc.js?version=v1"></script>'));

        lib.configure({ modulepreload: true }, 'v1');
        assert.ok((await fn(makeState())(basicHtml)).includes('<script type="module" src="/js/main.abc.js"></script>'));
      });

      it('adds no modulepreload hints unless modulepreload is on', async () => {
        setup.resolveMedia = () => moduleMediaMap();

        assert.ok(!(await fn(makeState())(basicHtml)).includes('modulepreload'));
      });

      it('adds no modulepreload hints when there are none', async () => {
        setup.resolveMedia = () => ({ styles: [], scripts: [], moduleScripts: ['/js/main.abc.js'] });
        lib.configure({ modulepreload: true });

        assert.ok(!(await fn(makeState())(basicHtml)).includes('modulepreload'));
      });

      it('adds modulepreload hints to the head, before the styles', async () => {
        setup.resolveMedia = () => Object.assign(moduleMediaMap(), { styles: ['/css/a.css'] });
        readFilePromise.mock.mockImplementation(() => Promise.resolve(styleString));
        lib.configure({ modulepreload: true }, 'v1');

        const html = await fn({ locals: { edit: false, site: {} }, _components: [] })(basicHtml);

        assert.ok(html.startsWith(`<html><head><link rel="modulepreload" href="/js/chunk.123.js"><style>${styleString}</style></head>`));
      });

      it('adds the module scripts of a component to the end of its root', async () => {
        setup.resolveMedia = () => moduleMediaMap();

        assert.equal(await fn(makeState())(basicSection), basicSection.replace('</section>', '<script type="module" src="/js/main.abc.js"></script>\n<script type="module" src="/js/other.def.js"></script></section>'));
      });
    });
  });
});
