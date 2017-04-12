'use strict';

const _ = require('lodash'),
  setup = require('./lib/setup'),
  mediaService = require('./lib/media'),
  files = require('./lib/files'),
  glob = require('glob'),
  path = require('path'),
  defaultHtmlTemplateName = 'template',
  config = {
    responseType: 'html'
  };
  // read = require('./lib/read')();

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

function getComponentName(data) {
  const rootComponent = data._layoutRef || data._self,
    result = /components\/(.+?)[\/\.]/.exec(rootComponent) || /components\/(.*)/.exec(rootComponent);

  return result && result[1];
}

/**
 * [mapDataToNunjucksFormat description]
 * @param  {[type]} data [description]
 * @return [type]        [description]
 */
function mapDataToNunjucksFormat(data) {
  var { _media, getTemplate, _components, locals, site, _version, _componentSchemas, state, _self, _pageData, _layoutRef } = data;

  var test = {
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


  _.assign(test, data._data);

  return test;
}

/**
 * [renderComponent description]
 * @param  {[type]} data [description]
 * @return [type]        [description]
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
        type: config.responseType
      }
    });
}


module.exports.render = render;
module.exports.config = config;

// Expose setup functions from root
module.exports.addEngines = setup.addEngines;
module.exports.addRootPath = setup.addRootPath;
