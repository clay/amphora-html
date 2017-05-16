'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  files = require('nymag-fs'),
  media = require('./media'),
  setup = require('./setup'),
  glob = require('glob'),
  path = require('path'),
  expect = require('chai').expect,
  sinon = require('sinon');

// var mockMultiplexRender = {
//   render: function () {
//     return '<html></html>';
//   }
// };

describe(_.startCase(filename), function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(files);
    sandbox.stub(path);
    sandbox.stub(setup);
    sandbox.stub(media);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getPossibleTemplates', function () {
    const fn = lib[this.title];

    it('returns template', function () {
      const reference = 'domain.com/path/components/whatever',
        template = 'template.hbs';

      files.getComponentPath.returns('asdf');
      sandbox.stub(glob, 'sync').returns([template]);

      expect(fn(reference, 'template')).to.eql([template]);
    });

    it('returns template from node_modules', function () {
      const reference = 'domain.com/path/components/whatever',
        template = 'template.hbs';

      files.getComponentPath.returns('asdf/node_modules/asdf');
      sandbox.stub(glob, 'sync').returns([template]);

      expect(fn(reference, 'template')).to.eql([template]);
    });

    it('returns an empty array if no filePath is found', function () {
      const reference = 'domain.com/path/components/whatever';

      files.getComponentPath.returns(undefined);

      expect(fn(reference, 'template')).to.eql([]);
    });
  });

  describe('getComponentName', function () {
    const fn = lib[this.title],
      noInstanceUri = 'somesite.com/apath/components/layout',
      layoutUri = 'somesite.com/apath/components/layout/instances/xyz',
      compUri = 'somesite.com/apath/components/component/instances/xyz';

    it('returns a component name with no instance', function () {
      expect(fn({_layoutRef: noInstanceUri})).to.equal('layout');
    });


    it('returns a component name from a _layoutRef', function () {
      expect(fn({_layoutRef: layoutUri})).to.equal('layout');
    });

    it('returns a component name from a _self', function () {
      expect(fn({_self: compUri})).to.equal('component');
    });
  });

  describe('mapDataToNunjucksFormat', function () {
    const fn = lib[this.title],
      amphoraData = {
        _media: '',
        getTemplate: '',
        _components: '',
        locals: '',
        site: '',
        _version: '',
        _componentSchemas: '',
        state: '',
        _self: '',
        _pageData: '',
        _layoutRef: '',
        _data: {
          test: 'test'
        }
      },
      formattedObj = {
        getTemplate: '',
        _components: '',
        locals: '',
        site: '',
        _version: '',
        _componentSchemas: '',
        media: '',
        state: '',
        _self: '',
        _pageData: '',
        _layoutRef: '',
        test: 'test'
      };

    it('turns data from Amphora into a format consumable by Nunjucks', function () {
      expect(fn(amphoraData)).to.deep.equal(formattedObj);
    });
  });

  describe('render', function () {

    it('creates an HTML string', function () {
      sandbox.stub(lib, 'getPossibleTemplates').returns('/some/path/to/template.handlebars');
      sandbox.stub(lib, 'sendToMultiplex').returns('<html></html>');
      sandbox.stub(lib, 'mapDataToNunjucksFormat').returns({});
      // setup.multiplex.returns(mockMultiplexRender);

      // sandbox.stub(setup, 'multiplex').returns(mockMultiplexRender);
      sandbox.stub(media, 'append').returns('<html></html>');

      return lib({_layoutRef: 'components/layout/instances/foo'}).then(html => expect(html).to.deep.equal('<html></html>'));
    });
  });
});
