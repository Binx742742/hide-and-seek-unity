import { register } from "node:module";

register(new URL("./yard-loader.mjs", import.meta.url).href, {
  parentURL: import.meta.url
});
