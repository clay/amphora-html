'use strict';

const _ = require('lodash'),
  expect = require('chai').expect,
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  sinon = require('sinon'),
  files = require('nymag-fs');


describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
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

    sandbox = sinon.sandbox.create();
    sandbox.stub(files);

    files.getFiles.withArgs('styleguides/di/components').returns(diMockData);
    files.getFiles.withArgs('styleguides/vulture/components').returns(vultureMockData);
    files.getFiles.withArgs('styleguides/_default/components').returns(defaultMockData);

    // bust memoization cache
    lib.getVariations.cache = new Map();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('get all available component variations', function () {
    var expected = {
      blockquote: [ 'blockquote_red', 'blockquote_blue' ],
      video: [ 'video_fullbleed', 'video_mobile' ],
      'pull-quote': ['pull-quote_large']
    };

    expect(lib.getVariations('vulture')).to.deep.equal(expected);
  });

  it('gets default variations', function () {
    var expected = {
      'pull-quote': [ 'pull-quote_large' ],
      blockquote: [ 'blockquote_red' ]
    };

    expect(lib.getVariations('_default')).to.deep.equal(expected);
  });

  it('set default variations for components that have variations but none set', function () {
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

    expect(testData).to.deep.equal(expectedData);
    expect(state._usedVariations).to.deep.equal(expectedUsedVariations);
  });

  it('sets default variation if specified variation does not exist', function () {
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
    expect(testData).to.deep.equal(expectedData);
  });

  it('handles rendering a component and not a page', function () {
    let testData = {
        content: [{
          _ref: 'domain.com/_components/blockquote/instances/foo'
        }]
      },
      expectedData = {
        content: [
          {
            _ref: 'domain.com/_components/blockquote/instances/foo',
            componentVariation: 'blockquote'
          }
        ]
      },
      state = {
        _self: 'domain.com/_components/foo/instances/bar',
        _layoutRef: undefined,
        _componentVariations: {}
      };

    lib.setDefaultVariations(testData, state);
    expect(testData).to.deep.equal(expectedData);
  });

  it('do not change data if there are no components in the page data', function () {
    var testData = ['Steve Rogers', 'Tony Stark', 'Natasha Romanov', 'Clint Barton', 'Wanda Maximoff'],
      variations = lib.getVariations('vulture'),
      state = {
        _layoutRef: 'www.vulture.com/_components/layout/instances/article',
        _componentVariations: variations
      };

    lib.setDefaultVariations(testData, state);
    expect(testData).to.equal(testData);
  });

  it('do not change data if there are no component variations', function () {
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
    expect(testData).to.equal(testData);
  });

});
