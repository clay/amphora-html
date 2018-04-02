'use strict';

const _ = require('lodash'),
  clayUtils = require('clayutils'),
  files = require('nymag-fs'),
  path = require('path');

let componentsWithVariations = [];

function findVariations(styleguide) {
  const stylePath = `styleguides/${styleguide}/components`,
    stylesheets = files.getFiles(stylePath),
    variations = _.filter(stylesheets, function (file) {
      // checks for underscores which denotes variations and make sure it's a
      // css file
      return file.includes('_') && file.includes('.css');
    });

  return variations;
}

function getVariations(styleguide) {
  const foundVariations = styleguide ? findVariations(styleguide) : [],
    componentVariations = {};

  componentsWithVariations = [];

  if (foundVariations.length !== 0) {
    _.forEach(foundVariations, function (variant) {
      let component = variant.split('_')[0],
        variantName = path.basename(variant, '.css');

      (componentVariations[component] || (componentVariations[component] = [])).push(variantName);
      componentsWithVariations.push(component);
    });
  }

  return componentVariations;
}

function setDefaultVariation(array) {
  _.forEach(array, function (val) {
    const componentName = _.isObject(val) && val._ref ? clayUtils.getComponentName(val._ref) : undefined;

    if (componentName && componentsWithVariations.indexOf(componentName) !== -1) {
      if (!val.componentVariation) {
        _.set(val, 'componentVariation', componentName);
      }
    }

    if (val.content) {
      setDefaultVariation(val.content);
    }
  });
}

exports.getVariations = _.memoize(getVariations);
exports.setDefaultVariation = _.memoize(setDefaultVariation);

// for testing
exports.componentsWithVariations = componentsWithVariations;
