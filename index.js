'use strict';

const setup = require('./lib/setup');

module.exports.render = require('./lib/render');
module.exports.addRootPath = setup.addRootPath;
module.exports.addHelpers = setup.addHelpers;
module.exports.addPlugins = setup.addPlugins;
module.exports.configureRender = setup.configureRender;
