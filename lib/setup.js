'use strict';

const multiplexTemplates = require('multiplex-templates');

/**
 * Add engines to the multiplex template renderer.
 *
 * Overwrite the default `exports.multiplex`.
 *
 * @param {Object} engines
 */
function addEngines(engines) {
  module.exports.multiplex = multiplexTemplates(engines);
}

/**
 * Assign a path to serve as the root for where the renderer
 * will begin looking for template and media files
 *
 * @param {String} path
 */
function addRootPath(path) {
  module.exports.rootPath = path;
}

// Values assigned via functions post-instantiation
module.exports.multiplex = null;
module.exports.rootPath = null;

// Setup functions
module.exports.addEngines = addEngines;
module.exports.addRootPath = addRootPath;
