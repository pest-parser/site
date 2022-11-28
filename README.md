# Source code for `https://pest.rs`

This repo contains the source code for https://pest.rs

You can build it with [wasm-pack](https://github.com/rustwasm/wasm-pack):

```sh
# Create an empty directory to hold the output (and remove any old files)
mkdir -p www
rm -rf www/*

# Build and copy in the JS and WASM from Pest
wasm-pack build --target web
cp pkg/*.js www/
cp pkg/*.wasm www/

# Copy in authored files
cp -R static/* www/
```

You can then test the site by serving the `www` directory with your dev server
of choice. For example:

```sh
python3 -m http.server 3030 --directory www
```
