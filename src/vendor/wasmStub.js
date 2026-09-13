// Stub for satellite.js internal `wasm-build/*` imports (#wasm-single-thread,
// #wasm-multi-thread). Our app only uses the pure-JS SGP4 path
// (propagate/twoline2satrec/...), so these async module factories are never
// invoked; aliasing them keeps Vite from bundling the Emscripten worker builds.
export default function createWasmModuleStub() {
  return Promise.resolve({});
}