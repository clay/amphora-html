'use strict';
/* eslint max-nested-callbacks:[2,5] */

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  setup = require('./setup'),
  styleguideUtil = require('./styleguide'),
  files = require('nymag-fs');

jest.mock('nymag-fs', () => ({
  fileExists: () => false,
  readFilePromise: () => Promise.resolve(''),
  tryRequire: () => undefined
}));

describe(_.startCase(filename), () => {
  let basicHtml = '<html><head></head><body></body></html>',
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

  afterEach(() => {
    lib.editStylesTags = false;
    lib.editScriptsTags = false;
    setup.resolveMedia = undefined;
  });

  describe('configure', () => {
    const fn = lib['configure'];

    test(
      'sets both edit styles and scripts to true if a boolean is passed in',
      () => {
        fn(true);

        expect(lib.editStylesTags).toBe(true);
        expect(lib.editScriptsTags).toBe(true);
      }
    );

    test(
      'sets both edit styles and scripts to false if a boolean is passed in',
      () => {
        fn(false);

        expect(lib.editStylesTags).toBe(false);
        expect(lib.editScriptsTags).toBe(false);
      }
    );

    test('uses object properties to set the values', () => {
      fn({ styles: true, scripts: false });

      expect(lib.editStylesTags).toBe(true);
      expect(lib.editScriptsTags).toBe(false);
    });
  });

  describe('getMediaMap', () => {
    const fn = lib['getMediaMap'];

    test('accepts state with empty components', () => {
      expect(fn(state)).toEqual({manifestAssets: [], scripts: [], styles: []});
    });

    test('accepts list, empty slug (non-existent components)', () => {
      expect(
        fn(
          _.merge(
            {
              _components: ['a', 'b', 'c']
            },
            _.omit(state, ['locals.site.slug'])
          )
        )
      ).toEqual({manifestAssets: [], scripts: [], styles: []});
    });

    test('accepts list and slug (non-existent components)', () => {
      expect(
        fn(
          _.merge(
            {
              _components: ['a', 'b', 'c']
            },
            state
          )
        )
      ).toEqual({manifestAssets: [], scripts: [], styles: []});
    });

    test(
      'retrieves media map based on getScriptFiles and getStyleFiles',
      () => {
        const expectedScriptFiles = [
          '/e/a',
          '/e/b',
          '/e/c',
          '/e/cc'
        ];

        jest.spyOn(lib, 'getScriptFiles').mockReturnValue(expectedScriptFiles);

        expect(
          fn(
            _.merge(
              state,
              {
                _components: ['a', 'b', 'c']
              }
            )
          )
        ).toEqual({manifestAssets: [], scripts: expectedScriptFiles, styles: []});
      }
    );
  });

  describe('getStyleFiles', () => {
    const fn = lib['getStyleFiles'];

    test(
      'utilizes the default MEDIA_DIRECTORY when site has not assetDir defined',
      () => {
        jest.spyOn(files, 'fileExists').mockImplementation(path => {
          if (path === `${process.cwd()}/public/css/a.css`) return true;
          if (path === `${process.cwd()}/public/css/a.${state.locals.site.slug}.css`) return true;
          return false;
        });

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
        })).toEqual([
          '/css/a.css',
          `/css/a.${state.locals.site.slug}.css`
        ]);
      }
    );

    test('utilizes the assetHost when provided', () => {
      jest.spyOn(files, 'fileExists').mockImplementation(path => {
        if (path === `${state.locals.site.assetDir}/css/a.css`) return true;
        if (path === `${state.locals.site.assetDir}/css/a.${state.locals.site.slug}.css`) return true;
        return false;
      });

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
      })).toEqual([
        'https://cache.foo.com/css/a.css',
        `https://cache.foo.com/css/a.${state.locals.site.slug}.css`
      ]);
    });

    test(
      'returns no styles when there is a style guide but no _usedVariations object',
      () => {
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

        expect(fn(localState)).toEqual([]);
      }
    );

    describe('with no site styleguide (legacy)', () => {
      test('handles an empty component list', () => {
        expect(fn({
          locals: state.locals,
          _components: []
        })).toEqual([]);
      });

      test('handles non-existent components', () => {
        expect(fn({
          locals: state.locals,
          _components: [
            'a',
            'b'
          ]
        })).toEqual([]);
      });

      test('handles existent and non-existent components', () => {
        jest.spyOn(files, 'fileExists').mockImplementation(path => {
          if (path === `${state.locals.site.assetDir}/css/a.css`) return true;
          if (path === `${state.locals.site.assetDir}/css/a.${state.locals.site.slug}.css`) return true;
          return false;
        });

        expect(fn({
          locals: state.locals,
          _components: [
            'a',
            'b'
          ]
        })).toEqual([
          '/css/a.css',
          `/css/a.${state.locals.site.slug}.css`
        ]);
      });
    });

    describe('with site styleguide (modern)', () => {
      test('handles an empty component list', () => {
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

        expect(fn(localState)).toEqual([]);
      });

      test('handles an empty _usedVariations', () => {
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

        expect(fn(localState)).toEqual([]);
      });

      test('it handles non-existent component', () => {
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

        expect(fn(localState)).toEqual([]);
      });

      test(
        'defaults to the _default styleguide if the site styleguide file cannot be found',
        () => {
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

          jest.spyOn(files, 'fileExists').mockImplementation(path => {
            if (path === `${localState.locals.site.assetDir}/css/a_baz._default.css`) return true;
            return false;
          });

          expect(fn(localState)).toEqual([
            '/css/a_baz._default.css'
          ]);
        }
      );

      test('prefers the site styleguide file when it can be found', () => {
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

        jest.spyOn(files, 'fileExists').mockImplementation(path => {
          if (path === `${localState.locals.site.assetDir}/css/a_baz.${localState.locals.site.styleguide}.css`) return true;
          return false;
        });

        expect(fn(localState)).toEqual([
          `/css/a_baz.${localState.locals.site.styleguide}.css`
        ]);
      });

      test('includes all variations in edit mode', () => {
        const styleguide = 'bar',
          assetDir = '/foo',
          localState = {
            locals: {
              edit: true,
              site: {
                slug: 'foo',
                assetDir,
                styleguide
              }
            },
            _components: ['a', 'b', 'c'],
            _usedVariations: []
          };

        jest.spyOn(styleguideUtil, 'getVariations').mockImplementation(styleguide => {
          if (styleguide === 'bar') return {a: ['a_x', 'a_y']};
          return {};
        }),
        jest.spyOn(files, 'fileExists').mockImplementation(path => {
          if (path === `${assetDir}/css/a_x.${styleguide}.css`) return true;
          if (path === `${assetDir}/css/a_y._default.css`) return true;
          if (path === `${assetDir}/css/b.${styleguide}.css`) return true;
          if (path === `${assetDir}/css/c._default.css`) return true;
          return false;
        });

        expect(fn(localState)).toEqual([
          `/css/a_x.${styleguide}.css`,
          '/css/a_y._default.css',
          `/css/b.${styleguide}.css`,
          '/css/c._default.css'
        ]);
      });

      test('includes layout styles', () => {
        const styleguide = 'bar',
          assetDir = '/foo',
          localState = {
            locals: {
              edit: true,
              site: {
                slug: 'foo',
                assetDir,
                styleguide
              }
            },
            _components: ['a', 'b', 'c'],
            _usedVariations: [],
            _layoutData: {
              name: 'layout'
            }
          };

        jest.spyOn(styleguideUtil, 'getVariations').mockImplementation(styleguide => {
          if (styleguide === 'bar') return {a: ['a_x', 'a_y']};
          return {};
        }),
        jest.spyOn(files, 'fileExists').mockImplementation(path => {
          if (path === `${assetDir}/css/a_x.${styleguide}.css`) return true;
          if (path === `${assetDir}/css/a_y._default.css`) return true;
          if (path === `${assetDir}/css/b.${styleguide}.css`) return true;
          if (path === `${assetDir}/css/c._default.css`) return true;
          if (path === `${assetDir}/css/layout.${styleguide}.css`) return true;
          return false;
        });

        expect(fn(localState)).toEqual([
          `/css/a_x.${styleguide}.css`,
          '/css/a_y._default.css',
          `/css/b.${styleguide}.css`,
          '/css/c._default.css',
          `/css/layout.${styleguide}.css`
        ]);
      });
    });
  });

  describe('getScriptFiles', () => {
    const fn = lib['getScriptFiles'];

    test('handles an empty component list', () => {
      const localState = {
        locals: {
          site: {
            slug: 'foo',
            assetDir: '/foo'
          }
        },
        _components: []
      };

      expect(fn(localState)).toEqual([]);
    });

    test('handles non-existent components', () => {
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

      expect(fn(localState)).toEqual([]);
    });

    test(
      'handles a mixture non-existent components and existent components',
      () => {
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

        jest.spyOn(files, 'fileExists').mockImplementation(path => {
          if (path === `${localState.locals.site.assetDir}/js/a.js`) return true;
          if (path === `${localState.locals.site.assetDir}/js/a.${localState.locals.site.slug}.js`) return true;
          if (path === `${localState.locals.site.assetDir}/js/a.client.js`) return true;
          return false;
        });

        expect(fn(localState)).toEqual([
          '/js/a.js',
          `/js/a.${localState.locals.site.slug}.js`,
          '/js/a.client.js'
        ]);
      }
    );

    test(
      'uses the MEDIA_DIRECTORY if one is not defined on the site',
      () => {
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

        jest.spyOn(files, 'fileExists').mockImplementation(path => {
          if (path === `${process.cwd()}/public/js/a.js`) return true;
          if (path === `${process.cwd()}/public/js/a.${localState.locals.site.slug}.js`) return true;
          if (path === `${process.cwd()}/public/js/a.client.js`) return true;
          return false;
        });

        expect(fn(localState)).toEqual([
          '/js/a.js',
          `/js/a.${localState.locals.site.slug}.js`,
          '/js/a.client.js'
        ]);
      }
    );

    test('uses the assetHost value if one is passed in', () => {
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

      jest.spyOn(files, 'fileExists').mockImplementation(path => {
        if (path === `${localState.locals.site.assetDir}/js/a.js`) return true;
        if (path === `${localState.locals.site.assetDir}/js/a.${localState.locals.site.slug}.js`) return true;
        if (path === `${localState.locals.site.assetDir}/js/a.client.js`) return true;
        return false;
      });

      expect(fn(localState)).toEqual([
        `${localState.locals.site.assetHost}/js/a.js`,
        `${localState.locals.site.assetHost}/js/a.${localState.locals.site.slug}.js`,
        `${localState.locals.site.assetHost}/js/a.client.js`
      ]);
    });

    test(
      'makes 3 file exists calls for every component in the component list',
      () => {
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

        jest.spyOn(files, 'fileExists').mockImplementation(() => false);
        fn(localState);
        expect(files.fileExists.mock.calls.map(function (argv) { return argv[0]; })).toEqual([
          `${localState.locals.site.assetDir}/js/a.js`,
          `${localState.locals.site.assetDir}/js/a.${localState.locals.site.slug}.js`,
          `${localState.locals.site.assetDir}/js/a.client.js`,
          `${localState.locals.site.assetDir}/js/b.js`,
          `${localState.locals.site.assetDir}/js/b.${localState.locals.site.slug}.js`,
          `${localState.locals.site.assetDir}/js/b.client.js`
        ]);
      }
    );
  });

  describe('injectScriptsAndStyles', () => {
    const fn = lib['injectScriptsAndStyles'];

    test('calls resolveMedia if it\'s defined', () => {
      setup.resolveMedia = jest.fn().mockReturnValue(emptyMediaMap);
      return fn(state)(basicHtml).then(function () {
        expect(setup.resolveMedia.mock.calls.length).toBe(1);
      });
    });

    test('uses default media map if resolve media returns false', () => {
      setup.resolveMedia = jest.fn().mockReturnValue(false);
      // jest.spyOn(setup, 'resolveMedia').mockReturnValue(false);

      return fn(state)(basicHtml)
        .then(function () {
          expect(setup.resolveMedia.mock.calls.length).toBe(1);
        });
    });

    test('throws when missing html', () => {
      expect.assertions(1);
      expect(() => {
        fn(state)();
      }).toThrowError('Missing html parameter');
    });

    test('adds nothing to bottom of head when no styles', () => {
      return fn(state)(basicHtml).then((html) => {
        expect(html).toEqual(basicHtml);
      });
    });

    test('if in view mode, just inlines immediately', () => {
      return fn({ locals: { edit: false, site: {} }, _components: [] })(basicHtml).then((html) => {
        expect(html).toEqual(basicHtml);
      });
    });

    test('adds nothing to top of root when no components', () => {
      return fn(state)(basicSection)
        .then(function (html) {
          expect(html).toEqual(basicSection);
        });
    });

    test('adds nothing to bottom of root when no components', () => {
      return fn(state)(basicHtml)
        .then(function (html) {
          expect(html).toEqual(basicHtml);
        });
    });

    describe('with styles', () => {
      function resolveBody(html) {
        expect(html).toEqual(componentStyleHtml);
      }

      function resolveSection(html) {
        expect(html).toEqual(componentStyleSection);
      }

      function resolveLinkedSection(html) {
        expect(html).toEqual(componentLinkedSection);
      }

      // Body HTML
      test('adds to bottom of head', () => {
        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(cssMediaMap));
        jest.spyOn(files, 'readFilePromise').mockResolvedValueOnce(styleString);

        return fn(state)(basicHtml)
          .then(resolveBody);
      });

      // Error
      test('throws an error if there is an error reading the file', () => {
        expect.assertions(1);

        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(cssMediaMap));
        jest.spyOn(files, 'readFilePromise').mockRejectedValueOnce('darn');

        return expect(fn(state)(basicHtml)).rejects.toMatch('darn');
      });

      // Section HTML
      test('adds to top of root', () => {
        files.readFilePromise.cache = new _.memoize.Cache();

        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(cssMediaMap));
        jest.spyOn(files, 'readFilePromise').mockResolvedValueOnce(styleString);

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      /* don't think this is testing anything... */
      test.skip('it checks for inlining vs script tags if edit mode', () => {
        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(cssMediaMap));
        jest.spyOn(files, 'readFilePromise').mockResolvedValueOnce(styleString);
        // sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        // files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      test('inlines styles in edit mode if the options', () => {
        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(cssMediaMap));
        lib.configure({ styles: true, scripts: false });

        return fn(state)(basicSection)
          .then(resolveLinkedSection);
      });
    });

    describe('with scripts', () => {
      function resolveBody(html) {
        expect(html).toEqual(componentScriptHtml);
      }

      function resolveSection(html) {
        expect(html).toEqual(componentScriptSection);
      }

      function resolveTaggedSection(html) {
        expect(html).toEqual(componentTaggedSection);
      }

      function resolveTaggedSectionWithBust(html) {
        expect(html).toEqual(componentTaggedSectionWithBust);
      }

      test('adds to bottom of body', () => {
        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(scriptMediaMap));
        jest.spyOn(files, 'readFilePromise').mockResolvedValueOnce(scriptString);

        return fn(state)(basicHtml)
          .then(resolveBody);
      });

      test('adds to bottom of root', () => {
        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(scriptMediaMap));
        jest.spyOn(files, 'readFilePromise').mockResolvedValueOnce(scriptString);

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      test('inlines scripts in edit mode if the options', () => {
        jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(scriptMediaMap));
        lib.configure({ styles: false, scripts: true });

        return fn(state)(basicSection)
          .then(resolveTaggedSection);
      });

      test(
        'inlines scripts in edit mode if the options with the cache busting',
        () => {
          jest.spyOn(lib, 'getMediaMap').mockReturnValue(_.cloneDeep(scriptMediaMap));
          lib.configure({ styles: false, scripts: true }, 'a');

          return fn(state)(basicSection)
            .then(resolveTaggedSectionWithBust);
        }
      );
    });
  });
});
