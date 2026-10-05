// The registry is plain JSON; index.ts types it. This lets the package compile its JSON
// imports without turning on resolveJsonModule for the whole package.
declare module '*.json' {
  const value: unknown;
  export default value;
}
