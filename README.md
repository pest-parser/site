# Source code for `https://pest.rs`

This repo contains the source code for https://pest.rs

You can build it with [wasm-pack](https://github.com/rustwasm/wasm-pack):

```sh
# Build the JS and WASM from Pest
wasm-pack build --target web
```

You can then install the packages for parcel:

```sh
pnpm install
```

Then run the dev server:
```sh
pnpm run start
```
