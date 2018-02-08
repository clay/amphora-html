'use strict';

const setup = require('./lib/setup'),
  render = require('./lib/render');

module.exports.render = render;
module.exports.addResolveMedia = setup.addResolveMedia;
module.exports.addRootPath = setup.addRootPath;
module.exports.addHelpers = setup.addHelpers;
module.exports.addPlugins = setup.addPlugins;
module.exports.configureRender = setup.configureRender;
