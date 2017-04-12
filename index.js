'use strict';

const setup = require('./lib/setup');

module.exports.render = require('./lib/render');
module.exports.addEngines = setup.addEngines;
module.exports.addRootPath = setup.addRootPath;
