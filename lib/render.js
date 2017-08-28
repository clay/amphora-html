'use strict';

const _ = require('lodash'),
  mediaService = require('./media'),
  clayUtils = require('clay-utils');

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
 * Take in the data returned from Amphora and turn it into HTML output.
 *
 * @param  {Object} data
 * @return {Promise}
 */
function render(data) {
  const template = clayUtils.getComponentName(data._layoutRef || data._self),
    rootPartial = hbs.partials[template],
    composedData = composeData(data);

  if (!rootPartial) {
    throw new Error(`Missing template for ${data.template}`);
  }

  return Promise.resolve(rootPartial(composedData))
    .then(mediaService.append(data._media, data.locals.edit, data.locals.site))
    .then(result => {
      return {
        output: result,
        type: 'html'
      };
    });
}

function configure({ editAssetTags }) {
  mediaService.configure(editAssetTags);
}

module.exports = render;
module.exports.configure = configure;
module.exports.setHbs = function (val) {
  hbs = val;
};
