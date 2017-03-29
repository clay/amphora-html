'use strict';

const _ = require('lodash'),
  setup = require('./lib/setup'),
  media = require('./lib/media'),
  files = require('./lib/files'),
  glob = require('glob'),
  path = require('path'),
  defaultHtmlTemplateName = 'template',
  config = {
    responseType: 'html'
  };

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
 * [renderComponent description]
 * @param  {[type]} data [description]
 * @return [type]        [description]
 */
function render(data) {
  console.log(data);


  // const template = _.get(getPossibleTemplates(data.template, defaultHtmlTemplateName), '[0]', undefined);
  //
  // if (!template) {
  //   throw new Error('Missing template for ' + data.template);
  // }
  //
  // return Promise.resolve(setup.multiplex.render(template, data))
  //   .then(media.append(data))
  //   .then(result => {
  //     return {
  //       output: result,
  //       type: config.responseType
  //     }
  //   });
}


module.exports.render = render;
module.exports.config = config;

// Expose setup functions from root
module.exports.addEngines = setup.addEngines;
module.exports.addRootPath = setup.addRootPath;
