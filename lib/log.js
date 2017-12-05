'use strict';
// adapted from https://github.com/clay/amphora-search/blob/cf4c8af/lib/services/log.js

const clayLog = require('clay-log'),
  pkg = require('../package.json');

let amphoraHtmlLogInstance = null,
  isInitialized = false;

/**
* Initialize the logger
*/
function ensureInitialized() {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  clayLog.init({
    name: 'amphora-html',
    prettyPrint: true,
    meta: {
      amphorHtmlVersion: pkg.version
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
function setup(meta) {
  ensureInitialized();
  return clayLog.meta(meta, amphoraHtmlLogInstance);
}

module.exports = {
  setup
};
