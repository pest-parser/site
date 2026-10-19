import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { updateWorkflow } from "./update-tools.mjs";

const source = await readFile(
  new URL("../workflows/publish.yml", import.meta.url),
  "utf8",
);
const archive = "test archive contents";
const digest = createHash("sha256").update(archive).digest("hex");
const names = [
  "mdbook-v99.0.0-x86_64-unknown-linux-gnu.tar.gz",
  "wasm-pack-v99.0.0-x86_64-unknown-linux-musl.tar.gz",
  "task_linux_amd64.tar.gz",
];
const repos = ["rust-lang/mdBook", "wasm-bindgen/wasm-pack", "go-task/task"];
const keys = ["MDBOOK", "WASM_PACK", "TASK"];

function fixture() {
  const releases = repos.map((repo, i) => ({
    tag_name: "v99.0.0",
    draft: false,
    prerelease: false,
    assets: [
      { name: names[i], digest: `sha256:${digest}` },
      ...(i === 2 ? [{ name: "task_checksums.txt" }] : []),
    ],
  }));
  const requests = [];
  let manifest = `${digest}  task_linux_amd64.tar.gz\n`;
  const request = async (url, options) => {
    requests.push(url);
    const index = repos.findIndex(
      (repo) => url === `https://api.github.com/repos/${repo}/releases/latest`,
    );
    if (index !== -1) {
      assert.equal(
        options.headers.Authorization,
        ["Bearer", "test-token"].join(" "),
      );
      return Response.json(releases[index]);
    }
    assert.equal(options.headers.Authorization, undefined);
    if (
      url ===
      "https://github.com/go-task/task/releases/download/v99.0.0/task_checksums.txt"
    ) {
      return new Response(manifest);
    }
    assert.ok(
      repos.some(
        (repo, i) =>
          url ===
          `https://github.com/${repo}/releases/download/v99.0.0/${names[i]}`,
      ),
      `Unexpected URL: ${url}`,
    );
    return new Response(archive);
  };
  return {
    releases,
    requests,
    request,
    setManifest: (value) => (manifest = value),
    run: (input = source) => updateWorkflow(input, request, "test-token"),
  };
}

test("updates all six pins, preserves other content, and includes release links", async () => {
  const result = await fixture().run();
  let expected = source;
  for (const [i, key] of keys.entries()) {
    expected = expected
      .replace(new RegExp(`(${key}_VERSION: )\\S+`), "$1v99.0.0")
      .replace(new RegExp(`(${key}_SHA256: )\\S+`), `$1${digest}`);
    assert.ok(
      result.body.includes(
        `https://github.com/${repos[i]}/releases/tag/v99.0.0`,
      ),
    );
  }
  assert.equal(result.source, expected);
});

test("equal or older releases produce no changes or downloads", async () => {
  const f = fixture();
  f.releases.forEach((release, i) => {
    release.tag_name = source.match(
      new RegExp(`${keys[i]}_VERSION: (\\S+)`),
    )[1];
  });
  assert.equal((await f.run()).source, source);
  assert.equal(f.requests.length, 3);
  f.requests.length = 0;
  f.releases.forEach((release) => (release.tag_name = "v0.0.0"));
  assert.equal((await f.run()).source, source);
  assert.equal(f.requests.length, 3);
});

test("version comparison is numeric, not lexicographic", async () => {
  const f = fixture();
  const input = source.replace(
    /MDBOOK_VERSION: \S+/,
    "MDBOOK_VERSION: v100.0.0",
  );
  assert.match((await f.run(input)).source, /MDBOOK_VERSION: v100\.0\.0/);
  assert.equal(
    f.requests.some((url) => url.endsWith(names[0])),
    false,
  );
});

test("only changed tools are updated", async () => {
  const f = fixture();
  f.releases[0].tag_name = "v0.0.0";
  f.releases[2].tag_name = "v0.0.0";
  const result = await f.run();
  assert.equal(
    result.source,
    source
      .replace(/WASM_PACK_VERSION: \S+/, "WASM_PACK_VERSION: v99.0.0")
      .replace(/WASM_PACK_SHA256: \S+/, `WASM_PACK_SHA256: ${digest}`),
  );
});

for (const flag of ["draft", "prerelease"]) {
  test(`rejects ${flag} releases`, async () => {
    const f = fixture();
    f.releases[0][flag] = true;
    await assert.rejects(f.run(), /Expected a stable release/);
  });
}

for (const tag of ["v1.2.3-rc.1", "v1.2.3\ninjected", "../asset", "v01.2.3"]) {
  test(`rejects unsafe or unsupported tag ${JSON.stringify(tag)}`, async () => {
    const f = fixture();
    f.releases[0].tag_name = tag;
    await assert.rejects(f.run(), /Unsupported stable version/);
    assert.equal(f.requests.length, 1);
  });
}

test("missing archive or Task checksum asset aborts the entire update", async () => {
  for (const index of [0, 1, 2]) {
    const f = fixture();
    f.releases[index].assets = [];
    await assert.rejects(f.run(), /Missing release asset/);
  }
  const f = fixture();
  f.releases[2].assets.pop();
  await assert.rejects(f.run(), /Missing release asset: task_checksums.txt/);
});

test("missing, malformed, or mismatching asset digests fail closed", async () => {
  for (const value of [
    null,
    "sha512:unsupported",
    `sha256:${"0".repeat(64)}`,
  ]) {
    const f = fixture();
    f.releases[0].assets[0].digest = value;
    await assert.rejects(f.run(), /digest/i);
  }
});

test("Task can use its publisher checksum without a GitHub asset digest", async () => {
  const f = fixture();
  f.releases[2].assets[0].digest = null;
  assert.match((await f.run()).source, /TASK_VERSION: v99\.0\.0/);
});

test("Task manifest must contain exactly one matching valid checksum", async () => {
  for (const manifest of [
    `${"0".repeat(64)}  task_linux_amd64.tar.gz\n`,
    `${digest}  task_linux_arm64.tar.gz\n`,
    "invalid checksum manifest",
    `${digest}  task_linux_amd64.tar.gz\n`.repeat(2),
  ]) {
    const f = fixture();
    f.setManifest(manifest);
    await assert.rejects(f.run(), /Upstream checksum mismatch/);
  }
});

test("HTTP errors and download failures abort updates", async () => {
  await assert.rejects(
    updateWorkflow(source, async () => new Response("", { status: 403 })),
    /Request failed \(403\)/,
  );
  const f = fixture();
  await assert.rejects(
    updateWorkflow(
      source,
      (url, options) =>
        url.startsWith("https://api.github.com/")
          ? f.request(url, options)
          : Promise.reject(new Error("Download failed")),
      "test-token",
    ),
    /Download failed/,
  );
});

test("missing, duplicated, or invalid pins fail closed", async () => {
  for (const input of [
    source.replace(/^  MDBOOK_VERSION: .*\n/m, ""),
    `${source}\n  MDBOOK_VERSION: v1.0.0\n`,
    source.replace(/MDBOOK_SHA256: \S+/, "MDBOOK_SHA256: invalid"),
  ]) {
    await assert.rejects(fixture().run(input), /setting|Invalid/);
  }
});
