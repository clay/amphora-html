'use strict';

const _ = require('lodash'),
  setup = require('./setup'),
  mediaService = require('./media'),
  glob = require('glob'),
  path = require('path'),
  nymagHbs = require('nymag-handlebars'),
  hbs = nymagHbs(),
  defaultHtmlTemplateName = 'template';

/**
 * Parse out a components name from its uri
 *
 * @param  {Object} data
 * @return {String}
 */
function getComponentName(data) {
  const rootComponent = data._layoutRef || data._self,
    result = /components\/(.+?)[\/\.]/.exec(rootComponent) || /components\/(.*)/.exec(rootComponent);

  return result && result[1];
}

/**
 * [composeData description]
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
function composeData(data) {
  return  _.assign({
    _self: data._self,
    _layoutRef: data._layoutRef,
    _componentSchemas: data._componentSchemas,
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
  // const possibleTemplate = module.exports.getPossibleTemplates(getComponentName(data), defaultHtmlTemplateName),
  const template = getComponentName(data),
    rootPartial = setup.hbs.partials[template],
    composedData = composeData(data);

  if (!rootPartial) {
    throw new Error(`Missing template for ${data.template}`);
  }

  return Promise.resolve(rootPartial(composedData))
    .then(mediaService.append(data._media))
    .then(result => {
      return {
        output: result,
        type: 'html'
      };
    });
}

module.exports = render;
module.exports.getComponentName = getComponentName;
