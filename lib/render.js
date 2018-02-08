'use strict';

const _ = require('lodash'),
  mediaService = require('./media'),
  clayUtils = require('clayutils'),
  bluebird = require('bluebird'),
  setup = require('./setup');

var hbs,
  log = require('./log').setup({ file: __filename });

/**
 * Create the object passed to the partial for rendering.
 * Remember, Kiln is expecting certain things in the object,
 * but it doesn't expect the FULL
 *
 * @param  {Object} data
 * @return {Object}
 */
function composeData(state) {
  return  _.assign({
    _self: state._self,
    _layoutRef: state._layoutRef,
    _componentSchemas: state._componentSchemas,
    _envVars: state._envVars,
    locals: state.locals
  }, state._data);
}

/**
 * Applies `render` hooks.
 * Render hooks each return `data` or a Promise for `data`.
 *
 * @param {String} ref
 * @param {Object} data
 * @param {Object} locals
 * @returns {Object} data
 */
function applyRenderHooks(ref, data, locals) {
  let localsClone;

  // skip render hooks in edit mode
  if (locals.edit) {
    return bluebird.resolve(data);
  }

  localsClone = _.cloneDeep(locals);
  return bluebird.reduce(setup.plugins, (data, plugin) => {
    return plugin.render(ref, data, localsClone);
  }, data);
}

/**
 * Given the state, find the root component, compose
 * the data into a structure Kiln will need and then
 * render the HTML
 *
 * @param  {Object} state
 * @return {Function<String>}
 */
function makeHtml(state) {
  return function (_data) {
    state._data = _data;

    const template = clayUtils.getComponentName(state._layoutRef || state._self),
      rootPartial = hbs.partials[template],
      composedData = composeData(state);

    if (!rootPartial) {
      throw new Error(`Missing template for ${state.template}`);
    }

    return rootPartial(composedData);
  }
}

/**
 * 1. Apply render hooks
 * 2. Get the HTML string
 * 3. Add in scripts/styles
 * 4. Terminate the response
 * 5. Log the status
 *
 * @param  {Object} state
 * @param  {Object} res
 * @return {Promise}
 */
function render(state, res) {
  const hrStart = process.hrtime();

  return applyRenderHooks(state._layoutRef || state.self, state._data, state.locals)
    .then(makeHtml(state))
    .then(mediaService.injectScriptsAndStyles(state))
    .then(result => {
      res.type('text/html').send(result);
      return true; // Return true for logging statement
    })
    .then(logTime(hrStart, 'rendered route', state.locals.url))
    .catch(err => log('error', err.message, { stack: err.stack }));
}

/**
 * [logTime description]
 * @param  {[type]} hrStart [description]
 * @param  {[type]} msg     [description]
 * @param  {[type]} route   [description]
 * @return {[type]}         [description]
 */
function logTime(hrStart, msg, route) {
  return function (resp) {
    if (resp) {
      const diff = process.hrtime(hrStart),
        ms = Math.floor((diff[0] * 1e9 + diff[1]) / 1000000);

      log('info', `${msg}: ${route} (${ms}ms)`, {
        renderTime: ms,
        route,
        type: 'html'
      });
    }

    return resp;
  };
}



function configure({ editAssetTags, cacheBuster }) {
  mediaService.configure(editAssetTags, cacheBuster);
}

module.exports = render;
module.exports.configure = configure;
module.exports.setHbs = function (val) {
  hbs = val;
};
