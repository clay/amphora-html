'use strict';

const clayUtils = require('clayutils'),
  files = require('nymag-fs'),
  path = require('path'),
  traverse = require('traverse'),
  { isObject, assignValue, memoize } = require('./utils');

/**
 * Looks for CSS files associated with a component's variation
 *
 * @param {String} styleguide - name of the styleguide that is set in the sites config
 * @returns {string[]} variations
 */
function findVariationFiles(styleguide) {
  const stylePath = `styleguides/${styleguide}/components`,
    stylesheets = files.getFiles(stylePath),
    variations = stylesheets.filter(function (file) {
      // checks for underscores which denotes variations and make sure it's a
      // css file
      return file.includes('_') && file.includes('.css');
    });

  return variations;
}

/**
* Grabs variations of all components and returns an object organized by
* components and their variations
*
* note that variations from the site's styleguide AND the _default styleguide will be added,
* since amphora will fallback gracefully to using the _default css files if they don't
* exist in the site's styleguide
*
* @param {String} [styleguide] - name of the styleguide that is set in the sites' config
* @returns {Object} componentVariations - an object that is organized by
* component and its variations
*/
function getVariations(styleguide = '_default') {
  const foundVariations = styleguide !== '_default' ? [...new Set(findVariationFiles(styleguide).concat(findVariationFiles('_default')))] : findVariationFiles('_default'),
    componentVariations = {};

  if (foundVariations.length) {
    for (const variant of foundVariations) {
      let component = variant.split('_')[0],
        variantName = path.basename(variant, '.css');

      (componentVariations[component] || (componentVariations[component] = [])).push(variantName);
    }
  }
  return componentVariations;
}

/**
* Goes through page data and sets a default for components
*
* @param {object} _data
* @param {object} state w/ _componentVariations
*/
function setDefaultVariations(_data, state) {
  const variations = state._componentVariations,
    layoutOrSelf = clayUtils.getComponentName(state._layoutRef || state._self),
    /**
     * When rendering data it's possible that the top level _data might also
     * have a componentVariation (the simple example would be rendering an
     * individual component), in that case we should make sure that we handle
     * that as one of our usedVariations.
     */
    topLevelVariation = _data.componentVariation,
    usedVariations = {
      [topLevelVariation || layoutOrSelf]: true
    };

  traverse(_data).forEach(function (val) {
    let componentName, componentVariations;

    if (!isObject(val) || !val._ref) {
      return; // we only care about components' root data
    }

    componentName = clayUtils.getComponentName(val._ref);
    // a name like `constructor` finds what the object inherits, which is not a list
    componentVariations = Array.isArray(variations[componentName]) ? variations[componentName] : [];

    if (val.componentVariation && !componentVariations.includes(val.componentVariation)) {
      // component has a variation set, but it doesn't exist in the site's styleguide or the default styleguide!
      // render the component with the default variation
      assignValue(val, 'componentVariation', componentName);
      usedVariations[`${componentName}`] = true;
    } else if (!val.componentVariation) {
      // component has no variation set!
      // render the component with the default variation
      assignValue(val, 'componentVariation', componentName);
      usedVariations[`${componentName}`] = true;
    } else {
      usedVariations[`${val.componentVariation}`] = true;
    }
  });
  state._usedVariations = Object.keys(usedVariations);
}

exports.getVariations = memoize(getVariations);
exports.setDefaultVariations = setDefaultVariations;
