'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  setup = require('./setup'),
  lib = require('./' + filename),
  mediaService = require('./media'),
  styleguide = require('./styleguide');

describe(_.startCase(filename), () => {
  let fakeLog, getSchemaPathStub, getComponentPathStub, getIndicesStub;

  beforeEach(() => {
    fakeLog = jest.fn();
    getSchemaPathStub = jest.fn();
    getComponentPathStub = jest.fn();
    getIndicesStub = jest.fn();
    setup.plugins = [];

    jest.spyOn(styleguide, 'setDefaultVariations');

    lib.setFsFns({ getSchemaPathStub, getComponentPathStub, getIndicesStub });
    lib.setLog(fakeLog);
  });

  function mockRes() {
    return {
      type: () => false,
      send: () => false,
      status: () => false
    };
  }

  function mockData() {
    return {
      _ref: 'site.com/_components/foo/instances/foo',
      bar: true
    };
  }

  function mockPageMeta() {
    return {
      _layoutRef: 'site.com/_layouts/layout/instances/foo',
      _ref: 'site.com/_pages/index',
      locals: {
        host: 'host.com'
      }
    };
  }

  function mockPageMetaWithStyleguide() {
    return {
      _layoutRef: 'site.com/_layouts/layout/instances/foo',
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

  describe('render', () => {
    var hbs = {
      partials: {
        layout: _.noop,
        foo: _.noop
      }
    };

    test(
      'if not in edit mode, calls hooks from plugins\' `render` functions',
      () => {
        const res = mockRes(),
          meta = mockPageMeta(),
          plugin = jest.fn().mockReturnValue(1);

        jest.spyOn(mediaService, 'injectScriptsAndStyles').mockReturnValue('<html></html>');
        jest.spyOn(hbs.partials, 'layout').mockReturnValue('<html></html>');

        setup.plugins = [{ render: plugin }];
        lib.setHbs(hbs);

        return lib(mockData(), meta, res)
          .then(() => {
            expect(plugin.mock.calls.length).toBe(1);
          });
      }
    );

    test(
      'if not in edit mode, calls hooks from plugins\' `postRender` functions',
      () => {
        const res = mockRes(),
          meta = mockPageMeta(),
          plugin = jest.fn().mockReturnValue('html');

        jest.spyOn(res, 'send');
        jest.spyOn(mediaService, 'injectScriptsAndStyles').mockReturnValue('<html></html>');
        jest.spyOn(hbs.partials, 'layout').mockReturnValue('<html></html>');

        setup.plugins = [{ postRender: plugin }];
        lib.setHbs(hbs);

        return lib(mockData(), meta, res)
          .then(() => {
            expect(plugin.mock.calls.length).toBe(1);
            expect(res.send.mock.calls[0][0]).toBe('html');
          });
      }
    );

    test(
      'if in edit mode, do not call hooks from plugins\' `postRender` functions',
      () => {
        const res = mockRes(),
          meta = mockPageMeta(),
          plugin = jest.fn().mockReturnValue('html');

        jest.spyOn(res, 'send');
        jest.spyOn(mediaService, 'injectScriptsAndStyles').mockReturnValue('<html></html>');
        jest.spyOn(hbs.partials, 'layout').mockReturnValue('<html></html>');
        meta.locals.edit = true;

        setup.plugins = [{ postRender: plugin }];
        lib.setHbs(hbs);

        return lib(mockData(), meta, res)
          .then(() => {
            expect(plugin.mock.calls.length).toBe(0);
            expect(res.send.mock.calls[0][0]).toBe('<html></html>');
          });
      }
    );

    test(
      "Given it is edit mode, skips hooks from plugins' `render` and `postRender` functions",
      () => {
        const res = mockRes(),
          meta = mockPageMeta(),
          plugin1 = jest.fn().mockReturnValue(1),
          plugin2 = jest.fn().mockReturnValue(1);

        getIndicesStub.mockReturnValue({ components: ['foo'] });
        meta.locals.edit = true;
        jest.spyOn(hbs.partials, 'layout').mockReturnValue('<html></html>');
        setup.plugins = [{ render: plugin1, postRender: plugin2 }];
        lib.setHbs(hbs);

        return lib('some data', meta, res)
          .then(() => {
            expect(plugin1.mock.calls.length).toBe(0);
            expect(plugin2.mock.calls.length).toBe(0);
          });
      }
    );

    test('renders a page with a layout', () => {
      const data = mockData(),
        meta = mockPageMeta(),
        res = mockRes();

      jest.spyOn(res, 'send');
      jest.spyOn(mediaService, 'injectScriptsAndStyles').mockReturnValue('<html></html>');
      jest.spyOn(hbs.partials, 'layout').mockReturnValue('<html></html>');
      lib.setHbs(hbs);
      return lib(data, meta, res)
        .then(() => {
          expect(res.send.mock.calls[0][0]).toEqual('<html></html>');
        });
    });

    test('look for component variations', () => {
      const data = mockData(),
        meta = mockPageMetaWithStyleguide(),
        res = mockRes();

      jest.spyOn(hbs.partials, 'layout').mockReturnValue('<html></html>');
      jest.spyOn(styleguide, 'getVariations');

      lib.setHbs(hbs);
      return lib(data, meta, res)
        .then(() => {
          expect(styleguide.getVariations.mock.calls.length).toBe(1);
        });
    });

    test('set default component variations', () => {
      const data = mockData(),
        meta = mockPageMetaWithStyleguide(),
        res = mockRes();

      jest.spyOn(styleguide, 'getVariations').mockReturnValue({
        video: ['video_fullbleed', 'video_mobile']
      });
      jest.spyOn(hbs.partials, 'layout').mockReturnValue('<html></html>');

      lib.setHbs(hbs);

      return lib(data, meta, res)
        .then(() => {
          expect(styleguide.setDefaultVariations.mock.calls.length).toBe(1);
        });
    });

    test('renders a component individually', () => {
      const data = mockData(),
        res = mockRes(),
        meta = mockCmptMeta(),
        tpl = '<div></div>';

      jest.spyOn(res, 'send');
      jest.spyOn(mediaService, 'injectScriptsAndStyles').mockReturnValue('<html></html>');
      jest.spyOn(hbs.partials, 'foo').mockReturnValue(tpl);
      lib.setHbs(hbs);
      return lib(data, meta, res)
        .then(() => {
          expect(res.send.mock.calls[0][0]).toBe(tpl);
        });
    });

    test(
      'given a template is not found, returns a reject promise',
      () => {
        const data = mockData(),
          res = mockRes(),
          meta = mockCmptMeta();

        meta._ref = 'site.com/_components/bar/instances/bar';
        jest.spyOn(res, 'status');
        lib.setHbs(hbs);

        return lib(data, meta, res)
          .then(() => {
            expect(res.status.mock.calls[0][0]).toBe(500);
            expect(fakeLog.mock.calls[0][0]).toBe('error');
          });
      }
    );

    describe('configure', () => {
      const fn = lib['configure'];

      test('calls the mediaService configure function', () => {
        jest.spyOn(mediaService, 'configure');
        fn({ editAssetTags: true });
        expect(mediaService.configure.mock.calls.length).toBe(1);
      });
    });

    describe('addEnvVars', () => {
      const fn = lib['addEnvVars'];

      test('sets env vars', () => {
        fn(['foo', 'bar', 'baz']);
        expect(fakeLog.mock.calls.length).toBe(1);
      });
    });

    describe('makeState', () => {
      const fn = lib['makeState'];

      test('adds layout schema to _layoutData state in edit mode if given a _layoutRef', () => {
        const data = mockData(),
          meta = mockPageMeta();

        getIndicesStub.mockReturnValue({ components: ['foo'] });
        meta.locals.edit = true;

        expect(fn(data, meta)._layoutData).toHaveProperty('schema');
      });

      test('does not add layout to state if not given a _layoutRef', () => {
        const data = mockData(),
          meta = mockPageMeta();

        delete meta._layoutRef;

        getIndicesStub.mockReturnValue({ components: ['foo'] });

        expect(fn(data, meta)).not.toHaveProperty('_layoutData');
      });
    });
  });
});
