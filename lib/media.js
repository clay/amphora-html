'use strict';

const _ = require('lodash'),
  path = require('path'),
  files = require('nymag-fs'),
  bluebird = require('bluebird'),
  setup = require('./setup'),
  styleguide = require('./styleguide'),
  STYLE_TAG = 'style',
  SCRIPT_TAG = 'scripts',
  ASYNC_SCRIPT_TAG = 'async',
  DEFER_SCRIPT_TAG = 'defer',
  ASYNC_DEFER_SCRIPT_TAG = 'async-defer',
  MODULE_SCRIPT_TAG = 'module',
  MODULEPRELOAD_TAG = 'modulepreload',
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
  // When omitCacheBusterOnModules is enabled, content-hashed ESM files omit the
  // ?version= query string — the hash in the filename already provides cache busting.
  // Defaults to false so existing deployments are unaffected.
  var moduleBuster = module.exports.omitCacheBusterOnModules ? '' : buster;

  return bluebird.resolve(_.map(fileArray, function (file) {
    if (tag === STYLE_TAG) {
      return `<link rel="stylesheet" type="text/css" href="${file}${buster}">`;
    } else if (tag === ASYNC_SCRIPT_TAG) {
      return `<script async src="${file}" type="text/javascript"></script>`;
    } else if (tag === DEFER_SCRIPT_TAG) {
      return `<script defer src="${file}" type="text/javascript"></script>`;
    } else if (tag === ASYNC_DEFER_SCRIPT_TAG) {
      return `<script async defer src="${file}" type="text/javascript"></script>`;
    } else if (tag === MODULE_SCRIPT_TAG) {
      return `<script type="module" src="${file}${moduleBuster}"></script>`;
    } else if (tag === MODULEPRELOAD_TAG) {
      // <link rel="modulepreload"> tells the browser to fetch ESM scripts early,
      // during HTML parsing, before reaching the <script> tags at </body>.
      return `<link rel="modulepreload" href="${file}${moduleBuster}">`;
    } else {
      return `<script type="text/javascript" src="${file}${buster}"></script>`;
    }
  }).join('\n'));
}

/**
 * Gets a list of all css and js needed for the components listed.
 * @param {Object} state
 * @returns {{styles: Array, scripts: Array}}
 */
function getMediaMap(state) {
  return {
    styles: module.exports.getStyleFiles(state),
    scripts: module.exports.getScriptFiles(state),
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

  // check for clay compile linked? clay compile font files?
  const defaultFontPath = path.join(assetDir, 'css', '_linked-fonts._default.css');
  const siteFontPath = path.join(assetDir, 'css', `_linked-fonts.${siteStyleguide}.css`);

  // add any default and site font css
  cssFilePaths.push(defaultFontPath);
  cssFilePaths.push(siteFontPath);

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

  return state._components
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
    // modulepreload: when true, <link rel="modulepreload"> hints are injected
    // into <head> for ESM scripts, and ?version= is omitted from module URLs
    // since content-hashed filenames already provide cache busting.
    // Opt-in only — defaults to false for backwards compatibility.
    if (options.modulepreload !== undefined) {
      module.exports.modulepreload = !!options.modulepreload;
      module.exports.omitCacheBusterOnModules = !!options.modulepreload;
    }
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
/* eslint-disable complexity */
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
    // Expose rendered component names so resolveMedia can do per-component script resolution
    // (e.g. pack-next manifest lookup) without needing a reference to the full state object.
    locals._components = state._components;
    if (setup.resolveMedia) mediaMap = setup.resolveMedia(mediaMap, locals) || mediaMap;

    // moduleScripts: ESM scripts (e.g. from esbuild pack-next) that need type="module"
    const moduleScriptFiles = mediaMap.moduleScripts || [];

    mediaMap.moduleScripts = moduleScriptFiles.length
      ? injectTags(moduleScriptFiles, locals.site, MODULE_SCRIPT_TAG)
      : bluebird.resolve(false);

    // modulePreloads: <link rel="modulepreload"> hints for <head>.
    // Only active when configure({ modulepreload: true }) has been called — opt-in so
    // sites not using the clay build pipeline are completely unaffected.
    const modulePreloadFiles = module.exports.modulepreload
      ? mediaMap.modulePreloads || []
      : [];

    mediaMap.modulePreloads = modulePreloadFiles.length
      ? injectTags(modulePreloadFiles, locals.site, MODULEPRELOAD_TAG)
      : bluebird.resolve(false);

    if (!locals.edit) {
      mediaMap.styles = combineFileContents(mediaMap.styles, 'public/css', '/css/', STYLE_TAG);
      mediaMap.scripts = combineFileContents(mediaMap.scripts, 'public/js', '/js/', SCRIPT_TAG);
    } else {
      mediaMap.styles = module.exports.editStylesTags ? injectTags(mediaMap.styles, locals.site, STYLE_TAG) : combineFileContents(mediaMap.styles, 'public/css', '/css/', STYLE_TAG);
      mediaMap.scripts = module.exports.editScriptsTags ? injectTags(mediaMap.scripts, locals.site, SCRIPT_TAG) : combineFileContents(mediaMap.scripts, 'public/js', '/js/', SCRIPT_TAG);
    }

    return bluebird.props(mediaMap)
      .then(combinedFiles => {
        // modulepreload hints go first in <head>, before CSS, so the browser can
        // start fetching ESM scripts at the earliest possible moment.
        html = combinedFiles.modulePreloads ? appendMediaToTop(combinedFiles.modulePreloads, html) : html;
        html = combinedFiles.styles ? appendMediaToTop(combinedFiles.styles, html) : html; // If there are styles, append them
        html = combinedFiles.moduleScripts ? appendMediaToBottom(combinedFiles.moduleScripts, html) : html; // ESM module scripts (type="module")
        html = combinedFiles.scripts ? appendMediaToBottom(combinedFiles.scripts, html) : html; // If there are scripts, append them
        return html; // Return the compiled HTML
      });
  };
}
/* eslint-enable complexity */

module.exports.injectScriptsAndStyles = injectScriptsAndStyles;
module.exports.getMediaMap = getMediaMap;
module.exports.cacheBuster = '';
module.exports.configure = configure;
module.exports.editStylesTags = false;
module.exports.editScriptsTags = false;
// Opt-in flags for the clay build (esbuild) pipeline.
// Enable via configure({ modulepreload: true }).
module.exports.modulepreload = false;
module.exports.omitCacheBusterOnModules = false;

// For testing
module.exports.getScriptFiles = getScriptFiles;
module.exports.getStyleFiles = getStyleFiles;
