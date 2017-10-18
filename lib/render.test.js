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

    it('given a template is not found, returns a reject promise', function (done) {
      const data = mockData();

      data._self = 'site.com/components/bar/instances/bar';
      lib.setHbs(hbs);

      lib(data).catch(err => {
        expect(err).to.be.an('Error');
        done();
      });

    });

    it("'calls hooks from plugins' `render` functions", () => {
      const data = mockData();

      data._self = 'site.com/pages/index';
      data._layoutRef = 'site.com/components/layout/instances/foo';
      sandbox.stub(hbs.partials, 'layout').returns('<html></html>');

      let calledWith;

      require('./setup').plugins.push({
        render(data) {
          calledWith = data;
          return data;
        }
      });

      lib.setHbs(hbs);
      return lib(data)
        .then(html => {
          // expect(html.output).to.equal('<html></html>');
          expect(calledWith).to.equal(data);
        });
    });

  });

  describe('configure', function () {
    const fn = lib[this.title];

    it('calls the mediaService configure function', function () {
      fn({ editAssetTags: true });
      sinon.assert.calledOnce(mediaService.configure)
    });
  });
});
