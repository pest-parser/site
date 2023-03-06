# pest.rs

This repo contains the source code for https://pest.rs

## Development Guide

This project uses the following tools:

- [Task](https://taskfile.dev/)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- [mdBook](https://rust-lang.github.io/mdBook/)
- [pnpm](https://pnpm.io)

The task file automatically installs dependenices, builds the book, and builds the internal pest-vm web-binding crate.

Start Parcel development server:

```bash
task dev
```

Then visit http://localhost:1234

If you want to build the static site, run the main build task:

```bash
task
```
