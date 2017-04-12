'use strict';

const _ = require('lodash'),
  mediaMapProperty = 'media',
  path = require('path'),
  files = require('./files'),
  bluebird = require('bluebird'),
  styleTag = 'style',
  scriptTag = 'scripts';

/**
 * @param {Array} list
 * @param {function} fn
 * @returns {Array}
 */
function flatMap(list, fn) {
  return _.filter(_.flattenDeep(_.map(list, fn)), _.identity);
}

/**
 * @param {string} str
 * @returns {number}
 */
function findBottom(str) {
  var index = str.lastIndexOf('</body>');

  if (index === -1) {
    index = str.lastIndexOf('</');
  }

  return index;
}

/**
 * @param {string} str
 * @returns {number}
 */
function findTop(str) {
  var index = str.indexOf('</head>');

  if (index === -1) {
    index = str.indexOf('>') + 1;
  }

  return index;
}

/**
 * Put items at index in the very large target string.
 *
 * @param {string} str
 * @param {number} index
 * @param {[string]} items
 * @returns {string}
 */
function splice(str, index, items) {
  return str.substr(0, index) + items + str.substr(index);
}

/**
 * Get the contents of a string that come after specified characters.
 *
 * @param  {string} str Any string to split
 * @param  {string} dir The directory the file is in
 * @return {string}
 */
function getFileName(str, dir) {
  return str.split(dir)[1];
}

/**
 * Retrieve the contents of a file
 *
 * @param  {array} fileArray   An array of file names
 * @param  {string} targetDir  The directory to retrieve files from
 * @param  {string} filePrefix The string that comes right before the file name
 * @return {Promise}
 */
function getContentsOfFiles(fileArray, targetDir, filePrefix) {
  var allPromises = [],
    currentDir = process.cwd();

  fileArray.forEach(file => {
    allPromises.push(files.readFilePromise(path.join(currentDir, targetDir, getFileName(file, filePrefix))));
  });

  return Promise.all(allPromises)
    .catch(err => {
      throw err;
    });
}

/**
 * Wraps a string with HTML tags
 * @param  {string} string The string to wrap
 * @param  {string} tag    The HTML tag to use
 * @return {string}
 */
function wrapWithTags(string, tag) {
  if (tag === scriptTag) {
    return `<script type="text/javascript">${string}</script>`;
  } else {
    return `<style>${string}</style>`;
  }
}

/**
 * Concatenates an array of files into one string.
 *
 * @param  {array} fileArray   An array of files
 * @param  {string} directory  The directory in which `fs` will look for the file
 * @param  {string} filePrefix The directory path before the filename
 * @param  {string|null} tag   The type of tag to wrap the contents in.
 * @return {string}
 */
function combineFileContents(fileArray, directory, filePrefix, tag) {
  if (!fileArray || !fileArray.length) {
    return false;
  }

  // If there are files, retrieve contents
  return getContentsOfFiles(fileArray, directory, filePrefix)
    .then(function (fileContents) {
      return wrapWithTags(fileContents.join(''), tag);
    });
}

/**
 * Append at the bottom of the head tag, or if no head tag, then the top of root tag.
 *
 * @param {array} styles
 * @param {string} html
 * @returns {string}
 */
function appendMediaToTop(styles, html) {
  var index = findTop(html);

  return splice(html, index, styles);
}

/**
 * Append at the bottom of the body tag, or if no body tag, then the bottom of the root tag.
 * @param {Array} scripts
 * @param {string} html
 * @returns {string}
 */
function appendMediaToBottom(scripts, html) {
  var index = findBottom(html);

  return splice(html, index, scripts);
}

/**
 * @param {object} data
 * @returns {Promise}
 */
function append(mediaMap) {
  return function (html) {
    // assertion
    if (!_.isString(html)) {
      throw new Error('Missing html parameter');
    }

    return bluebird.props({
      styles: combineFileContents(mediaMap.styles, 'public/css', '/css/', styleTag),
      scripts: combineFileContents(mediaMap.scripts, 'public/js', '/js/', scriptTag)
    }).then(combinedFiles => {
      html = combinedFiles.styles ? appendMediaToTop(combinedFiles.styles, html) : html;     // If there are styles, append them
      html = combinedFiles.scripts ? appendMediaToBottom(combinedFiles.scripts, html) : html; // If there are scripts, append them
      return html;                                                                           // Return the compiled HTML
    });
  };
}

/**
 * @param {string} name
 * @param {string} slug
 * @returns {array}
 */
function getStyles(name, slug) {
  const site = siteService.sites()[slug],
    assetDir = site && site.assetDir || mediaDir,
    assetDirLen = assetDir.length,
    assetPath = site && site.assetPath || '';

  return _.map(_.filter([
    path.join(assetDir, 'css', name + '.css'),
    path.join(assetDir, 'css', name + '.' + slug + '.css')
  ], files.fileExists), function (filePath) {
    return path.join(assetPath, filePath.substr(assetDirLen));
  });
}


/**
 * @param {string} name
 * @param {string} slug
 * @returns {array}
 */
function getScripts(name, slug) {
  const site = siteService.sites()[slug],
    assetDir = site && site.assetDir || mediaDir,
    assetDirLen = assetDir.length,
    assetPath = site && site.assetPath || '';

  return _.map(_.filter([
    path.join(assetDir, 'js', name + '.js'),
    path.join(assetDir, 'js', name + '.' + slug + '.js')
  ], files.fileExists), function (filePath) {
    return path.join(assetPath, filePath.substr(assetDirLen));
  });
}

module.exports.append = append;
