'use strict';

const _ = require('lodash'),
  mediaService = require('./media'),
  clayUtils = require('clay-utils'),
  bluebird = require('bluebird'),
  setup = require('./setup');

var hbs;

/**
 * Create the object passed to the partial for rendering.
 * Remember, Kiln is expecting certain things in the object,
 * but it doesn't expect the FULL
 *
 * @param  {Object} data
 * @return {Object}
 */
function composeData(data) {
  return  _.assign({
    _self: data._self,
    _layoutRef: data._layoutRef,
    _componentSchemas: data._componentSchemas,
    _envVars: data._envVars,
    locals: data.locals
  }, data._data);
}

/**
 * Applies `render` hooks.
 * Render hooks each return `data` or a Promise for `data`.
 *
 * @param {String} ref
 * @param {Object} data
 * @param {Object} locals
 * @returns {Object} data
 */
function applyRenderHooks(ref, data, locals) {
  let localsClone;

  // skip render hooks in edit mode
  if (locals.edit) {
    return bluebird.resolve(data);
  }

  localsClone = _.cloneDeep(locals);
  return bluebird.reduce(setup.plugins, (data, plugin) => {
    return plugin.render(ref, data, localsClone);
  }, data);
}

/**
 * Take in the data returned from Amphora, call `render` hooks,
 * and return HTML output.
 *
 * @param  {Object} data
 * @return {Promise<String>} html
 */
function render(data) {
  return applyRenderHooks(data._layoutRef, data._data, data.locals)
  .then(_data => {
    data._data = _data;

    const template = clayUtils.getComponentName(data._layoutRef || data._self),
      rootPartial = hbs.partials[template],
      composedData = composeData(data);

    if (!rootPartial) {
      throw new Error(`Missing template for ${data.template}`);
    }

    return rootPartial(composedData);
  })
  .then(mediaService.append(data._media, data.locals.edit, data.locals.site))
  .then(result => {
    return {
      output: result,
      type: 'html'
    };
  });
}

function configure({ editAssetTags, cacheBuster }) {
  mediaService.configure(editAssetTags, cacheBuster);
}

module.exports = render;
module.exports.configure = configure;
module.exports.setHbs = function (val) {
  hbs = val;
};
