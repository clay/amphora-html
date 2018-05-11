'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  mediaService = require('./media'),
  sinon = require('sinon'),
  setup = require('./setup'),
  styleguide = require('./styleguide');

function mockRes(box) {
  return {
    type: box.spy(),
    send: box.spy(),
    status: box.spy()
  };
}

describe(_.startCase(filename), function () {
  let sandbox, fakeLog, getSchemaPathStub, getComponentPathStub, getIndicesStub;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    fakeLog = sandbox.spy();
    getSchemaPathStub = sandbox.stub();
    getComponentPathStub = sandbox.stub();
    getIndicesStub = sandbox.stub();
    setup.plugins = [];

    lib.setFsFns({ getSchemaPathStub, getComponentPathStub, getIndicesStub });
    lib.setLog(fakeLog);

    sandbox.stub(mediaService);

    sandbox.stub(styleguide, 'setDefaultVariations');
  });

  afterEach(function () {
    sandbox.restore();
  });

  function mockData() {
    return {
      _ref: 'site.com/_components/foo/instances/foo',
      bar: true
    };
  }

  function mockPageMeta() {
    return {
      _layoutRef: 'site.com/_components/layout/instances/foo',
      _ref: 'site.com/_pages/index',
      locals: {
        host: 'host.com'
      }
    };
  }

  function mockPageMetaWithStyleguide() {
    return {
      _layoutRef: 'site.com/_components/layout/instances/foo',
      _ref: 'site.com/_pages/index',
      locals: {
        host: 'host.com',
        site: {
          styleguide: 'stylez'
        }
      }
    };
  }
  function mockCmptMeta() {
    return {
      _ref: 'site.com/_components/foo/instances/foo',
      locals: {
        host: 'host.com'
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
      const res = mockRes(sandbox),
        meta = mockPageMeta(),
        plugin = sandbox.stub().returnsArg(1);

      mediaService.injectScriptsAndStyles.returns('<html><html>');
      sandbox.stub(hbs.partials, 'layout').returns('<html></html>');

      setup.plugins = [{ render: plugin }];
      lib.setHbs(hbs);

      return lib(mockData(), meta, res)
        .then(() => {
          sinon.assert.calledOnce(plugin);
        });
    });

    it("Given it is edit mode, skips hooks from plugins' `render` functions", () => {
      const res = mockRes(sandbox),
        meta = mockPageMeta(),
        plugin = sandbox.stub().returnsArg(1);

      getIndicesStub.returns({ components: ['foo'] });
      meta.locals.edit = true;
      sandbox.stub(hbs.partials, 'layout').returns('<html></html>');
      setup.plugins = [{ render: plugin }];
      lib.setHbs(hbs);

      return lib('some data', meta, res)
        .then(() => {
          sinon.assert.notCalled(plugin);
        });
    });

    it('renders a page with a layout', function () {
      var data = mockData(),
        meta = mockPageMeta(),
        res = mockRes(sandbox);

      sandbox.stub(hbs.partials, 'layout').returns('<html></html>');
      lib.setHbs(hbs);
      return lib(data, meta, res)
        .then(() => {
          sinon.assert.calledWith(res.send, '<html></html>');
        });
    });

    it('look for component variations', function () {
      var data = mockData(),
        meta = mockPageMetaWithStyleguide(),
        res = mockRes(sandbox);

      sandbox.stub(hbs.partials, 'layout').returns('<html></html>');
      sandbox.stub(styleguide,'getVariations');

      lib.setHbs(hbs);
      return lib(data, meta, res)
        .then(() => {
          sinon.assert.calledOnce(styleguide.getVariations);
        });
    });

    it('set default component variations', function () {
      var data = mockData(),
        meta = mockPageMetaWithStyleguide(),
        res = mockRes(sandbox);

      sandbox.stub(styleguide, 'getVariations', ()=>{
        return {
          video: ['video_fullbleed', 'video_mobile']
        };
      });
      sandbox.stub(hbs.partials, 'layout').returns('<html></html>');

      lib.setHbs(hbs);

      return lib(data, meta, res)
        .then(() => {
          sinon.assert.called(styleguide.setDefaultVariations);
        });
    });

    it('renders a component individually', function () {
      var data = mockData(),
        res = mockRes(sandbox),
        meta = mockCmptMeta(),
        tpl = '<div></div>';

      sandbox.stub(hbs.partials, 'foo').returns(tpl);
      lib.setHbs(hbs);
      return lib(data, meta, res)
        .then(() => {
          sinon.assert.calledWith(res.send, tpl);
        });
    });

    it('given a template is not found, returns a reject promise', function (done) {
      const data = mockData(),
        res = mockRes(sandbox),
        meta = mockCmptMeta();

      meta._ref = 'site.com/_components/bar/instances/bar';
      lib.setHbs(hbs);

      lib(data, meta, res)
        .then(() => {
          sinon.assert.calledWith(res.status, 500);
          sinon.assert.calledWith(fakeLog, 'error');
          done();
        });
    });

    describe('configure', function () {
      const fn = lib[this.title];

      it('calls the mediaService configure function', function () {
        fn({ editAssetTags: true });
        sinon.assert.calledOnce(mediaService.configure);
      });
    });

    describe('addEnvVars', function () {
      const fn = lib[this.title];

      it('sets env vars', function () {
        fn(['foo', 'bar', 'baz']);
        sinon.assert.calledOnce(fakeLog);
      });
    });
  });
});
