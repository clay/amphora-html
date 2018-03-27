'use strict';

const _ = require('lodash'),
  mediaService = require('./media'),
  clayUtils = require('clayutils'),
  bluebird = require('bluebird'),
  setup = require('./setup');
var { getIndices, getSchemaPath, getComponentPath } = require('amphora-fs'),
  log = require('./log').setup({ file: __filename }),
  hbs, ENV_VARS;

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
  // skip render hooks in edit mode
  if (locals.edit) {
    return bluebird.resolve(data);
  }

  return bluebird.reduce(setup.plugins, (val, plugin) => {
    return plugin.render(ref, val, locals);
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
    const template = clayUtils.getComponentName(state._layoutRef || state._ref),
      rootPartial = hbs.partials[template];

    if (!rootPartial) {
      throw new Error(`Missing template for ${template}`);
    }

    // At the final stage of rendering we need to smoosh
    // all the data together with the state.
    return rootPartial(_.assign(state, _data));
  };
}

/**
 * Construct the object that is needed by Kiln for rendering in
 * edit mode. Requires reading from the file system.
 *
 * @param  {Object} data
 * @param  {Object} meta
 * @return {Object}
 */
function makeState(data, meta) {
  var initialState = {},
    indices = getIndices(meta._layoutRef || meta._ref, data),
    componentList = indices && indices.components || [];

  // Make an affordance for _self, which was conistently implemented in Amphora pre-v7.
  initialState._self = meta._ref;
  initialState._components = componentList;

  if (meta.locals.edit) {
    initialState._envVars = ENV_VARS;
    initialState._componentSchemas = _.map(componentList, (name) => {
      return { name, schema: getSchemaPath(getComponentPath(name)) };
    });
  }

  return  _.assign(initialState, _.pick(meta, ['_layoutRef', 'locals']));
}

/**
 * 1. Apply render hooks
 * 2. Get the HTML string
 * 3. Add in scripts/styles
 * 4. Terminate the response
 * 5. Log the status
 *
 * @param  {Object} data
 * @param  {Object} meta
 * @param  {Object} res
 * @return {Promise}
 */
function render(data, meta, res) {
  const hrStart = process.hrtime();
  var state = makeState(data, meta);

  return applyRenderHooks(state._layoutRef || state.self, data, state.locals)
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

/**
 * Register the env vars so they can be passed
 * to Kiln in edit mode
 *
 * @param {Array} vars
 */
function addEnvVars(vars) {
  ENV_VARS = _.pick(process.env, vars);
  log('info', 'env vars registered with amphora html');
}


module.exports = render;
module.exports.configure = configure;
module.exports.addEnvVars = addEnvVars;
module.exports.setHbs = (val) => { hbs = val; };

// For testing
module.exports.setLog = (fakeLog) => { log = fakeLog; };
module.exports.setFsFns = ({getIndicesStub, getSchemaPathStub, getComponentPathStub }) => {
  getIndices = getIndicesStub;
  getSchemaPath = getSchemaPathStub;
  getComponentPath = getComponentPathStub;
};
