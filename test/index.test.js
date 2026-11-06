'use strict';

const { describe, it } = require('node:test'),
  assert = require('node:assert/strict'),
  lib = require('..'),
  setup = require('../lib/setup'),
  render = require('../lib/render');

describe('index', () => {
  it('exports the renderer and the functions that set it up', () => {
    assert.deepEqual(Object.keys(lib), ['render', 'addEnvVars', 'addResolveMedia', 'addHelpers', 'addPlugins', 'configureRender']);
    assert.equal(lib.render, render);
    assert.equal(lib.addEnvVars, render.addEnvVars);
    assert.equal(lib.addResolveMedia, setup.addResolveMedia);
    assert.equal(lib.addHelpers, setup.addHelpers);
    assert.equal(lib.addPlugins, setup.addPlugins);
    assert.equal(lib.configureRender, setup.configureRender);
  });
});
