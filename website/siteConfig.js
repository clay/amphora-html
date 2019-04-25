/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// See https://docusaurus.io/docs/site-config for all the possible
// site configuration options.

const repoUrl = 'https://github.com/clay/amphora-html';
projectName = process.env.PROJECT_NAME || 'amphora-html';

const siteConfig = {
  title: 'Amphora html', // Title for your website.
  tagline: 'HTML renderer for component data structures',
  url: 'https://clay.github.io', // Your website URL
  baseUrl: '/amphora-html/', // Base URL for your project */

  // Used for publishing and more
  projectName,
  organizationName: 'clayplatform',

  // For no header links in the top nav bar -> headerLinks: [],
  headerLinks: [],

  /* path to images for header/footer */
  headerIcon: 'img/logo.svg',
  footerIcon: '',
  favicon: '',

  /* Colors for website */
  colors: {
    primaryColor: '#607d8b',
    secondaryColor: '#1976d2',
  },

  // This copyright info is used in /core/Footer.js and blog RSS/Atom feeds.
  copyright: `Copyright © ${new Date().getFullYear()} New York Media`,

  highlight: {
    // Highlight.js theme to use for syntax highlighting in code blocks.
    theme: 'default',
  },

  // Add custom scripts here that would be placed in <script> tags.
  scripts: ['https://buttons.github.io/buttons.js'],

  docsSideNavCollapsible: true,
  // On page navigation for the current documentation page.
  onPageNav: 'separate',
  // No .html extensions for paths.
  cleanUrl: true,

  // Open Graph and Twitter card images.
  ogImage: '#99D3DF',
  twitterImage: '#99D3DF',
  algolia: {
    apiKey: process.env.ALGOLIA_API_KEY,
    indexName: 'TBD',
    algoliaOptions: {} // Optional, if provided by Algolia
  }

  // Show documentation's last contributor's name.
  // enableUpdateBy: true,

  // Show documentation's last update time.
  // enableUpdateTime: true,
};

module.exports = siteConfig;
