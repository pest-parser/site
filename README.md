# Pest Site

[![Build status](https://github.com/pest-parser/site/actions/workflows/publish.yml/badge.svg)](https://github.com/pest-parser/site/actions/workflows/publish.yml)

The source code for the [pest.rs](https://pest.rs).

## Development Guide

To build it, you need:

- [Task](https://taskfile.dev)
- [wasm-pack](https://rustwasm.github.io/wasm-pack)
- [mdBook](https://rust-lang.github.io/mdBook)
- Node.js & Yarn

### Start Web Development Server

We use [Vite](https://vitejs.dev) for build frontend.

Run `yarn install` to install the dependencies.

```bash
$ yarn install
```

And then use `yarn dev` to start Vite dev server.

> `yarn dev` it also will compile the WASM.

```bash
$ yarn dev
```
