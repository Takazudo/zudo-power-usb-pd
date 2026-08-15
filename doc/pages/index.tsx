// D6 (#180, after zudolab/zudo-doc#2653 Decision 4): the home route is a
// 1-line re-export of the package-owned STATIC index route. `deriveRoutes`
// never injects `/`, so deleting this file removes the home page entirely.
// A dynamic route (see pages/docs/[[...slug]].tsx) cannot use this form
// because `paths()` static-AST-extraction requires source, not compiled
// `dist/` JS.
export { default } from "@takazudo/zudo-doc/routes/index";
