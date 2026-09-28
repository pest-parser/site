import { createHash } from "node:crypto";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const tools = [
  {
    key: "MDBOOK",
    repo: "rust-lang/mdBook",
    archive: (tag) => `mdbook-${tag}-x86_64-unknown-linux-gnu.tar.gz`,
  },
  {
    key: "WASM_PACK",
    repo: "wasm-bindgen/wasm-pack",
    archive: (tag) => `wasm-pack-${tag}-x86_64-unknown-linux-musl.tar.gz`,
  },
  {
    key: "TASK",
    repo: "go-task/task",
    archive: () => "task_linux_amd64.tar.gz",
    checksums: "task_checksums.txt",
  },
];

function version(tag) {
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag)) {
    throw new Error(`Unsupported stable version: ${tag}`);
  }
  return tag.slice(1).split(".").map(BigInt);
}

function newer(candidate, current) {
  const left = version(candidate);
  const right = version(current);
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return left[i] > right[i];
  }
  return false;
}

function setting(source, key) {
  const matches = [...source.matchAll(new RegExp(`^  ${key}: (\\S+)$`, "gm"))];
  if (matches.length !== 1) throw new Error(`Expected one ${key} setting`);
  return matches[0][1];
}

export async function updateWorkflow(source, request = fetch, token = "") {
  async function get(url, api = false) {
    const response = await request(url, {
      headers: api
        ? {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(token ? { Authorization: ["Bearer", token].join(" ") } : {}),
          }
        : {},
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}): ${url}`);
    }
    return response;
  }

  const updates = [];
  let updated = source;
  for (const tool of tools) {
    const current = setting(source, `${tool.key}_VERSION`);
    const oldHash = setting(source, `${tool.key}_SHA256`);
    version(current);
    if (!/^[a-f0-9]{64}$/.test(oldHash)) {
      throw new Error(`Invalid ${tool.key}_SHA256`);
    }
    const release = await (
      await get(
        `https://api.github.com/repos/${tool.repo}/releases/latest`,
        true,
      )
    ).json();
    if (release.draft || release.prerelease) {
      throw new Error(`Expected a stable release for ${tool.repo}`);
    }
    const tag = release.tag_name;
    if (!newer(tag, current)) continue;

    const archive = tool.archive(tag);
    const asset = release.assets.find((entry) => entry.name === archive);
    if (!asset) throw new Error(`Missing release asset: ${archive}`);
    const downloadBase = `https://github.com/${tool.repo}/releases/download/${tag}`;
    const response = await get(`${downloadBase}/${archive}`);
    const hash = createHash("sha256");
    for await (const chunk of response.body) hash.update(chunk);
    const digest = hash.digest("hex");

    // Never trust a freshly calculated hash without an upstream checksum.
    if (asset.digest && asset.digest !== `sha256:${digest}`) {
      throw new Error(`Release digest mismatch: ${archive}`);
    }
    if (tool.checksums) {
      if (!release.assets.some((entry) => entry.name === tool.checksums)) {
        throw new Error(`Missing release asset: ${tool.checksums}`);
      }
      const manifest = await (
        await get(`${downloadBase}/${tool.checksums}`)
      ).text();
      const entries = manifest
        .split(/\r?\n/)
        .map((line) => line.match(/^([a-fA-F0-9]{64})\s+\*?(\S+)$/))
        .filter((entry) => entry && entry[2] === archive);
      if (entries.length !== 1 || entries[0][1].toLowerCase() !== digest) {
        throw new Error(`Upstream checksum mismatch: ${archive}`);
      }
    } else if (!asset.digest) {
      throw new Error(`Missing upstream SHA-256 digest: ${archive}`);
    }

    updated = updated
      .replace(
        new RegExp(`^  ${tool.key}_VERSION: \\S+$`, "m"),
        `  ${tool.key}_VERSION: ${tag}`,
      )
      .replace(
        new RegExp(`^  ${tool.key}_SHA256: \\S+$`, "m"),
        `  ${tool.key}_SHA256: ${digest}`,
      );
    updates.push(
      `- ${tool.key}: ${current} → [${tag}](https://github.com/${tool.repo}/releases/tag/${tag})`,
    );
  }
  return {
    source: updated,
    body: [
      "Updates the pinned CI tools and their SHA-256 checksums.",
      "",
      ...updates,
      "",
      "Archives were checked against GitHub release asset digests and, for Task, the upstream checksum manifest.",
      "Please review the releases and wait for CI before merging.",
      "",
    ].join("\n"),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const workflow = fileURLToPath(
    new URL("../workflows/publish.yml", import.meta.url),
  );
  const source = await readFile(workflow, "utf8");
  const result = await updateWorkflow(source, fetch, process.env.GH_TOKEN);
  const changed = result.source !== source;
  if (changed) {
    await writeFile(
      join(process.env.RUNNER_TEMP, "ci-tool-updates.txt"),
      result.body,
    );
    // Only write after every proposed update has passed verification.
    await writeFile(workflow, result.source);
  }
  await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}
