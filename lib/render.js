'use strict';

const _ = require('lodash'),
  mediaService = require('./media'),
  clayUtils = require('clayutils'),
  bluebird = require('bluebird'),
  setup = require('./setup');

var hbs, ENV_VARS,
  log = require('./log').setup({ file: __filename });

/**
 * Create the object passed to the partial for rendering.
 * Remember, Kiln is expecting certain things in the object,
 * but it doesn't expect the FULL
 *
 * @param  {Object} state
 * @return {Object}
 */
function composeData(state) {
  var initialState = {};

  if (state.locals.edit) {
    initialState._envVars = ENV_VARS;
  }

  return  _.assign(initialState, _.pick(state, ['_self', '_layoutRef', '_componentSchemas', 'locals']), state._data);
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
      throw new Error(`Missing template for ${template}`);
    }

    return rootPartial(composedData);
  };
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
      res.type('text/html');
      res.send(result);
    })
    .then(logTime(hrStart, 'rendered route', state.locals.url))
    .catch(err => {
      log('error', err.message, { stack: err.stack });
      res.status(500);
      res.send(err);
    });
}

/**
 * Log the render time
 *
 * @param  {Object} hrStart
 * @param  {String} msg
 * @param  {String} route
 * @return {Function}
 */
function logTime(hrStart, msg, route) {
  return () => {
    const diff = process.hrtime(hrStart),
      ms = Math.floor((diff[0] * 1e9 + diff[1]) / 1000000);

    log('info', `${msg}: ${route} (${ms}ms)`, {
      renderTime: ms,
      route,
      type: 'html'
    });
  };
}

function configure({ editAssetTags, cacheBuster }) {
  mediaService.configure(editAssetTags, cacheBuster);
}

module.exports = render;
module.exports.configure = configure;
module.exports.setEnvVars = (vars) => { ENV_VARS = vars; };
module.exports.setHbs = (val) => { hbs = val; };

// For testing
module.exports.setLog = (fakeLog) => { log = fakeLog; };
