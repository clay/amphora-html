---
id: intro
title: Amphora HTML
sidebar_label: Amphora HTML
---

---
The HTML renderer for Clay components that use [Handlebars](http://handlebarsjs.com/) templates.

---
## Why?

HTML rendering was controlled entirely by [Amphora](https://github.com/nymag/amphora) in __v2.x__, which meant that Amphora was responsible for a lot of heavy lifting. Furthermore, rendering was handled by a module called [Multiplex Templates](https://www.npmjs.com/package/multiplex-templates) which did some :crystal_ball: dark magic :sparkles: to synchronously render component templates. This required some affordances from Amphora which added to the weight of the middleware. By separating renderers out into separate modules which can be plugged into Amphora __>v2.x__ we can create renderers for specific requirements (XML, Amp, etc.) _and_ the rendering process can be moved to separate machines to create more maintainable systems.

---

## Installation

---

`$ npm install --save amphora-html`
