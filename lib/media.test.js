'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  setup = require('./setup'),
  files = require('nymag-fs');

describe(_.startCase(filename), function () {
  let sandbox,
    basicHtml = '<html><head></head><body></body></html>',
    basicSection = '<section><header></header><footer></footer></section>',
    styleString = '.test { color: red; }',
    linkString = '/css/article.css',
    tagString = '/js/a.js',
    scriptString = 'console.log("Tests!");',
    componentStyleHtml = '<html><head><style>' + styleString + '</style></head><body></body></html>',
    componentScriptHtml = `<html><head></head><body><script type="text/javascript">
      // <![CDATA[
        ${scriptString}
      // ]]
    </script></body></html>`,
    componentStyleSection = '<section><style>' + styleString + '</style><header></header><footer></footer></section>',
    componentLinkedSection = `<section><link rel="stylesheet" type="text/css" href="${linkString}"><header></header><footer></footer></section>`,
    componentScriptSection = `<section><header></header><footer></footer><script type="text/javascript">
      // <![CDATA[
        ${scriptString}
      // ]]
    </script></section>`,
    componentTaggedSection = `<section><header></header><footer></footer><script type="text/javascript" src="${tagString}"></script></section>`,
    componentTaggedSectionWithBust = `<section><header></header><footer></footer><script type="text/javascript" src="${tagString}?version=a"></script></section>`;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(files);
  });

  afterEach(function () {
    sandbox.restore();
    lib.editStylesTags = false;
    lib.editScriptsTags = false;
    setup.resolveMedia = undefined;
  });

  const state = {
    locals: {
      edit: true,
      site: {
        slug: 'foo',
        assetDir: '/foo'
      }
    }
  }

  const emptyMediaMap = {
      scripts: [],
      styles: []
    },
    cssMediaMap = {
      scripts: [],
      styles: ['/css/article.css']
    },
    scriptMediaMap = {
      scripts: ['/js/a.js'],
      styles: []
    },
    fakeSite = {
      slug: 'fake',
      assetPath: ''
    };

  describe('configure', function () {
    const fn = lib[this.title];

    it('sets both edit styles and scripts to true if a boolean is passed in', function () {
      fn(true);

      expect(lib.editStylesTags).to.be.true;
      expect(lib.editScriptsTags).to.be.true;
    });

    it('sets both edit styles and scripts to false if a boolean is passed in', function () {
      fn(false);

      expect(lib.editStylesTags).to.be.false;
      expect(lib.editScriptsTags).to.be.false;
    });

    it('uses object properties to set the values', function () {
      fn({ styles: true, scripts: false });

      expect(lib.editStylesTags).to.be.true;
      expect(lib.editScriptsTags).to.be.false;
    });
  });

  describe('getMediaMap', function () {
    const fn = lib[this.title];

    it('accepts empty list, empty slug', function () {
      expect(fn([])).to.deep.equal({scripts: [], styles: []});
    });

    it('accepts list, empty slug (non-existent components)', function () {
      expect(fn(['a', 'b', 'c'])).to.deep.equal({scripts: [], styles: []});
    });

    it('accepts list and slug (non-existent components)', function () {
      expect(fn(['a', 'b', 'c'], 'd')).to.deep.equal({scripts: [], styles: []});
    });

    it('accepts list, empty slug', function () {
      var getScripts = sandbox.stub(lib, 'getScripts');

      sandbox.stub(lib, 'getStyles').returns([]);
      getScripts.withArgs('a', {}).returns(['/e/a']);
      getScripts.withArgs('b', {}).returns(['/e/b']);
      getScripts.withArgs('c', {}).returns(['/e/c', '/e/cc']);

      expect(fn({ _components: ['a', 'b', 'c'], locals: state.locals })).to.deep.equal({scripts: ['/e/a', '/e/b', '/e/c', '/e/cc'], styles: []});
    });
  });

  describe('getStyles', function () {
    const fn = lib[this.title];

    it('accepts bad component', function () {
      // siteService.sites.returns({});
      files.fileExists.returns(false);
      console.log(state.locals.site);
      expect(fn('name', state.locals.site)).to.deep.equal([]);
    });

    it('accepts good component', function () {
      // siteService.sites.returns({});
      files.fileExists.onCall(0).returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/css/name.css']);
    });

    it('accepts good component with slug (no slug file)', function () {
      // siteService.sites.returns({});
      files.fileExists.onCall(0).returns(true);

      expect(fn('name', 'slug')).to.deep.equal(['/css/name.css']);
    });

    // it('accepts good component with slug (with slug file)', function () {
    //   // siteService.sites.returns({});
    //   files.fileExists.onCall(0).returns(true);
    //   files.fileExists.onCall(1).returns(true);
    //
    //   expect(fn('name', state.locals.site)).to.deep.equal(['/css/name.css', '/css/name.slug.css']);
    // });
    //
    // it('accepts good component with slug (with slug file) with assetDir', function () {
    //   // siteService.sites.returns({slug: {assetDir: 'someAssetDir'}});
    //   files.fileExists.withArgs('someAssetDir/css/name.css').returns(true);
    //   files.fileExists.withArgs('someAssetDir/css/name.slug.css').returns(true);
    //
    //   expect(fn('name', 'slug')).to.deep.equal(['/css/name.css', '/css/name.slug.css']);
    // });
    //
    // it('accepts good component with slug (with slug file) with assetDir and assetPath', function () {
    //   // siteService.sites.returns({slug: {assetDir: 'someAssetDir', assetPath: '/someAssetPath'}});
    //   files.fileExists.withArgs('someAssetDir/css/name.css').returns(true);
    //   files.fileExists.withArgs('someAssetDir/css/name.slug.css').returns(true);
    //
    //   expect(fn('name', 'slug')).to.deep.equal(['/someAssetPath/css/name.css', '/someAssetPath/css/name.slug.css']);
    // });
  });

  describe('injectScriptsAndStyles', function () {
    const fn = lib[this.title];

    it('calls resolveMedia if it\'s defined', function () {
      setup.resolveMedia = sandbox.stub().returns(emptyMediaMap);
      fn(state)(basicHtml);
      sinon.assert.calledOnce(setup.resolveMedia);
    });

    it('throws when missing html', function () {
      expect(function () {
        fn(state)();
      }).to.throw('Missing html parameter');
    });

    it('adds nothing to bottom of head when no styles', function () {
      fn(state)(basicHtml).then((html) => {
        expect(html).to.deep.equal(basicHtml);
      });
    });

    it('if in view mode, just inlines immediately', function () {
      return fn({ locals: { edit: false } })(basicHtml).then((html) => {
        expect(html).to.deep.equal(basicHtml);
      });
    });

    it('adds nothing to top of root when no components', function () {
      return fn(state)(basicSection)
        .then(function (html) {
          expect(html).to.deep.equal(basicSection);
        });
    });

    it('adds nothing to bottom of root when no components', function () {
      return fn(state)(basicHtml)
        .then(function (html) {
          expect(html).to.deep.equal(basicHtml);
        });
    });

    describe('with styles', function () {
      function reject(err) {
        expect(err).to.be.an.instanceOf(Error);
      }

      function resolveBody(html) {
        expect(html).to.deep.equal(componentStyleHtml);
      }

      function resolveSection(html) {
        expect(html).to.deep.equal(componentStyleSection);
      }

      function resolveLinkedSection(html) {
        expect(html).to.deep.equal(componentLinkedSection);
      }

      // Body HTML
      it('adds to bottom of head', function () {
        sandbox.stub(lib, 'getMediaMap').returns(cssMediaMap);
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        fn(state)(basicHtml)
          .then(resolveBody);
      });

      // Error
      it('throws an error if there is an error reading the file', function () {
        sandbox.stub(lib, 'getMediaMap').returns(cssMediaMap);
        files.readFilePromise.onCall(0).returns(Promise.reject(new Error()));

        fn(state)(basicHtml)
          .catch(reject);
      });

      // Section HTML
      it('adds to top of root', function () {
        sandbox.stub(lib, 'getMediaMap').returns(cssMediaMap);
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        fn(state)(basicSection)
          .then(resolveSection);
      });

      it('it checks for inlining vs script tags if edit mode', function () {
        sandbox.stub(lib, 'getMediaMap').returns(cssMediaMap);
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        fn(state, true)(basicSection)
          .then(resolveSection);
      });

      it('inlines styles in edit mode if the options', function () {
        sandbox.stub(lib, 'getMediaMap').returns(cssMediaMap);
        lib.configure({ styles: true, scripts: false });

        fn(state, true, fakeSite)(basicSection)
          .then(resolveLinkedSection);
      });
    });

    describe('with scripts', function () {
      function resolveBody(html) {
        expect(html).to.deep.equal(componentScriptHtml);
      }

      function resolveSection(html) {
        expect(html).to.deep.equal(componentScriptSection);
      }

      function resolveTaggedSection(html) {
        expect(html).to.deep.equal(componentTaggedSection);
      }

      function resolveTaggedSectionWithBust(html) {
        expect(html).to.deep.equal(componentTaggedSectionWithBust);
      }

      it('adds to bottom of body', function () {
        sandbox.stub(lib, 'getMediaMap').returns(scriptMediaMap);
        files.readFilePromise.onCall(0).returns(Promise.resolve(scriptString));

        fn(state)(basicHtml)
          .then(resolveBody);
      });

      it('adds to bottom of root', function () {
        sandbox.stub(lib, 'getMediaMap').returns(scriptMediaMap);
        files.readFilePromise.onCall(0).returns(Promise.resolve(scriptString));

        fn(state)(basicSection)
          .then(resolveSection);
      });

      it('inlines scripts in edit mode if the options', function () {
        sandbox.stub(lib, 'getMediaMap').returns(scriptMediaMap);
        lib.configure({ styles: false, scripts: true });

        fn(state, true, fakeSite)(basicSection)
          .then(resolveTaggedSection);
      });

      it('inlines scripts in edit mode if the options with the cache busting', function () {
        sandbox.stub(lib, 'getMediaMap').returns(scriptMediaMap);
        lib.configure({ styles: false, scripts: true }, 'a');

        fn(state, true, fakeSite)(basicSection)
          .then(resolveTaggedSectionWithBust);
      });
    });
  });
});
