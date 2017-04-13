'use strict';

const _ = require('lodash'),
  setup = require('./setup'),
  mediaService = require('./media'),
  files = require('./files'),
  glob = require('glob'),
  path = require('path'),
  defaultHtmlTemplateName = 'template';

/**
 * Check root of their project, or the 1st level of their node_modules
 *
 * @param {string} name
 * @param {string} templateName  'template', 'apple', 'facebook'
 * @returns {string[]}  List of all templates available.
 */
function getPossibleTemplates(name, templateName) {
  const filePath = files.getComponentPath(name);

  if (_.isString(filePath)) {
    return glob.sync(path.join(filePath, templateName + '.*'));
  }

  return [];
}

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
 * [mapDataToNunjucksFormat description]
 * @param  {Object} data
 * @return {Object}
 */
function mapDataToNunjucksFormat(data) {
  var { _media, getTemplate, _components, locals, site, _version, _componentSchemas, state, _self, _pageData, _layoutRef } = data,
    renderableObj = {
      getTemplate,
      _components,
      locals,
      site,
      _version,
      _componentSchemas,
      media: _media,
      state,
      _self,
      _pageData,
      _layoutRef
    };

  _.assign(renderableObj, data._data);

  return renderableObj;
}

/**
 * Take in the data returned from Amphora and turn it into HTML output.
 *
 * @param  {Object} data
 * @return {Promise}
 */
function render(data) {
  const possibleTemplate = module.exports.getPossibleTemplates(getComponentName(data), defaultHtmlTemplateName),
    template = _.get(possibleTemplate, '[0]', undefined);

  if (!template) {
    throw new Error(`Missing template for ${data.template}`);
  }

  return Promise.resolve(module.exports.sendToMultiplex(template, mapDataToNunjucksFormat(data))())
    .then(mediaService.append(data._media))
    .then(result => {
      return {
        output: result,
        type: 'html'
      };
    });
}

function sendToMultiplex(template, data) {
  return function () {
    return setup.multiplex.render(template, data);
  }
}

module.exports = render;
module.exports.getPossibleTemplates = getPossibleTemplates;
module.exports.getComponentName = getComponentName;
module.exports.mapDataToNunjucksFormat = mapDataToNunjucksFormat;
module.exports.sendToMultiplex = sendToMultiplex;
