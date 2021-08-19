'use strict';

const _ = require('lodash'),
  path = require('path'),
  files = require('nymag-fs'),
  bluebird = require('bluebird'),
  setup = require('./setup'),
  styleguide = require('./styleguide'),
  url = require('url'),
  STYLE_TAG = 'style',
  SCRIPT_TAG = 'scripts',
  ASYNC_SCRIPT_TAG = 'async',
  DEFER_SCRIPT_TAG = 'defer',
  ASYNC_DEFER_SCRIPT_TAG = 'async-defer',
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
    } else if (tag === ASYNC_SCRIPT_TAG) {
      return `<script async src="${file}" type="text/javascript"></script>`;
    } else if (tag === DEFER_SCRIPT_TAG) {
      return `<script defer src="${file}" type="text/javascript"></script>`;
    } else if (tag === ASYNC_DEFER_SCRIPT_TAG) {
      return `<script async defer src="${file}" type="text/javascript"></script>`;
    } else {
      return `<script type="text/javascript" src="${file}${buster}"></script>`;
    }
  }).join('\n'));
}

/**
 * Filter the components rendered in this request, removing Webpack-managed
 * assets so that we can fall back on Browserify.
 *
 * @param {Object} state - Amphora render state.
 * @returns {string[]} - A list of components not available through Webpack.
 */
function filterManifestComponents(state) {
  const site = state.locals.site,
    assetDir = site && site.assetDir || MEDIA_DIRECTORY,
    manifestName = site && site.manifestName || 'assets-manifest.json',
    manifestFile = path.resolve(path.join(assetDir, manifestName));
  let manifest;

  try {
    manifest = files.tryRequire(manifestFile);
  } catch (err) {
    return state._components;
  }


  return state._components
    .filter(componentName => !manifest.hasOwnProperty(`${ componentName }.js`));
}

/**
 * Gets a list of all css and js needed for the components listed.
 * @param {Object} state
 * @returns {{styles: Array, scripts: Array}}
 */
function getMediaMap(state) {
  return {
    styles: module.exports.getStyleFiles(state),
    scripts: [],
    manifestAssets: module.exports.getManifestAssets(state)
  };
}

/* eslint-disable complexity */
/**
 * Get the proper styles for the component. If a styleguide is configured, use
 * that css. Defaults to the site slug
 *
 * @param {Object} state
 * @returns {array}
 */
function getStyleFiles(state) {
  const { site } = state.locals,
    assetDir = site && site.assetDir || MEDIA_DIRECTORY,
    assetPath = site && site.assetPath || '',
    assetHost = site && site.assetHost || '',
    siteStyleguide = site && site.styleguide,
    layoutName = _.get(state, '_layoutData.name');
  let cssFilePaths = [], layoutBasePath;

  // legacy behavior: load <component>.css and <component>.<site>.css
  if (!site.styleguide) {
    const siteSlug = site && site.slug;

    cssFilePaths = state._components
      .reduce((acc, curr) => {
        acc.push(
          path.join(assetDir, 'css', `${curr}.css`),
          path.join(assetDir, 'css', `${curr}.${siteSlug}.css`)
        );
        return acc;
      }, []);
  // in edit mode, grab all variations
  } else if (state.locals.edit) {
    const availableVariations = styleguide.getVariations(siteStyleguide);

    cssFilePaths = state._components
      .reduce((acc, cmptName) => {
        acc.push(cmptName, ...availableVariations[cmptName] || []);
        return acc;
      }, [])
      .map(baseName => {
        const basePath = path.join(assetDir, 'css', `${baseName}.${siteStyleguide}.css`);

        return files.fileExists(basePath) ?
          basePath :
          path.join(assetDir, 'css', `${baseName}._default.css`);
      });
  // in view mode, grab only used variations
  } else if (state._usedVariations) {
    cssFilePaths = state._usedVariations
      .map(variation => {
        const styleguideVariationPath = path.join(assetDir, 'css', `${variation}.${siteStyleguide}.css`);

        return files.fileExists(styleguideVariationPath) ?
          styleguideVariationPath :
          path.join(assetDir, 'css', `${variation}._default.css`);
      });
  }

  // add the layout css
  if (layoutName) {
    layoutBasePath = path.join(assetDir, 'css', `${layoutName}.${siteStyleguide}.css`);

    if (files.fileExists(layoutBasePath)) {
      cssFilePaths.push(layoutBasePath);
    } else {
      cssFilePaths.push(path.join(assetDir, 'css', `${layoutName}._default.css`));
    }
  }

  return cssFilePaths
    .filter(files.fileExists)
    .map(pathJoin(assetHost, assetPath, assetDir));
}
/* eslint-enable complexity */

/**
 * Get the proper scripts for the component
 *
 * @param {string} name
 * @param {object} site
 * @returns {array}
 */

function getScriptFiles(state) {
  const site = state.locals.site,
    slug = site.slug,
    assetDir = site && site.assetDir || MEDIA_DIRECTORY,
    assetPath = site && site.assetPath || '',
    assetHost = site && site.assetHost || '';

  return filterManifestComponents(state)
    .reduce((prev, name) => {
      prev.push(
        path.join(assetDir, 'js', `${name}.js`),
        path.join(assetDir, 'js', `${name}.${slug}.js`),
        path.join(assetDir, 'js', `${name}.client.js`)
      );
      return prev;
    }, [])
    .filter(files.fileExists)
    .map(pathJoin(assetHost, assetPath, assetDir));
}

/**
 * Read the asset manifest generated by the `clay pack` bundling command and
 * check for scripts which match the rendered component names. The manifest for
 * each asset lists its complete set of dependencies, so we dedupe them.
 * Webpack's runtime is added to the beginning of the list, downstream legacy
 * globals and Clay CLI's init script to the end.
 *
 * @param {Object} state - Amphora's render state.
 * @return {string[]} A list of component assets.
 */
function getManifestAssets(state) {
  const site = state.locals.site,
    assetDir = site && site.assetDir || MEDIA_DIRECTORY,
    assetHost = site && site.assetHost || '/',
    manifestName = site && site.manifestName || 'assets-manifest.json',
    manifestFile = path.resolve(path.join(assetDir, manifestName));
  let manifest;

  try {
    manifest = files.tryRequire(manifestFile);
  } catch (err) {
    return [];
  }

  const scriptFiles = _.get(manifest, ['entrypoints', 'main', 'assets', 'js'], []);

  return scriptFiles.map(script => url.resolve(assetHost, script));
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

      // TODO: Ideally, we'd load these scripts asynchronously or after the DOM
      // is ready, setting the `async` attribute, the `defer` attribute, or
      // both. Because the order in which they're parsed and executed currently
      // matters, we can't do that safely.
      mediaMap.manifestAssets = injectTags(mediaMap.manifestAssets, locals.site, SCRIPT_TAG);
    } else {
      mediaMap.styles = module.exports.editStylesTags ? injectTags(mediaMap.styles, locals.site, STYLE_TAG) : combineFileContents(mediaMap.styles, 'public/css', '/css/', STYLE_TAG);
      mediaMap.scripts = module.exports.editScriptsTags ? injectTags(mediaMap.scripts, locals.site, SCRIPT_TAG) : combineFileContents(mediaMap.scripts, 'public/js', '/js/', SCRIPT_TAG);

      // FIXME: Some of the logic which excludes client-side scripts from edit
      // mode sits with nymag/sites, in the `resolve-media` module, and some
      // lives here. Since we're currently not using Webpack for Kiln and model
      // assets, this feels like the best place to null out client scripts.
      mediaMap.manifestAssets = null;
    }

    return bluebird.props(mediaMap)
      .then(combinedFiles => {
        html = combinedFiles.styles ? appendMediaToTop(combinedFiles.styles, html) : html; // If there are styles, append them
        html = combinedFiles.manifestAssets ? appendMediaToBottom(combinedFiles.manifestAssets, html) : html; // If there are assets registered with the manifest, append them
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
module.exports.getManifestAssets = getManifestAssets;
module.exports.getScriptFiles = getScriptFiles;
module.exports.getStyleFiles = getStyleFiles;
