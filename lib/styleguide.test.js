'use strict';

const { describe, it, before, after, beforeEach, afterEach, mock } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  lib = require('./styleguide'),
  files = require('nymag-fs');

describe('styleguide', () => {
  beforeEach(() => {
    const diMockData = [
        'blockquote.css',
        'video.css'
      ],
      vultureMockData = [
        'blockquote.css',
        'blockquote_red.css',
        'blockquote_blue.css',
        'video.css',
        'video_fullbleed.css',
        'video_mobile.css'
      ],
      defaultMockData = [
        'blockquote.css',
        'blockquote_red.css',
        'pull-quote.css',
        'pull-quote_large.css'
      ];

    mock.method(files, 'getFiles', (path) => {
      if (path === 'styleguides/di/components') return diMockData;
      if (path === 'styleguides/vulture/components') return vultureMockData;
      if (path === 'styleguides/_default/components') return defaultMockData;
      return [];
    });

    // bust memoization cache
    lib.getVariations.cache = new Map();
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('get all available component variations', () => {
    const expected = {
      blockquote: [ 'blockquote_red', 'blockquote_blue' ],
      video: [ 'video_fullbleed', 'video_mobile' ],
      'pull-quote': ['pull-quote_large']
    };

    assert.deepEqual(lib.getVariations('vulture'), expected);
  });

  it('gets default variations', () => {
    const expected = {
      'pull-quote': [ 'pull-quote_large' ],
      blockquote: [ 'blockquote_red' ]
    };

    assert.deepEqual(lib.getVariations('_default'), expected);
  });

  it('gets default variations when passed no styleguide', () => {
    const expected = {
      'pull-quote': [ 'pull-quote_large' ],
      blockquote: [ 'blockquote_red' ]
    };

    assert.deepEqual(lib.getVariations(), expected);
  });

  it('remembers the variations of each styleguide', () => {
    const first = lib.getVariations('vulture');

    assert.equal(lib.getVariations('vulture'), first);
    assert.equal(files.getFiles.mock.callCount(), 2);
  });

  describe('with real files', () => {
    let cwd, tmp;

    before(() => {
      cwd = process.cwd();
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amphora-html-styleguide-'));
      fs.mkdirSync(path.join(tmp, 'styleguides', 'real', 'components', 'dir_x.css'), { recursive: true });
      fs.mkdirSync(path.join(tmp, 'styleguides', '_default', 'components'), { recursive: true });
      [
        'a.css', 'a_b.css', 'a_c.css.map', 'a_d.test.css', 'a_e.md.css', 'b_x.txt', 'b_y.css'
      ].forEach((file) => fs.writeFileSync(path.join(tmp, 'styleguides', 'real', 'components', file), ''));
      process.chdir(tmp);
    });

    after(() => {
      process.chdir(cwd);
      fs.rmSync(tmp, { recursive: true, force: true });
    });

    it('reads the variations from the css files of the styleguide', () => {
      // the real file system this time
      mock.restoreAll();

      const real = lib.getVariations('real');

      assert.deepEqual(Object.keys(real).sort(), ['a', 'b']);
      assert.deepEqual(real.a.slice().sort(), ['a_b', 'a_c.css.map']);
      assert.deepEqual(real.b, ['b_y']);
    });
  });

  it('set default variations for components that have variations but none set', () => {
    const testData = {
        main: [
          {
            _ref: 'www.vulture.com/_components/blockquote/instances/foo@published',
            componentVariation: 'blockquote_red'
          },
          {
            _ref: 'www.vulture.com/_components/blockquote/instances/bar@published',
          },
          {
            _ref: 'www.vulture.com/_components/clay-paragraph/instances/cjeq5662h001b3i61rr8fffu1@published',
          },
          {
            _ref: 'www.vulture.com/_components/article-sidebar/instances/foobar@published',
            content: [
              { _ref: 'www.vulture.com/_components/blockquote/instances/pho@published'}
            ]
          }
        ],
        primary: [
          {
            _ref: 'www.vulture.com/_components/video/instances/foo@published'
          },
        ]
      },
      expectedData = {
        main: [
          {
            _ref: 'www.vulture.com/_components/blockquote/instances/foo@published',
            componentVariation: 'blockquote_red'
          },
          {
            _ref: 'www.vulture.com/_components/blockquote/instances/bar@published',
            componentVariation: 'blockquote'
          },
          {
            _ref: 'www.vulture.com/_components/clay-paragraph/instances/cjeq5662h001b3i61rr8fffu1@published',
            componentVariation: 'clay-paragraph'
          },
          {
            _ref: 'www.vulture.com/_components/article-sidebar/instances/foobar@published',
            componentVariation: 'article-sidebar',
            content: [
              {
                _ref: 'www.vulture.com/_components/blockquote/instances/pho@published',
                componentVariation: 'blockquote'
              }
            ]
          }
        ],
        primary: [
          {
            _ref: 'www.vulture.com/_components/video/instances/foo@published',
            componentVariation: 'video'
          },
        ]
      },
      expectedUsedVariations = [
        'layout',
        'blockquote_red',
        'blockquote',
        'clay-paragraph',
        'article-sidebar',
        'video'
      ],
      state = {
        _layoutRef: 'www.vulture.com/_components/layout/instances/article',
        _componentVariations: lib.getVariations('vulture')
      };

    lib.setDefaultVariations(
      testData,
      state
    );

    assert.deepEqual(testData, expectedData);
    assert.deepEqual(state._usedVariations, expectedUsedVariations);
  });

  it('sets default variation if specified variation does not exist', () => {
    const testData = {
        main: [
          {
            _ref: 'domain.com/_components/blockquote/instances/foo',
            componentVariation: 'blockquote_red'
          }
        ]
      },
      expectedData = {
        main: [
          {
            _ref: 'domain.com/_components/blockquote/instances/foo',
            componentVariation: 'blockquote'
          }
        ]
      },
      state = {
        _layoutRef: 'www.vulture.com/_components/layout/instances/article',
        _componentVariations: {}
      };

    lib.setDefaultVariations(testData, state);
    assert.deepEqual(testData, expectedData);
  });

  it('handles rendering a component and not a page', () => {
    const testData = {
        content: [{
          _ref: 'domain.com/_components/blockquote/instances/foo'
        }],
        singleCmpt: {
          _ref: 'domain.com/_components/foobar/instances/baz'
        }
      },
      expectedData = {
        content: [
          {
            _ref: 'domain.com/_components/blockquote/instances/foo',
            componentVariation: 'blockquote'
          }
        ],
        singleCmpt: {
          _ref: 'domain.com/_components/foobar/instances/baz',
          componentVariation: 'foobar'
        }
      },
      state = {
        _self: 'domain.com/_components/foo/instances/bar',
        _layoutRef: undefined,
        _componentVariations: {}
      };

    lib.setDefaultVariations(testData, state);
    assert.deepEqual(testData, expectedData);
    assert.deepEqual(state._usedVariations, ['foo', 'blockquote', 'foobar']);
  });

  it('do not change data if there are no components in the page data', () => {
    const testData = ['Steve Rogers', 'Tony Stark', 'Natasha Romanov', 'Clint Barton', 'Wanda Maximoff'],
      variations = lib.getVariations('vulture'),
      state = {
        _layoutRef: 'www.vulture.com/_components/layout/instances/article',
        _componentVariations: variations
      };

    lib.setDefaultVariations(testData, state);
    assert.deepEqual(testData, ['Steve Rogers', 'Tony Stark', 'Natasha Romanov', 'Clint Barton', 'Wanda Maximoff']);
    assert.deepEqual(state._usedVariations, ['layout']);
  });

  it('only sets the default variation when there are no component variations', () => {
    const testData = [
        {
          _ref: 'nymag.com/daily/intelligencer/_components/blockquote/instances/foo@published'
        },
        {
          _ref: 'nymag.com/daily/intelligencer/_components/blockquote/instances/bar@published',
        },
        {
          _ref: 'nymag.com/daily/intelligencer/_components/clay-paragraph/instances/cjeq5662h001b3i61rr8fffu1@published',
        }
      ],
      variations = lib.getVariations('di'),
      state = {
        _layoutRef: 'nymag.com/daily/intelligencer/_components/layout/instances/article',
        _componentVariations: variations
      };

    lib.setDefaultVariations(testData, state);
    assert.deepEqual(testData.map((cmpt) => cmpt.componentVariation), ['blockquote', 'blockquote', 'clay-paragraph']);
    assert.deepEqual(state._usedVariations, ['layout', 'blockquote', 'clay-paragraph']);
  });

  it('handles top level componentVariations (when rendering an individual component with variation', () => {
    const _data = {
        _ref: 'nymag.com/daily/intelligencer/_components/blockquote/instances/foo@published',
        componentVariation: 'blockquote_red',
      },
      state = {
        _self: 'nymag.com/daily/intelligencer/_components/blockquote/instances/foo@published',
        _layoutRef: undefined,
        _componentVariations: lib.getVariations('di')
      };

    lib.setDefaultVariations(_data, state);
    assert.deepEqual(state._usedVariations, [
      'blockquote_red'
    ]);
  });

  it('walks data that refers to itself, and data shared by several components', () => {
    const shared = { _ref: 'domain.com/_components/blockquote/instances/shared' },
      data = {
        _ref: 'domain.com/_components/foo/instances/bar',
        content: [shared, { _ref: 'domain.com/_components/video/instances/v', inner: shared }]
      },
      state = {
        _self: 'domain.com/_components/foo/instances/bar',
        _componentVariations: { video: ['video_big'] }
      };

    data.self = data;
    data.content[1].componentVariation = 'video_big';

    lib.setDefaultVariations(data, state);
    assert.equal(data.componentVariation, 'foo');
    assert.equal(shared.componentVariation, 'blockquote');
    assert.equal(data.content[1].componentVariation, 'video_big');
    assert.deepEqual(state._usedVariations, ['foo', 'blockquote', 'video_big']);
  });

  it('leaves a component it cannot change as it is', () => {
    const frozen = Object.freeze({ _ref: 'domain.com/_components/blockquote/instances/a' }),
      state = {
        _self: 'domain.com/_components/foo/instances/bar',
        _componentVariations: {}
      };

    lib.setDefaultVariations({ content: [frozen] }, state);
    assert.equal(frozen.componentVariation, undefined);
    assert.deepEqual(state._usedVariations, ['foo', 'blockquote']);
  });
});
