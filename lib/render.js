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
 * [getComponentName description]
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
    test = {
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


  // TODO: Rename `test` to a better variable
  _.assign(test, data._data);

  return test;
}

/**
 * [renderComponent description]
 * @param  {Object} data
 * @return {Promise}
 */
function render(data) {
  const template = _.get(getPossibleTemplates(getComponentName(data), defaultHtmlTemplateName), '[0]', undefined);

  if (!template) {
    throw new Error('Missing template for ' + data.template);
  }

  return Promise.resolve(setup.multiplex.render(template, mapDataToNunjucksFormat(data)))
    .then(mediaService.append(data._media))
    .then(result => {
      return {
        output: result,
        type: 'html'
      };
    });
}

module.exports = render;
