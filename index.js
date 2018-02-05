'use strict';

const setup = require('./lib/setup'),
  render = require('./lib/render'),
  log = require('./lib/log').setup({ file: __filename });


/**
 * Formatter for rendering time success messages
 *
 * @param  {Object} hrStart
 * @param  {String} msg
 * @param  {String} route
 * @return {Function}
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

module.exports.render = function (state, res) {
  const hrStart = process.hrtime();

  return render(state)
    .then(resp => {
      res.type('text/html').send(resp.output);

      return true; // Return true for logging statement
    })
    .then(logTime(hrStart, 'rendered route', state.locals.url))
    .catch(err => log('error', err.message, { stack: err.stack }));
};

module.exports.addResolveMedia = setup.addResolveMedia;
module.exports.addRootPath = setup.addRootPath;
module.exports.addHelpers = setup.addHelpers;
module.exports.addPlugins = setup.addPlugins;
module.exports.configureRender = setup.configureRender;
