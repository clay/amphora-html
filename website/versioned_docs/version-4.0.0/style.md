---
id: version-4.0.0-style
title: Styleguides
sidebar_label: Styleguides
original_id: style
---

---


On `amphora-html` using the `data` and `meta` object that are instances of the components and site respectively. This site will expose the component variations on the state, then it will set these variations into a structure. Finally, [Kiln](https://docs.clayplatform.com/clay-kiln) will need then render the `HTML`. 

---

## Get component variations

Using the site name, `amphora-html` builds the specific style path that we need to have all the required stylesheets: 
`styleguides/siteName/components` 

If the name of the site is not available, the `siteName` property will be replaced for `_default` and the list of the variation of the components will be returned.

If a component variation exists, we will receive a combination of the name of the component and the name of the variation separated by an underscore like this example: `componentName_variationName`

Furthermore, if the component variation is no set we will have the name of the component as a default style.

For more information on how to get the variations, you can check the [styleguide.js](https://github.com/clay/amphora-html/blob/master/lib/styleguide.js) file on the `amphora-html` repository.

---

## Set component default variations

After getting the list of the variations exposed on the state (or set on the data object that we receive), we can go through each component defining its default styleguide. The following are the conditions that we have to define in order to determine which is the variation that we will add:

- The component has a variation set, but it doesn't exist in the site's styleguide or the default styleguide; render the component with the default variation.

- The component has no variation set; render the component with the default variation.

- Finally, if the other conditions don't match to the current component, it means that we have a component variation defined and we are using it.

For more information on how to set the variations, you can check the [styleguide.js](https://github.com/clay/amphora-html/blob/master/lib/styleguide.js) file on the `amphora-html` repository.

---

## Compose data

After we got and set the variations on the components, we are going to compose the data into the structure that [Kiln](https://docs.clayplatform.com/clay-kiln/) needs; we got to this step after we finished getting all the variations of the components that are in the `data` object that we mentioned before and use it on [Kiln](https://docs.clayplatform.com/clay-kiln/).

For more information on how the kiln structure is formed and send; you can check the [render.js](https://github.com/clay/amphora-html/blob/master/lib/render.js) file on the `amphora-html` repository.
