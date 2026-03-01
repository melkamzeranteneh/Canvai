type ToastHandle = { close?: () => void };
// Simple wrapper around the officially installed `sileo` package.
// After running `npm install sileo` the library exposes sileo methods
// directly; reexporting it here keeps the rest of the codebase unaffected.

import { sileo } from 'sileo';

export const toast = sileo;
export default sileo;
