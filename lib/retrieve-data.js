'use strict';

const fetch = require('node-fetch'),
  CORE_ADDRESS = '127.0.0.1',

/**
 * Retrieve the data for a URI from
 * an Amphora Core container.
 *
 * @param  {String} uri
 * @return {Promise}
 */
function getUriData(uri) {
  return fetch(CORE_ADDRESS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uri
    })
  }).then(res => res.json());
}

module.exports.getUriData = getUriData;
