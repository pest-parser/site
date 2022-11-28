# Source code for `https://pest.rs`

This repo contains the source code for https://pest.rs

To build it, you need [task](https://taskfile.dev/), [wasm-pack](https://rustwasm.github.io/wasm-pack/), and [mdbook](https://rust-lang.github.io/mdBook/):

```sh
# run the taskfile (this may be go-task)
task
```

You can then test the site by serving the built `www` directory with your dev server
of choice. For example:

```sh
python3 -m http.server 3030 --directory www
```

You can then test the site by serving the `www` directory with your dev server
of choice. For example:

```sh
python3 -m http.server 3030 --directory www
```
