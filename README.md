# pest.rs

This repo contains the source code for https://pest.rs

## Development Guide

This project uses the following tools:

- [Task](https://taskfile.dev/)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- [mdBook](https://rust-lang.github.io/mdBook/)
- [pnpm](https://pnpm.io)

The task file automatically installs dependencies, builds the book, and builds the internal pest-vm web-binding crate.

Start Parcel development server:

```bash
task dev
```

Then visit http://localhost:1234

If you want to build the static site, run the main build task:

```bash
task
```

Then go visit the `/dist` folder.

## Automated CI tool updates

The `Update CI tools` workflow checks the latest stable mdBook, wasm-pack, and
Task releases every Monday at 08:23 UTC. It can also be run from the Actions tab
using **Run workflow** on the default branch.

When a newer version is available, it downloads the same Linux archive used by
the publishing workflow, calculates SHA-256, and verifies the GitHub release
asset digest. Task's `task_checksums.txt` is also required and verified (and can
provide verification if Task's asset digest is unavailable). Missing assets,
missing verification data, checksum mismatches, or request failures stop the run
without proposing partial updates. Downloaded tools are never executed.

Updates to the version/checksum pairs in `.github/workflows/publish.yml` are
proposed together on `automation/update-ci-tools`. Subsequent runs refresh the
same PR; runs without newer versions make no changes. Review release links and
CI results before merging; the workflow does not auto-merge.

### GitHub App setup

1. Create a GitHub App with repository permissions **Contents: Read and write**,
   **Pull requests: Read and write**, and **Workflows: Read and write**. No webhook
   is needed. Install it with access only to this repository.
2. Add its client ID as the Actions repository variable
   `TOOL_UPDATES_APP_CLIENT_ID`.
3. Generate a private key for the app and store it as the Actions repository
   secret `TOOL_UPDATES_APP_PRIVATE_KEY`.

The workflow creates a short-lived, repository-scoped installation token only
when updates are ready. App credentials are not used to download releases.
The App token allows workflow-file edits and triggers the normal PR checks,
unlike the default `GITHUB_TOKEN`. Repository rules must allow the App to push
the update branch and open PRs; do not grant it a default-branch protection bypass.
The scheduled workflow must be merged into the default branch to run.

Run the updater's offline regression tests with:

```bash
node --test .github/scripts/update-tools.test.mjs
```
