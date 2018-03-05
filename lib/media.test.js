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

  const state = {
      locals: {
        edit: true,
        site: {
          slug: 'foo',
          assetDir: '/foo'
        }
      }
    },
    emptyMediaMap = {
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
    };

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
      getScripts.withArgs('a', state.locals.site).returns(['/e/a']);
      getScripts.withArgs('b', state.locals.site).returns(['/e/b']);
      getScripts.withArgs('c', state.locals.site).returns(['/e/c', '/e/cc']);

      expect(fn({ _components: ['a', 'b', 'c'], locals: state.locals })).to.deep.equal({scripts: ['/e/a', '/e/b', '/e/c', '/e/cc'], styles: []});
    });
  });

  describe('getStyles', function () {
    const fn = lib[this.title];

    it('accepts bad component', function () {
      files.fileExists.returns(false);
      expect(fn('name', state.locals.site)).to.deep.equal([]);
    });

    it('accepts good component', function () {
      files.fileExists.onCall(0).returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/css/name.css']);
    });

    it('accepts good component with slug (no slug file)', function () {
      files.fileExists.onCall(0).returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/css/name.css']);
    });

    it('accepts good component with slug (with slug file)', function () {
      files.fileExists.onCall(0).returns(true);
      files.fileExists.onCall(1).returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/css/name.css', '/css/name.foo.css']);
    });

    it('accepts good component with slug (with slug file) with assetDir', function () {
      files.fileExists.withArgs('/foo/css/name.css').returns(true);
      files.fileExists.withArgs('/foo/css/name.foo.css').returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/css/name.css', '/css/name.foo.css']);
    });

    it('uses the MEDIA_DIRECTORY if one is not defined on the site', function () {
      files.fileExists.withArgs(`${process.cwd()}/public/css/name.css`).returns(true);
      files.fileExists.withArgs(`${process.cwd()}/public/css/name.foo.css`).returns(true);

      expect(fn('name', {
        slug: 'foo'
      })).to.deep.equal(['/css/name.css', '/css/name.foo.css']);
    });
  });

  describe('getScripts', function () {
    const fn = lib[this.title];

    it('accepts bad component', function () {
      files.fileExists.returns(false);

      expect(fn('name', state.locals.site)).to.deep.equal([]);
    });

    it('accepts good component', function () {
      files.fileExists.onCall(0).returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/js/name.js']);
    });

    it('accepts good component with slug (no slug file)', function () {
      files.fileExists.onCall(0).returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/js/name.js']);
    });

    it('accepts good component with slug (with slug file)', function () {
      files.fileExists.onCall(0).returns(true);
      files.fileExists.onCall(1).returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/js/name.js', '/js/name.foo.js']);
    });

    it('accepts good component with slug (with slug file) with assetDir', function () {
      files.fileExists.withArgs('/foo/js/name.js').returns(true);
      files.fileExists.withArgs('/foo/js/name.foo.js').returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/js/name.js', '/js/name.foo.js']);
    });

    it('accepts good component with slug (with slug file) with assetDir', function () {
      files.fileExists.withArgs('/foo/js/name.js').returns(true);
      files.fileExists.withArgs('/foo/js/name.foo.js').returns(true);

      expect(fn('name', state.locals.site)).to.deep.equal(['/js/name.js', '/js/name.foo.js']);
    });

    it('uses the MEDIA_DIRECTORY if one is not defined on the site', function () {
      files.fileExists.withArgs(`${process.cwd()}/public/js/name.js`).returns(true);
      files.fileExists.withArgs(`${process.cwd()}/public/js/name.foo.js`).returns(true);

      expect(fn('name', {
        slug: 'foo'
      })).to.deep.equal(['/js/name.js', '/js/name.foo.js']);
    });

    it('uses the assetHost valye if one is passed in', function () {
      files.fileExists.withArgs(`${process.cwd()}/public/js/name.js`).returns(true);
      files.fileExists.withArgs(`${process.cwd()}/public/js/name.foo.js`).returns(true);

      expect(fn('name', {
        slug: 'foo',
        assetHost: 'https://cache.foo.com'
      })).to.deep.equal(['https://cache.foo.com/js/name.js', 'https://cache.foo.com/js/name.foo.js']);
    });
  });

  describe('injectScriptsAndStyles', function () {
    const fn = lib[this.title];

    it('calls resolveMedia if it\'s defined', function () {
      setup.resolveMedia = sandbox.stub().returns(emptyMediaMap);
      fn(state)(basicHtml);
      sinon.assert.calledOnce(setup.resolveMedia);
    });

    it('uses default media map if resolve media returns false', function () {
      setup.resolveMedia = sandbox.stub().returns(false);

      return fn(state)(basicHtml)
        .then(function () {
          sinon.assert.calledOnce(setup.resolveMedia);
        });
    });

    it('throws when missing html', function () {
      expect(function () {
        fn(state)();
      }).to.throw('Missing html parameter');
    });

    it('adds nothing to bottom of head when no styles', function () {
      return fn(state)(basicHtml).then((html) => {
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
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicHtml)
          .then(resolveBody);
      });

      // Error
      it('throws an error if there is an error reading the file', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.reject(new Error()));

        return fn(state)(basicHtml)
          .catch(reject);
      });

      // Section HTML
      it('adds to top of root', function () {
        files.readFilePromise.cache = new _.memoize.Cache();

        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      it('it checks for inlining vs script tags if edit mode', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(cssMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      it('inlines styles in edit mode if the options', function () {
        sandbox.stub(lib, 'getMediaMap').returns(cssMediaMap);
        lib.configure({ styles: true, scripts: false });

        return fn(state)(basicSection)
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
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(scriptMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(scriptString));

        return fn(state)(basicHtml)
          .then(resolveBody);
      });

      it('adds to bottom of root', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(scriptMediaMap));
        files.readFilePromise.onCall(0).returns(Promise.resolve(scriptString));

        return fn(state)(basicSection)
          .then(resolveSection);
      });

      it('inlines scripts in edit mode if the options', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(scriptMediaMap));
        lib.configure({ styles: false, scripts: true });

        return fn(state)(basicSection)
          .then(resolveTaggedSection);
      });

      it('inlines scripts in edit mode if the options with the cache busting', function () {
        sandbox.stub(lib, 'getMediaMap').returns(_.cloneDeep(scriptMediaMap));
        lib.configure({ styles: false, scripts: true }, 'a');

        return fn(state)(basicSection)
          .then(resolveTaggedSectionWithBust);
      });
    });
  });
});
