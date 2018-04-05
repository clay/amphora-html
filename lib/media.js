'use strict';

const _ = require('lodash'),
  path = require('path'),
  files = require('nymag-fs'),
  bluebird = require('bluebird'),
  setup = require('./setup'),
  styleguide = require('./styleguide'),
  STYLE_TAG = 'style',
  SCRIPT_TAG = 'scripts',
  MEDIA_DIRECTORY = path.join(process.cwd(), 'public');

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
  if (tag === SCRIPT_TAG) {
    return `<script type="text/javascript">
      // <![CDATA[
        ${string}
      // ]]
    </script>`;
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

function injectTags(fileArray, site, tag) {
  var buster = module.exports.cacheBuster ? `?version=${module.exports.cacheBuster}` : '';

  return bluebird.resolve(_.map(fileArray, function (file) {
    if (tag === STYLE_TAG) {
      return `<link rel="stylesheet" type="text/css" href="${file}${buster}">`;
    } else {
      return `<script type="text/javascript" src="${file}${buster}"></script>`;
    }
  }).join('\n'));
}

/**
 * Gets a list of all css and js needed for the components listed.
 *
 * NOTE: the getStyles and getScripts are memoized using all arguments
 *
 * @param {Array} componentList
 * @param {string} slug
 * @returns {{styles: Array, scripts: Array}}
 */
function getMediaMap({ _components:componentList, locals }) {
  return {
    styles: flatMap(componentList, (component) => module.exports.getStyles(component, locals.site)),
    scripts: flatMap(componentList, (component) => module.exports.getScripts(component, locals.site))
  };
}

/**
 * Get the proper scripts for the component
 *
 * @param {string} name
 * @param {object} site
 * @returns {array}
 */
function getScripts(name, site) {
  const slug = site.slug,
    assetDir = site && site.assetDir || MEDIA_DIRECTORY,
    assetPath = site && site.assetPath || '',
    assetHost = site && site.assetHost || '';

  return _.map(_.filter([
    path.join(assetDir, 'js', name + '.js'),
    path.join(assetDir, 'js', name + '.' + slug + '.js')
  ], files.fileExists), pathJoin(assetHost, assetPath, assetDir));
}

/**
 * @param {Array} list
 * @param {function} fn
 * @returns {Array}
 */
function flatMap(list, fn) {
  return _.filter(_.flattenDeep(_.map(list, fn)), _.identity);
}

/**
 * Get the proper styles for the component. If a styleguide is configured, use
 * that css. Defaults to the site slug
 *
 * @param {string} name
 * @param {object} site
 * @returns {array}
 */
function getStyles(name, site) {
  const stylesSource = site && site.styleguide || site && site.slug,
    assetDir = site && site.assetDir || MEDIA_DIRECTORY,
    assetPath = site && site.assetPath || '',
    assetHost = site && site.assetHost || '';

  let availableVariations, cssFilePaths;

  if (!site.styleguide) {
    cssFilePaths = [
      path.join(assetDir, 'css', name + '.css'),
      path.join(assetDir, 'css', name + '.' + stylesSource + '.css')
    ];
  } else {
    availableVariations = styleguide.getVariations(site.styleguide);
    cssFilePaths = [path.join(assetDir, 'css', name + '.' + stylesSource + '.css')];

    // if there are variations available for the component, add them to the list
    // of file paths we want
    if (availableVariations[name]) {
      availableVariations[name].forEach((variation)=>{
        cssFilePaths.push(path.join(assetDir, 'css', variation + '.' + stylesSource +  '.css'));
      });
    }
  }

  return _.map(_.filter(cssFilePaths, files.fileExists), pathJoin(assetHost, assetPath, assetDir));
}

/**
 * Trim the path on the file system bythe link of the
 * asset directory and then join it with either the assetHost
 * value of the site or the assetPath value (found in the
 * site's config file)
 *
 * @param  {String} assetHost
 * @param  {String} assetPath
 * @param  {String} assetDir
 * @return {Function}
 */
function pathJoin(assetHost, assetPath, assetDir) {
  var assetDirLen = assetDir.length;

  return function (filePath) {
    var pathToFile = filePath.substr(assetDirLen);

    if (assetHost) return `${assetHost}${pathToFile}`;
    return path.join(assetPath, pathToFile);
  };
}

/**
 * Set the values for inlining vs tagging edit mode styles/scripts
 *
 * @param  {object|boolean} options
 * @param {string} [cacheBuster]
 */
function configure(options, cacheBuster = '') {
  if (options && _.isObject(options)) {
    module.exports.editStylesTags = options.styles || false;
    module.exports.editScriptsTags = options.scripts || false;
  } else {
    module.exports.editStylesTags = options;
    module.exports.editScriptsTags = options;
  }
  // Assign cacheBuster
  module.exports.cacheBuster = cacheBuster;
}

/**
 * Given the state and html string...
 *
 * 1. Find all associated scripts/styles
 * 2. Run `resolveMedia`
 * 3. Stitch in the assets' contents
 * 4. Return the HTML string
 *
 * @param  {Object} state
 * @return {Function}
 */
function injectScriptsAndStyles(state) {
  const { locals } = state;

  return function (html) {
    var mediaMap = {};

    // Check that HTML is string
    if (typeof html !== 'string') {
      throw new Error('Missing html parameter');
    }

    // We've got a string so let's actually get the map of styles
    mediaMap = module.exports.getMediaMap(state);

    // allow site to change the media map before applying it
    if (setup.resolveMedia) mediaMap = setup.resolveMedia(mediaMap, locals) || mediaMap;

    if (!locals.edit) {
      mediaMap.styles = combineFileContents(mediaMap.styles, 'public/css', '/css/', STYLE_TAG);
      mediaMap.scripts = combineFileContents(mediaMap.scripts, 'public/js', '/js/', SCRIPT_TAG);
    } else {
      mediaMap.styles = module.exports.editStylesTags ? injectTags(mediaMap.styles, locals.site, STYLE_TAG) : combineFileContents(mediaMap.styles, 'public/css', '/css/', STYLE_TAG);
      mediaMap.scripts = module.exports.editScriptsTags ? injectTags(mediaMap.scripts, locals.site, SCRIPT_TAG) : combineFileContents(mediaMap.scripts, 'public/js', '/js/', SCRIPT_TAG);
    }

    return bluebird.props(mediaMap)
      .then(combinedFiles => {
        html = combinedFiles.styles ? appendMediaToTop(combinedFiles.styles, html) : html; // If there are styles, append them
        html = combinedFiles.scripts ? appendMediaToBottom(combinedFiles.scripts, html) : html; // If there are scripts, append them
        return html; // Return the compiled HTML
      });
  };
}

module.exports.injectScriptsAndStyles = injectScriptsAndStyles;
module.exports.getMediaMap = getMediaMap;
module.exports.cacheBuster = '';
module.exports.configure = configure;
module.exports.editStylesTags = false;
module.exports.editScriptsTags = false;

// For testing
module.exports.getScripts = getScripts;
module.exports.getStyles = getStyles;
