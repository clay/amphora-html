'use strict';

const _ = require('lodash'),
  mediaService = require('./media'),
  clayUtils = require('clayutils'),
  bluebird = require('bluebird'),
  styleguide = require('./styleguide'),
  setup = require('./setup');

let { getIndices, getSchemaPath, getComponentPath, getLayoutPath } = require('amphora-fs'),
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

  return bluebird.filter(setup.plugins, (plugin) => plugin.render)
    .reduce((val, plugin) => {
      return plugin.render(ref, val, locals);
    }, data);
}

/**
 * Applies `postRender` hooks.
 * Post Render hooks each returns `html`.
 *
 * @param {Object} locals
 * @param {Object} res
 * @returns {Function}
 */
function applyPostRenderHooks(locals, res) {
  return (html) => {

    // skip postRender hooks in edit mode
    if (locals.edit) {
      return html;
    }

    return setup.plugins.filter((plugin) => plugin.postRender)
      .reduce((val, plugin) => {
        return plugin.postRender(html, res);
      }, html);
  };
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
    const template = state._layoutData ? clayUtils.getLayoutName(state._layoutData.uri) : clayUtils.getComponentName(state._self),
      rootPartial = hbs.partials[template];

    styleguide.setDefaultVariations(_data, state);

    if (!rootPartial) {
      throw new Error(`Missing template for ${template}`);
    }

    // At the final stage of rendering we need to smoosh
    // all the data together with the state.
    _.assign(state, _data);

    // send clone of state/data to be used by kiln so kiln doesn't load component data that was mutated by hbs templates
    if (state.locals.edit) {
      _.assign(state, { _componentData: _.cloneDeep(_data) });
    }

    return rootPartial(state);
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

  let layoutName;

  // Make an affordance for _self, which was conistently implemented in Amphora pre-v7.
  initialState._self = meta._ref;
  initialState._components = componentList;

  if (meta._layoutRef) {
    layoutName = clayUtils.getLayoutName(meta._layoutRef);
    initialState._layoutData = { name: layoutName, uri: meta._layoutRef };

    if (meta.locals.edit) {
      initialState._layoutData.schema = getSchemaPath(getLayoutPath(layoutName));
    }
  }

  // grab the component variations and make available via the state
  // note: if styleguide isn't set, this gets variations from the '_default' styleguide
  initialState._componentVariations = styleguide.getVariations(_.get(meta, 'locals.site.styleguide', '_default'));

  if (meta.locals.edit) {
    initialState._envVars = ENV_VARS;
    initialState._componentSchemas = _.map(componentList, (name) => {
      return { name, schema: getSchemaPath(getComponentPath(name)) };
    });
  }

  return  _.assign(initialState, _.pick(meta, ['locals', '_layoutRef']));
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
    .then(applyPostRenderHooks(state.locals, res))
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
module.exports.makeState = makeState;
module.exports.setFsFns = ({getIndicesStub, getSchemaPathStub, getComponentPathStub }) => {
  getIndices = getIndicesStub;
  getSchemaPath = getSchemaPathStub;
  getComponentPath = getComponentPathStub;
};
