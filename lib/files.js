'use strict';

// What the renderer asks the file system. Every answer is remembered for the
// life of the process, as with nymag-fs: a file added later is not seen, and
// each file is read once.

const fs = require('fs'),
  path = require('path'),
  { memoize } = require('./utils');

/**
 * @param {string} filename
 * @returns {boolean}
 */
function fileExists(filename) {
  try {
    return !!fs.statSync(filename);
  } catch (e) {
    return false;
  }
}

/**
 * @param {string} file
 * @returns {boolean}
 */
function isDirectory(file) {
  try {
    return fs.statSync(file).isDirectory();
  } catch (e) {
    return false;
  }
}

/**
 * The files of a folder, without folders, tests and documentation
 *
 * @param {string} dir
 * @returns {string[]}
 */
function getFiles(dir) {
  try {
    return fs.readdirSync(dir)
      .filter((file) => !isDirectory(path.join(dir, file)) &&
        file.indexOf('.test.') === -1 && // ignore test files
        file.indexOf('.md') === -1); // ignore documentation files
  } catch (e) {
    return [];
  }
}

/**
 * The contents of a file
 *
 * @param {string} file
 * @returns {Promise<string>}
 */
function readFilePromise(file) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => err ? reject(err) : resolve(data));
  });
}

module.exports.fileExists = memoize(fileExists);
module.exports.getFiles = memoize(getFiles);
module.exports.readFilePromise = memoize(readFilePromise);
