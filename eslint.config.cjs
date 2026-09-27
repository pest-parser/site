const tsEslintPlugin = require("@typescript-eslint/eslint-plugin");

const browserGlobals = {
  CodeMirror: "readonly",
  MessageEvent: "readonly",
  URL: "readonly",
  Worker: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  document: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  postMessage: "readonly",
  self: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
  window: "readonly",
  HTMLCollection: "readonly",
  HTMLSpanElement: "readonly",
};

module.exports = [
  {
    ignores: [
      "target",
      "pkg",
      "dist",
      ".task",
      ".parcel-cache",
      "book",
      "eslint.config.cjs",
      "pnpm-lock.yaml",
      "static/codemirror",
    ],
  },
  ...tsEslintPlugin.configs["flat/recommended"],
  {
    files: ["static/scripts/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
    },
  },
];
