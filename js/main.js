import('./game.js');
// Choose the correct base path for loading the ES module depending on
// where the page is hosted. htmlpreview.github.io serves files from
// raw.githubusercontent.com which delivers JavaScript as text/plain,
// causing module loading to fail. To work around this, load the module
// from the jsDelivr CDN when running under htmlpreview; otherwise use
// a relative path for local usage.
const baseUrl = (location.hostname === 'htmlpreview.github.io')
  ? 'https://cdn.jsdelivr.net/gh/MaWay2000/wzmap/'
  : './';

import(`${baseUrl}js/game.js`);