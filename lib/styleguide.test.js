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
      ];

    sandbox = sinon.sandbox.create();
    sandbox.stub(files);

    files.getFiles.withArgs('styleguides/di/components').returns(diMockData);
    files.getFiles.withArgs('styleguides/vulture/components').returns(vultureMockData);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('get all available component variations', function () {
    var expected = {
      blockquote: [ 'blockquote_red', 'blockquote_blue' ],
      video: [ 'video_fullbleed', 'video_mobile' ]
    };

    expect(lib.getVariations('vulture')).to.deep.equal(expected);
  });

  it('if there is no styleguide set, there should be no variations set', function () {
    expect(lib.getVariations()).to.deep.equal({});
  });

  it('if there are no component variations, return an empty object', function () {

    expect(lib.getVariations('di')).to.deep.equal({});
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
          },
          {
            _ref: 'www.vulture.com/_components/article-sidebar/instances/foobar@published',
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
      variations = lib.getVariations('vulture');

    lib.setDefaultVariation(testData, variations);

    expect(testData).to.deep.equal(expectedData);
  });

  it('do not change data if there are no components in the page data', function () {
    var testData = ['Steve Rogers', 'Tony Stark', 'Natasha Romanov', 'Clint Barton', 'Wanda Maximoff'],
      variations = lib.getVariations('vulture');

    lib.setDefaultVariation(testData, variations);
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
      variations = lib.getVariations('di');

    lib.setDefaultVariation(testData, variations);
    expect(testData).to.equal(testData);
  });

});
