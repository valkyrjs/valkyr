// Conditional ESM module loading (Node.js and browser)
if (!globalThis.URLPattern) {
  await import("urlpattern-polyfill");
}

export type { Action } from "./libraries/action.ts";
export * from "./libraries/responses.ts";
export { Route } from "./libraries/route.ts";
export { type InferRouteContext, Router } from "./libraries/router.ts";
export { createBrowserHistory, createHashHistory, createMemoryHistory, type Location } from "history";
