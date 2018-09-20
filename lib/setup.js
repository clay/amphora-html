'use strict';

const path = require('path'),
  _ = require('lodash'),
  glob = require('glob'),
  fs = require('fs'),
  render = require('./render'),
  nymagHbs = require('clayhandlebars'),
  hbs = nymagHbs(),
  TEMPLATE_NAME = 'template';
var log = require('./log').setup({file: __filename}),
  { getComponentPath, getComponents, getLayoutPath, getLayouts } = require('amphora-fs');

/**
 * Initialize the package on load
 */
function init() {
  // Register partials
  registerPartials(getRenderableItems());
  // Set partials for render
  render.setHbs(module.exports.hbs);
}

function getRenderableItems() {
  const items = [];

  _.each(getComponents(), function (cmpt) {
    items.push({
      name: cmpt,
      path: getComponentPath(cmpt)
    });
  });

  _.each(getLayouts(), function (layout) {
    items.push({
      name: layout,
      path: getLayoutPath(layout)
    });
  });

  return items;
}

/**
 * Register the partial with `nymag-handlebars` for reference later
 *
 * @param {Array} items
 */
function registerPartials(items) {
  _.each(items, function (item) {
    var templateFile = getPossibleTemplates(item.path, TEMPLATE_NAME),
      isHandlebars = _.includes(templateFile, '.handlebars') || _.includes(templateFile, '.hbs'),
      templateFileContents,
      modifiedTemplateFile;

    if (isHandlebars) {
      templateFileContents = fs.readFileSync(templateFile, 'utf8');
      // this wrapper guarantees we'll never render a component in a partial if it doesn't have a _ref
      modifiedTemplateFile = nymagHbs.wrapPartial(item.name, templateFileContents);

      hbs.registerPartial(item.name, modifiedTemplateFile);
    }
  });

  // Compile all the loaded partials
  _.forIn(hbs.partials, function (value, key) {
    if (_.isString(value)) {
      hbs.partials[key] = hbs.compile(value);
    }
  });

  module.exports.hbs = hbs;
}

/**
 * Grab the possible template files based on the name.
 * Returns a path to the file so that it can be read.
 *
 * @param  {String} filePath
 * @param  {String} templateName
 * @return {String}
 */
function getPossibleTemplates(filePath, templateName) {
  if (_.isString(filePath)) {
    return glob.sync(path.join(filePath, `${templateName}.*`))[0];
  }

  return [];
}

/**
 * Pass Handlebars helpers to `nymag-handlebars`
 *
 * @param {Object} payload
 */
function addHelpers(payload) {
  _.forIn(payload, function (value, key) {
    // set up handlebars helpers that rely on internal services
    hbs.registerHelper(`${key}`, value);
  });
}

/**
 *
 * @param {Plugin[]} pluginsArr
 */
function addPlugins(pluginsArr) {
  pluginsArr.forEach((plugin, index) => {
    if (plugin.render) {
      module.exports.plugins.push(plugin);
    } else {
      log('error', `Error in amphora-html addPlugins: No \`render\` func found for plugin at index ${index}`);
    }
  });
}

/**
 * Pass settings to the renderer
 *
 * @param  {Object} options
 */
function configureRender(options) {
  render.configure(options);
  module.exports.renderSettings = options;
}

/**
 * Add in the resolveMedia function
 *
 * @param {Function} fn
 */
function addResolveMedia(fn) {
  if (typeof fn === 'function') module.exports.resolveMedia = fn;
}

// Initialize
init();
// Values assigned via functions post-instantiation
module.exports.hbs = undefined;
module.exports.renderSettings = undefined;
module.exports.resolveMedia = undefined;
module.exports.plugins = [];

// Setup functions
module.exports.init = init;
module.exports.addHelpers = addHelpers;
module.exports.addPlugins = addPlugins;
module.exports.configureRender = configureRender;
module.exports.addResolveMedia = addResolveMedia;

// For Testing
module.exports.setLog = (fakeLog) => { log = fakeLog; };
module.exports.setFsFns = ({ getComponentPathStub, getComponentsStub, getLayoutsStub, getLayoutPathStub }) => {
  getComponentPath = getComponentPathStub;
  getComponents = getComponentsStub;
  getLayouts = getLayoutsStub;
  getLayoutPath = getLayoutPathStub;
};
