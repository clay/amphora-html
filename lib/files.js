/**
 * File-system use goes here.
 *
 * We should try to reduce these, so logging when it happens is useful.
 *
 * It's also useful to mock it away in other components.
 */

'use strict';

let _ = require('lodash'),
  control = require('./control'),
  fs = require('fs'),
  path = require('path'),
  pkg = require(path.resolve('package.json')),
  req = require;

/**
 * @param {string} file
 * @returns {boolean}
 */
function isDirectory(file) {
  try {
    return fs.statSync(file).isDirectory();
  } catch (ex) {
    return false;
  }
}


/**
 * Get folder names.
 *
 * Should only occur once per directory.
 *
 * @param  {string} dir enclosing folder
 * @return {[]}     array of folder names
 */
function getFolders(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(function (file) {
        return exports.isDirectory(path.join(dir, file));
      });
  } catch (ex) {
    return [];
  }
}

/**
 * Get array of component names, from node_modules and components folder.
 *
 * Should only occur once!
 * @return {[]}
 */
function getComponents() {
  const npmComponents = _(pkg.dependencies).map(function (version, name) {
    if (_.includes(name, 'clay-')) {
      // this is a clay component
      if (_.includes(name, path.sep)) {
        // this is a scoped npm component!
        // return the name without the scope/user
        return name.split(path.sep)[1];
      }
      // this is an unscoped npm component
      return name;
    } // otherwise returns undefined, and is compacted below
  }).compact().value();

  return getFolders(path.resolve('components')).concat(npmComponents);
}

/**
 * Get a component name, so we can look it up in the file system.
 *
 * @param {string} name
 * @returns {string|false}
 */
function getComponentName(name) {
  return _.includes(exports.getComponents(), name) && name;
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
 * Get path to component folder.
 *
 * @param  {string} name
 * @return {string}
 */
function getComponentPath(name) {
  let result = null,
    modulePath, npmName;

  // make sure it's a component we have (either in /components or package.json)
  if (getComponentName(name)) {
    modulePath = path.resolve('components', name);

    if (fs.existsSync(modulePath)) {
      result = modulePath;
    } else {
      npmName = getScopedModuleName(name);
      modulePath = npmName && path.resolve('node_modules', npmName);
      result = modulePath;
    }
  }

  return result;
}

/**
 * Try to require a module, do not fail if module is missing
 * @param {string} filePath
 * @returns {module}
 * @throw if fails for reason other than missing module
 */
function tryRequire(filePath) {
  let resolvedPath;

  try {
    resolvedPath = req.resolve(filePath);
  } catch (ex) {
    return undefined;
  }
  return req(resolvedPath);
}

/**
 * Returns a promise representing the retrieval of content from a file
 *
 * @param  {string} file A filename
 * @return {Promise}
 */
function readFilePromise(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

module.exports.getComponents = control.memoize(getComponents);
module.exports.getComponentPath = control.memoize(getComponentPath);
module.exports.isDirectory = control.memoize(isDirectory);
module.exports.tryRequire = control.memoize(tryRequire);
module.exports.readFilePromise = control.memoize(readFilePromise);

/**
 * @param {object} value
 */
function setPackageConfiguration(value) {
  pkg = value;
}

/**
 * @param {function} value
 */
function setRequire(value) {
  req = value;
}


// for testing
exports.setPackageConfiguration = setPackageConfiguration;
exports.setRequire = setRequire;
