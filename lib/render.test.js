'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  files = require('nymag-fs'),
  mediaService = require('./media'),
  expect = require('chai').expect,
  sinon = require('sinon');

describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(files);
    sandbox.stub(mediaService);
  });

  afterEach(function () {
    sandbox.restore();
  });

  function mockData() {
    return {
      _componentSchemas: {
        layout: {
          value: true
        }
      },
      locals: {
        host: 'host.com'
      },
      _media: {
        css: [],
        js: []
      }
    };
  }

  describe('render', function () {
    var hbs = {
      partials: {
        layout: _.noop,
        foo: _.noop
      }
    };

    it('renders a page with a layout', function () {
      var data = mockData();

      data._self = 'site.com/pages/index';
      data._layoutRef = 'site.com/components/layout/instances/foo';
      sandbox.stub(hbs.partials, 'layout').returns('<html></html>');
      lib.setHbs(hbs);
      return lib(data).then(html => expect(html.output).to.deep.equal('<html></html>'));
    });

    it('renders a component individually', function () {
      var data = mockData();

      data._self = 'site.com/components/foo/instances/bar',
      sandbox.stub(hbs.partials, 'foo').returns('<div></div>');
      lib.setHbs(hbs);
      return lib(data).then(html => expect(html.output).to.deep.equal('<div></div>'));
    });

    it('throws an error if a template is not found', function () {
      var data = mockData(),
        result = function () {
          lib(data);
        };

      data._self = 'site.com/components/bar/instances/bar';
      lib.setHbs(hbs);
      expect(result).to.throw(Error);
    });
  });
});
