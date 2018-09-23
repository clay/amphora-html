
'use strict';

const clayLog = require('clay-log'),
  pkg = require('../package.json');
var amphoraHtmlLogInstance;

/**
 * Initialize the logger
 */
function init() {
  if (amphoraHtmlLogInstance) {
    return;
  }

  // Initialize the logger
  clayLog.init({
    name: 'amphora-html',
    prettyPrint: true,
    meta: {
      amphoraHtmlVersion: pkg.version
    }
  });

  // Store the instance
  amphoraHtmlLogInstance = clayLog.getLogger();
}

/**
 * Setup new logger for a file
 *
 * @param  {Object} meta
 * @return {Function}
 */
function setup(meta = {}) {
  return clayLog.meta(meta, amphoraHtmlLogInstance);
}

/**
 * Set the logger instance
 * @param {Object|Function} replacement
 */
function setLogger(replacement) {
  amphoraHtmlLogInstance = replacement;
}

// Setup on first require
init();

module.exports.init = init;
module.exports.setup = setup;
module.exports.setLogger = setLogger;
