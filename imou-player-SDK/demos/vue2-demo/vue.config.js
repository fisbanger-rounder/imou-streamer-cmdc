// vue.config.js
const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  devServer: {
    port: "8083",
    https: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
