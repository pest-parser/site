import init, { lint, parse } from "../../pkg/pest_site.js";

let loaded = false;
let lastGrammar: string | null = null;

let pendingMessage: MessageEvent | null = null;

init().then(() => {
  loaded = true;
  if (pendingMessage) {
    const e = pendingMessage;
    pendingMessage = null;
    processMessage(e);
  }
});

function processMessage(e: MessageEvent) {
  const { id, grammar, rule, input } = e.data;

  try {
    // This has the side effect of compiling the grammar for the wasm worker.
    if (grammar !== lastGrammar) {
      lint(grammar);
      lastGrammar = grammar;
    }

    const result = parse(rule, input);
    postMessage({ id, type: "success", result });
  } catch (err) {
    postMessage({ id, type: "error", error: err.toString() });
  }
}

onmessage = (e) => {
  if (!loaded) {
    pendingMessage = e;
    return;
  }
  processMessage(e);
};

