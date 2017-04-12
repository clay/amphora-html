'use strict';

const _ = require('lodash'),
  filename = __filename.split('/').pop().split('.').shift(),
  lib = require('./' + filename),
  expect = require('chai').expect,
  sinon = require('sinon'),
  files = require('./files');

describe(_.startCase(filename), function () {
  let sandbox,
    basicHtml = '<html><head></head><body></body></html>',
    basicSection = '<section><header></header><footer></footer></section>',
    styleString = '.test { color: red; }',
    scriptString = 'console.log("Tests!");',
    componentStyleHtml = '<html><head><style>' + styleString + '</style></head><body></body></html>',
    componentScriptHtml = '<html><head></head><body><script type="text/javascript">' + scriptString + '</script></body></html>',
    componentStyleSection = '<section><style>' + styleString + '</style><header></header><footer></footer></section>',
    componentScriptSection = '<section><header></header><footer></footer><script type="text/javascript">' + scriptString + '</script></section>';

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(files);
  });

  afterEach(function () {
    sandbox.restore();
  });


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
    };

  describe('append', function () {
    const fn = lib[this.title];

    it('throws when missing html', function () {
      expect(function () {
        fn(emptyMediaMap)();
      }).to.throw('Missing html parameter');
    });

    it('adds nothing to bottom of head when no styles', function () {
      fn(emptyMediaMap)(basicHtml).then((html) => {
        expect(html).to.deep.equal(basicHtml);
      });
    });

    it('adds nothing to top of root when no components', function () {
      fn(emptyMediaMap)(basicSection)
        .then(function (html) {
          expect(html).to.deep.equal(basicSection);
        });
    });

    it('adds nothing to bottom of root when no components', function () {
      fn(emptyMediaMap)(basicHtml)
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

      // Body HTML
      it('adds to bottom of head', function () {

        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        fn(cssMediaMap)(basicHtml)
          .then(resolveBody);
      });

      // Error
      it('throws an error if there is an error reading the file', function () {
        files.readFilePromise.onCall(0).returns(Promise.reject(new Error()));

        fn(cssMediaMap)(basicHtml)
          .catch(reject);
      });

      // Section HTML
      it('adds to top of root', function () {
        files.readFilePromise.onCall(0).returns(Promise.resolve(styleString));

        fn(cssMediaMap)(basicSection)
          .then(resolveSection);
      });
    });

    describe('with scripts', function () {
      function resolveBody(html) {
        expect(html).to.deep.equal(componentScriptHtml);
      }

      function resolveSection(html) {
        expect(html).to.deep.equal(componentScriptSection);
      }

      it('adds to bottom of body', function () {
        files.readFilePromise.onCall(0).returns(Promise.resolve(scriptString));

        fn(scriptMediaMap)(basicHtml)
          .then(resolveBody);
      });

      it('adds to bottom of root', function () {
        files.readFilePromise.onCall(0).returns(Promise.resolve(scriptString));

        fn(scriptMediaMap)(basicSection)
          .then(resolveSection);
      });
    });
  });
});
