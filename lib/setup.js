'use strict';

const path = require('path'),
  files = require('nymag-fs'),
  _ = require('lodash'),
  glob = require('glob'),
  fs = require('fs'),
  render = require('./render'),
  nymagHbs = require('nymag-handlebars'),
  hbs = nymagHbs(),
  TEMPLATE_NAME = 'template';

// Placeholder for the package.json and rootPath
var pkg, rootPath;

/**
 * Assign the package.json value
 *
 * @param  {Object} value
 */
function assignPkg(value) {
  return pkg = value ? value : require(path.resolve(rootPath, 'package.json'));
}

/**
 * Assign a path to serve as the root for where the renderer
 * will begin looking for template and media files and then
 * register all the Handlebars partials
 *
 * @param {String} path
 */
function addRootPath(path) {
  // Export the root path
  module.exports.rootPath = rootPath = path;
  // Set the package.json value
  assignPkg();
  // Register partials
  registerPartials();
  // Set partials for render
  render.setHbs(module.exports.hbs);
}

/**
 * Return all components from both node_modules and
 * the `components` directory.
 *
 * @return {Array}
 */
function getComponents() {
  const npmComponents = _(pkg.dependencies).map(function (version, name) {
    if (_.includes(name, 'clay-')) {
      // this is a clay component
      if (_.includes(name, path.sep)) {
        // this is a scogped npm component!
        // return the name without the scope/user
        return name.split(path.sep)[1];
      }
      // this is an unscoped npm component
      return name;
    } // otherwise returns undefined, and is compacted below
  }).compact().value();

  return files.getFolders(path.resolve(rootPath, 'components')).concat(npmComponents);
}

/**
 * Register the partial with `nymag-handlebars` for reference later
 */
function registerPartials() {
  _.each(getComponents(), function (component) {
    var templateFile =  getPossibleTemplates(component, TEMPLATE_NAME),
      isHandlebars = _.includes(templateFile, '.handlebars') || _.includes(templateFile, '.hbs'),
      templateFileContents,
      modifiedTemplateFile;

    if (isHandlebars) {
      templateFileContents = fs.readFileSync(templateFile, 'utf8');
      // this wrapper guarantees we'll never render a component in a partial if it doesn't have a _ref
      modifiedTemplateFile = nymagHbs.wrapPartial(component, templateFileContents);

      hbs.registerPartial(component, modifiedTemplateFile);
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
 * @param  {String} name
 * @param  {String} templateName
 * @return {String}
 */
function getPossibleTemplates(name, templateName) {
  const filePath = getComponentPath(name);

  if (_.isString(filePath)) {
    return glob.sync(path.join(filePath, `${templateName}.*`))[0];
  }

  return [];
}

/**
 * Get a component name, so we can look it up in the file system.
 *
 * @param {string} name
 * @returns {string|false}
 */
function getComponentName(name) {
  return _.includes(getComponents(), name) && name;
}

/**
 * Grab the location on the filesystem
 * for a component's directory.
 *
 * @param  {String} name
 * @return {String}
 */
function getComponentPath(name) {
  let result = null,
    modulePath, npmName;

  // make sure it's a component we have (either in /components or package.json)
  if (module.exports.getComponentName(name)) {
    modulePath = path.resolve(rootPath, 'components', name);

    if (fs.existsSync(modulePath)) {
      result = modulePath;
    } else {
      npmName = getScopedModuleName(name);
      modulePath = npmName && path.resolve(rootPath, 'node_modules', npmName);
      result = modulePath;
    }
  }

  return result;
}

/**
 * Get the full name of a possibly-scoped npm component
 *
 * @param {string} name, e.g. 'clay-header'
 * @returns {string|undefined} e.g. '@nymdev/clay-header'
 */
function getScopedModuleName(name) {
  return _.findKey(pkg.dependencies, function (version, dep) {
    return _.includes(dep, name);
  });
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

// Values assigned via functions post-instantiation
module.exports.rootPath = null;
module.exports.hbs = null;

// Setup functions
module.exports.addRootPath = addRootPath;
module.exports.addHelpers = addHelpers;

// For Testing
module.exports.assignPkg = assignPkg;
module.exports.getComponentName = getComponentName;
