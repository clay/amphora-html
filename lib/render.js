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
 * Take in the data returned from Amphora, call `render` hooks,
 * and return HTML output.
 *
 * @param  {Object} data
 * @return {Promise<String>} html
 */
function render(data) {

  const hooks = _.chain(setup.plugins)
                  .map('render')
                  .compact()
                  .value();

  return bluebird.reduce(hooks, (data, hook) => hook(data), data)
  .then(data => {
    // console.log(JSON.stringify(data, null, 2));
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
