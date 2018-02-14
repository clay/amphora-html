'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  files = require('nymag-fs'),
  mediaService = require('./media'),
  sinon = require('sinon'),
  setup = require('./setup');

function mockRes(box) {
  return {
    type: box.spy(),
    send: box.spy(),
    status: box.spy()
  };
}

describe(_.startCase(filename), function () {
  let sandbox, fakeLog;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    fakeLog = sandbox.spy();
    setup.plugins = [];

    sandbox.stub(files);
    sandbox.stub(mediaService);
    lib.setLog(fakeLog);
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

    it('if not in edit mode, calls hooks from plugins\' `render` functions', () => {
      const state = Object.assign({}, mockData(), {
          _data: 'some data',
          _self: 'site.com/_pages/index',
          _layoutRef: 'site.com/_components/layout/instances/foo'
        }),
        res = mockRes(sandbox),
        plugin = sandbox.stub();

      mediaService.injectScriptsAndStyles.returns('<html><html>');
      sandbox.stub(hbs.partials, 'layout').returns('<html></html>');


      setup.plugins = [{ render: plugin }];
      lib.setHbs(hbs);

      return lib(state, res)
        .then(() => {
          sinon.assert.calledOnce(plugin);
        });
    });

    it("Given it is edit mode, skips hooks from plugins' `render` functions", () => {
      const data = Object.assign({}, mockData(), {
          locals: {
            edit: true
          },
          _data: 'some data',
          _self: 'site.com/pages/index',
          _layoutRef: 'site.com/components/layout/instances/foo',
        }),
        plugin = sandbox.spy(),
        res = mockRes(sandbox);

      sandbox.stub(hbs.partials, 'layout').returns('<html></html>');
      setup.plugins = [{ render: plugin }];
      lib.setHbs(hbs);

      return lib(data, res)
        .then(() => {
          sinon.assert.notCalled(plugin);
        });
    });

    it('renders a page with a layout', function () {
      var state = mockData(),
        res = mockRes(sandbox);

      state._self = 'site.com/_pages/index';
      state._layoutRef = 'site.com/_components/layout/instances/foo';
      sandbox.stub(hbs.partials, 'layout').returns('<html></html>');
      lib.setHbs(hbs);
      return lib(state, res)
        .then(() => {
          sinon.assert.calledWith(res.send, '<html></html>');
        });
    });

    it('renders a component individually', function () {
      var state = mockData(),
        res = mockRes(sandbox),
        tpl = '<div></div>';

      state._self = 'site.com/_components/foo/instances/bar',
      sandbox.stub(hbs.partials, 'foo').returns(tpl);
      lib.setHbs(hbs);
      return lib(state, res)
        .then(() => {
          sinon.assert.calledWith(res.send, tpl);
        });
    });

    it('given a template is not found, returns a reject promise', function (done) {
      const data = mockData(),
        res = mockRes(sandbox);

      data._self = 'site.com/_components/bar/instances/bar';
      lib.setHbs(hbs);

      lib(data, res)
        .then(() => {
          sinon.assert.calledWith(res.status, 500);
          sinon.assert.calledWith(fakeLog, 'error');
          done();
        });
    });
  });

  describe('configure', function () {
    const fn = lib[this.title];

    it('calls the mediaService configure function', function () {
      fn({ editAssetTags: true });
      sinon.assert.calledOnce(mediaService.configure);
    });
  });
});
