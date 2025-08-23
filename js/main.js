// Dynamically import the game script using the resolved path.
// Previously this file expected a `baseUrl` global which was not
// defined when viewing the project through htmlpreview.github.io,
// leading to a "baseUrl is not defined" ReferenceError. The direct
// import below works in both the htmlpreview environment and when
// the project is served locally.
import(gameModulePath);