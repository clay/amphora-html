'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  setup = require('./setup'),
  styleguideUtil = require('./styleguide'),
  files = require('nymag-fs');

describe(_.startCase(filename), function () {
  let sandbox,
    basicHtml = '<html><head></head><body></body></html>',
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

  const state = {
      locals: {
        edit: true,
        site: {
          slug: 'foo',
          assetDir: '/foo'
        }
      },
      _components: []
    },
    emptyMediaMap = {
      scripts: [],
      styles: []
    },
    cssMediaMap = {
      scripts: [],
      styles: ['/css/article.css']
    },
    scriptMediaMap = {
      scripts: ['/js/a.js'],
      styles: []
    };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(styleguideUtil);
    sandbox.stub(files);
  });

  afterEach(function () {
    sandbox.restore();
    lib.editStylesTags = false;
    lib.editScriptsTags = false;
    setup.resolveMedia = undefined;
  });

  describe('configure', function () {
    const fn = lib[this.title];

    it('sets both edit styles and scripts to true if a boolean is passed in', function () {
      fn(true);

      expect(lib.editStylesTags).to.be.true;
      expect(lib.editScriptsTags).to.be.true;
    });

    it('sets both edit styles and scripts to false if a boolean is passed in', function () {
      fn(false);

      expect(lib.editStylesTags).to.be.false;
      expect(lib.editScriptsTags).to.be.false;
    });

    it('uses object properties to set the values', function () {
      fn({ styles: true, scripts: false });

      expect(lib.editStylesTags).to.be.true;
      expect(lib.editScriptsTags).to.be.false;
    });
  });

  describe('getMediaMap', function () {
    const fn = lib[this.title];

    it('accepts state with empty components', function () {
      expect(fn(state)).to.deep.equal({scripts: [], styles: []});
    });

    it('accepts list, empty slug (non-existent components)', function () {
      expect(
        fn(
          _.merge(
            {
              _components: ['a', 'b', 'c']
            },
            _.omit(state, ['locals.site.slug'])
          )
        )
      ).to.deep.equal({scripts: [], styles: []});
    });

    it('accepts list and slug (non-existent components)', function () {
      expect(
        fn(
          _.merge(
            {
              _components: ['a', 'b', 'c']
            },
            state
          )
        )
      ).to.deep.equal({scripts: [], styles: []});
    });

    it('retrieves media map based on getScriptFiles and getStyleFiles', function () {
      var getScriptFiles = sandbox.stub(lib, 'getScriptFiles'),
        expectedScriptFiles = [
          '/e/a',
          '/e/b',
          '/e/c',
          '/e/cc'
        ];

      sandbox.stub(lib, 'getStyleFiles').returns([]);
      getScriptFiles.returns(expectedScriptFiles);

      expect(
        fn(
          _.merge(
            state,
            {
              _components: ['a', 'b', 'c']
            }
          )
        )
      ).to.deep.equal({scripts: expectedScriptFiles, styles: []});
    });
  });

  describe('getStyleFiles', function () {
    const fn = lib[this.title];

    it('utilizes the default MEDIA_DIRECTORY when site has not assetDir defined', function () {
      files.fileExists.withArgs(`${process.cwd()}/public/css/a.css`).returns(true);
      files.fileExists.withArgs(`${process.cwd()}/public/css/a.${state.locals.site.slug}.css`).returns(true);
      expect(fn({
        locals: {
          edit: true,
          site: {
            slug: 'foo'
          }
        },
        _components: [
          'a',
          'b'
        ]
      })).to.deep.equal([
        '/css/a.css',
        `/css/a.${state.locals.site.slug}.css`
      ]);
    });

    it('utilizes the assetHost when provided', function () {
      files.fileExists.withArgs(`${state.locals.site.assetDir}/css/a.css`).returns(true);
      files.fileExists.withArgs(`${state.locals.site.assetDir}/css/a.${state.locals.site.slug}.css`).returns(true);
      expect(fn({
        locals: {
          edit: true,
          site: {
            slug: 'foo',
            assetDir: '/foo',
            assetHost: 'https://cache.foo.com'
          }
        },
        _components: [
          'a',
          'b'
        ]
      })).to.deep.equal([
        'https://cache.foo.com/css/a.css',
        `https://cache.foo.com/css/a.${state.locals.site.slug}.css`
      ]);
    });

    it('returns no styles when there is a style guide but no _usedVariations object', function () {
      const localState = {
        locals: {
          edit: false,
          site: {
            slug: 'foo',
            assetDir: '/foo',
            styleguide: 'bar'
          }
        },
        _components: []
      };

      expect(fn(localState)).to.deep.equal([]);
    });

    describe('with no site styleguide (legacy)', function () {
      it('handles an empty component list', function () {
        expect(fn({
          locals: state.locals,
          _components: []
        })).to.deep.equal([]);
      });

      it('handles non-existent components', function () {
        expect(fn({
          locals: state.locals,
          _components: [
            'a',
            'b'
          ]
        })).to.deep.equal([]);
      });

      it('handles existent and non-existent components', function () {
        files.fileExists.withArgs(`${state.locals.site.assetDir}/css/a.css`).returns(true);
        files.fileExists.withArgs(`${state.locals.site.assetDir}/css/a.${state.locals.site.slug}.css`).returns(true);
        expect(fn({
          locals: state.locals,
          _components: [
            'a',
            'b'
          ]
        })).to.deep.equal([
          '/css/a.css',
          `/css/a.${state.locals.site.slug}.css`
        ]);
      });
    });

    describe('with site styleguide (modern)', function () {
      it('handles an empty component list', function () {
        const localState = {
          locals: {
            edit: false,
            site: {
              slug: 'foo',
              assetDir: '/foo',
              styleguide: 'bar'
            }
          },
          _components: [],
          _usedVariations: []
        };

        expect(fn(localState)).to.deep.equal([]);
      });

      it('handles an empty _usedVariations', function () {
        const localState = {
          locals: {
            edit: false,
            site: {
              slug: 'foo',
              assetDir: '/foo',
              styleguide: 'bar'
            }
          },
          _components: [
            'a',
            'b'
          ],
          _usedVariations: []
        };

        expect(fn(localState)).to.deep.equal([]);
      });

      it('it handles non-existent component', function () {
        const localState = {
          locals: {
            edit: false,
            site: {
              slug: 'foo',
              assetDir: '/foo',
              styleguide: 'bar'
            }
          },
          _components: [
            'a',
            'b'
          ],
          _usedVariations: [
            'a_baz',
            'b'
          ]
        };

        expect(fn(localState)).to.deep.equal([]);
      });

      it('defaults to the _default styleguide if the site styleguide file cannot be found', function () {
        const localState = {
          locals: {
            edit: false,
            site: {
              slug: 'foo',
              assetDir: '/foo',
              styleguide: 'bar'
            }
          },
          _components: [
            'a',
            'b'
          ],
          _usedVariations: [
            'a_baz',
            'b'
          ]
        };

        files.fileExists.withArgs(`${localState.locals.site.assetDir}/css/a_baz._default.css`).returns(true);

        expect(fn(localState)).to.deep.equal([
          '/css/a_baz._default.css'
        ]);
      });

      it('prefers the site styleguide file when it can be found', function () {
        const localState = {
          locals: {
            edit: false,
            site: {
              slug: 'foo',
              assetDir: '/foo',
              styleguide: 'bar'
            }
          },
          _components: [
            'a',
            'b'
          ],
          _usedVariations: [
            'a_baz',
            'b'
          ]
        };

        files.fileExists.withArgs(`${localState.locals.site.assetDir}/css/a_baz.${localState.locals.site.styleguide}.css`).returns(true);

        expect(fn(localState)).to.deep.equal([
          `/css/a_baz.${localState.locals.site.styleguide}.css`
        ]);
      });

      it('includes all variations in edit mode', function () {
        const styleguide = 'bar',
          assetDir = '/foo',
          localState = {
            locals: {
              edit: true,
              site: {
                slug: 'foo',
                assetDir,
                styleguide
              },
              components: ['a', 'b', 'c']
            },
            _components: [],
            _usedVariations: []
          };

        styleguideUtil.getVariations.withArgs(styleguide).returns({
          a: ['a_x', 'a_y']
        });

        files.fileExists.withArgs(`${assetDir}/css/a_x.${styleguide}.css`).returns(true);
        files.fileExists.withArgs(`${assetDir}/css/a_y._default.css`).returns(true);
        files.fileExists.withArgs(`${assetDir}/css/b.${styleguide}.css`).returns(true);
        files.fileExists.withArgs(`${assetDir}/css/c._default.css`).returns(true);

        expect(fn(localState)).to.eql([
          `/css/a_x.${styleguide}.css`,
          '/css/a_y._default.css',
          `/css/b.${styleguide}.css`,
          '/css/c._default.css'
        ]);
      });
    });
  });

  describe('getScriptFiles', function () {
    const fn = lib[this.title];

    it('handles an empty component list', function () {
      const localState = {
        locals: {
          site: {
            slug: 'foo',
            assetDir: '/foo'
          }
        },
        _components: []
      };

      expect(fn(localState)).to.deep.equal([]);
    });

    it('handles non-existent components', function () {
      const localState = {
        locals: {
          site: {
            slug: 'foo',
            assetDir: '/foo'
          }
        },
        _components: [
          'a'
        ]
      };

      expect(fn(localState)).to.deep.equal([]);
    });

    it('handles a mixture non-existent components and existent components', function () {
      const localState = {
        locals: {
          site: {
            slug: 'foo',
            assetDir: '/foo'
          }
        },
        _components: [
          'a',
          'b'
        ]
      };

      files.fileExists.withArgs(`${localState.locals.site.assetDir}/js/a.js`).returns(true);
      files.fileExists.withArgs(`${localState.locals.site.assetDir}/js/a.${localState.locals.site.slug}.js`).returns(true);
      files.fileExists.withArgs(`${localState.locals.site.assetDir}/js/a.client.js`).returns(true);

      expect(fn(localState)).to.deep.equal([
        '/js/a.js',
        `/js/a.${localState.locals.site.slug}.js`,
        '/js/a.client.js'
      ]);
    });

    it('uses the MEDIA_DIRECTORY if one is not defined on the site', function () {
      const localState = {
        locals: {
          site: {
            slug: 'foo'
          }
        },
        _components: [
          'a',
          'b'
        ]
      };

      files.fileExists.withArgs(`${process.cwd()}/public/js/a.js`).returns(true);
      files.fileExists.withArgs(`${process.cwd()}/public/js/a.${localState.locals.site.slug}.js`).returns(true);
      files.fileExists.withArgs(`${process.cwd()}/public/js/a.client.js`).returns(true);

      expect(fn(localState)).to.deep.equal([
        '/js/a.js',
        `/js/a.${localState.locals.site.slug}.js`,
        '/js/a.client.js'
      ]);
    });

    it('uses the assetHost value if one is passed in', function () {
      const localState = {
        locals: {
          site: {
            slug: 'foo',
            assetDir: '/foo',
            assetHost: 'https://cache.foo.com'
          }
        },
        _components: [
          'a',
          'b'
        ]
      };

      files.fileExists.withArgs(`${localState.locals.site.assetDir}/js/a.js`).returns(true);
      files.fileExists.withArgs(`${localState.locals.site.assetDir}/js/a.${localState.locals.site.slug}.js`).returns(true);
      files.fileExists.withArgs(`${localState.locals.site.assetDir}/js/a.client.js`).returns(true);

      expect(fn(localState)).to.deep.equal([
        `${localState.locals.site.assetHost}/js/a.js`,
        `${localState.locals.site.assetHost}/js/a.${localState.locals.site.slug}.js`,
        `${localState.locals.site.assetHost}/js/a.client.js`
      ]);
    });

    it('makes 3 file exists calls for every component in the component list', function () {
      const localState = {
        locals: {
          site: {
            slug: 'foo',
            assetDir: '/foo'
          }
        },
        _components: [
          'a',
          'b'
        ]
      };

      fn(localState);
      expect(files.fileExists.args.map(function (argv) { return argv[0]; })).to.deep.equal([
        `${localState.locals.site.assetDir}/js/a.js`,
        `${localState.locals.site.assetDir}/js/a.${localState.locals.site.slug}.js`,
        `${localState.locals.site.assetDir}/js/a.client.js`,
        `${localState.locals.site.assetDir}/js/b.js`,
        `${localState.locals.site.assetDir}/js/b.${localState.locals.site.slug}.js`,
        `${localState.locals.site.assetDir}/js/b.client.js`
      ]);
    });
  });

  describe('injectScriptsAndStyles', function () {
    const fn = lib[this.title];

    it('calls resolveMedia if it\'s defined', function () {
      setup.resolveMedia = sandbox.stub().returns(emptyMediaMap);
      fn(state)(basicHtml);
      sinon.assert.calledOnce(setup.resolveMedia);
    });

    it('uses default media map if resolve media returns false', function () {
      setup.resolveMedia = sandbox.stub().returns(false);

      return fn(state)(basicHtml)
        .then(function () {
          sinon.assert.calledOnce(setup.resolveMedia);
        });
    });

    it('throws when missing html', function () {
      expect(function () {
        fn(state)();
      }).to.throw('Missing html parameter');
    });

    it('adds nothing to bottom of head when no styles', function () {
      return fn(state)(basicHtml).then((html) => {
        expect(html).to.deep.equal(basicHtml);
      });
    });

    it('if in view mode, just inlines immediately', function () {
      return fn({ locals: { edit: false, site: {} }, _components: [] })(basicHtml).then((html) => {
        expect(html).to.deep.equal(basicHtml);
      });
    });

    it('adds nothing to top of root when no components', function () {
      return fn(state)(basicSection)
        .then(function (html) {
          expect(html).to.deep.equal(basicSection);
        });
    });

    it('adds nothing to bottom of root when no components', function () {
      return fn(state)(basicHtml)
        .then(function (html) {
          expect(html).to.deep.equal(basicHtml);
        });
    });

    describe('with styles', function () {
      function reject(err) {
        expect(err).to.be.an.instanceOf(Error);
      }

      function resolveBody(html) {
        expect(html).to.deep.equal(componentStyleHtml);
      }

      function resolveSection(html) {
        expect(html).to.deep.equal(componentStyleSection);
      }

      function resolveLinkedSection(html) {
        expect(html).to.deep.equal(componentLinkedSection);
      }

      // Body HTML
      it('adds to bottom of head', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicHtml)
          .then(resolveBody);
      });

      // Error
      it('throws an error if there is an error reading the file', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.reject(new Error()));

        return fn(state)(basicHtml)
          .catch(reject);
      });

      // Section HTML
      it('adds to top of root', function () {
        files.readFilePromise.cache = new _.memoize.Cache();

        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      it('it checks for inlining vs script tags if edit mode', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      it('inlines styles in edit mode if the options', function () {
        sandbox.stub(lib, 'getMediaMap').returns(cssMediaMap);
        lib.configure({ styles: true, scripts: false });

        return fn(state)(basicSection)
          .then(resolveLinkedSection);
      });
    });

    describe('with scripts', function () {
      function resolveBody(html) {
        expect(html).to.deep.equal(componentScriptHtml);
      }

      function resolveSection(html) {
        expect(html).to.deep.equal(componentScriptSection);
      }

      function resolveTaggedSection(html) {
        expect(html).to.deep.equal(componentTaggedSection);
      }

      function resolveTaggedSectionWithBust(html) {
        expect(html).to.deep.equal(componentTaggedSectionWithBust);
      }

      it('adds to bottom of body', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(scriptMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(scriptString));

        return fn(state)(basicHtml)
          .then(resolveBody);
      });

      it('adds to bottom of root', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(scriptMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(scriptString));

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      it('inlines scripts in edit mode if the options', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(scriptMediaMap));
        lib.configure({ styles: false, scripts: true });

        return fn(state)(basicSection)
          .then(resolveTaggedSection);
      });

      it('inlines scripts in edit mode if the options with the cache busting', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(scriptMediaMap));
        lib.configure({ styles: false, scripts: true }, 'a');

        return fn(state)(basicSection)
          .then(resolveTaggedSectionWithBust);
      });
    });
  });
});
