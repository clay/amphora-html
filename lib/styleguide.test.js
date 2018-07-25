'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  files = require('nymag-fs');

jest.mock('nymag-fs', () => ({
  getFiles: () => []
}));

describe(_.startCase(filename), () => {
  beforeEach(() => {
    var diMockData = [
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

    jest.spyOn(files, 'getFiles').mockImplementation((path) => {
      if (path === 'styleguides/di/components') return diMockData;
      if (path === 'styleguides/vulture/components') return vultureMockData;
      if (path === 'styleguides/_default/components') return defaultMockData;
      return [];
    });

    // bust memoization cache
    lib.getVariations.cache = new Map();
  });

  test('get all available component variations', () => {
    var expected = {
      blockquote: [ 'blockquote_red', 'blockquote_blue' ],
      video: [ 'video_fullbleed', 'video_mobile' ],
      'pull-quote': ['pull-quote_large']
    };

    expect(lib.getVariations('vulture')).toEqual(expected);
  });

  test('gets default variations', () => {
    var expected = {
      'pull-quote': [ 'pull-quote_large' ],
      blockquote: [ 'blockquote_red' ]
    };

    expect(lib.getVariations('_default')).toEqual(expected);
  });

  test(
    'set default variations for components that have variations but none set',
    () => {
      var testData = {
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

      expect(testData).toEqual(expectedData);
      expect(state._usedVariations).toEqual(expectedUsedVariations);
    }
  );

  test(
    'sets default variation if specified variation does not exist',
    () => {
      let testData = {
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
      expect(testData).toEqual(expectedData);
    }
  );

  test('handles rendering a component and not a page', () => {
    let testData = {
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
    expect(testData).toEqual(expectedData);
  });

  test(
    'do not change data if there are no components in the page data',
    () => {
      var testData = ['Steve Rogers', 'Tony Stark', 'Natasha Romanov', 'Clint Barton', 'Wanda Maximoff'],
        variations = lib.getVariations('vulture'),
        state = {
          _layoutRef: 'www.vulture.com/_components/layout/instances/article',
          _componentVariations: variations
        };

      lib.setDefaultVariations(testData, state);
      expect(testData).toEqual(testData);
    }
  );

  test('do not change data if there are no component variations', () => {
    var testData = [
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
    expect(testData).toEqual(testData);
  });
});
