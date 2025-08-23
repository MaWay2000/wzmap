diff --git a/js/main.js b/js/main.js
index d25b9ed281c9bf08a6efc4c69da5066153b2380b..7616daacceaeb6ea6cefa2a2cd05e0db44087d7a 100644
--- a/js/main.js
+++ b/js/main.js
@@ -1,18 +1,15 @@
-// Choose the correct module path depending on where the page is hosted.
-// When viewed via htmlpreview.github.io, raw.githubusercontent.com serves
-// scripts with a `text/plain` MIME type causing module loading to fail.
-// In that case load the module from the jsDelivr CDN; otherwise use a
-// relative path for local usage.
-const gameModulePath = (location.hostname === 'htmlpreview.github.io')
-  ? 'https://cdn.jsdelivr.net/gh/MaWay2000/wzmap/js/game.js'
-  : './js/game.js';
-
-import(`${baseUrl}js/game.js`);
-import(gameModulePath);
-// Dynamically import the game script using the resolved path.
-// Previously this file expected a `baseUrl` global which was not
-// defined when viewing the project through htmlpreview.github.io,
-// leading to a "baseUrl is not defined" ReferenceError. The direct
-// import below works in both the htmlpreview environment and when
-// the project is served locally.
-import(gameModulePath);
+// Load the main game module via a `<script type="module">` element.
+// htmlpreview.github.io serves raw files with a `text/plain` MIME type, which
+// breaks ES module loading. When running under htmlpreview we therefore use a
+// jsDelivr URL that provides the correct headers; otherwise the script is loaded
+// relative to the page for local use.
+(() => {
+  const gameModulePath = (location.hostname === 'htmlpreview.github.io')
+    ? 'https://cdn.jsdelivr.net/gh/MaWay2000/wzmap@main/js/game.js'
+    : './js/game.js';
+  const script = document.createElement('script');
+  script.type = 'module';
+  script.src = gameModulePath;
+  script.onerror = err => console.error('Failed to load game module:', err);
+  document.head.appendChild(script);
+})();
