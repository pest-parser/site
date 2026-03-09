import init, { lint, parse } from "../../pkg/pest_site.js";

let loaded = false;
let lastGrammar: string | null = null;

init().then(() => {
    loaded = true;
});

onmessage = (e) => {
    if (!loaded) return;

    const { id, grammar, rule, input } = e.data;

    try {
        // This has the side effect of compiling the grammar for the wasm worker.
        if (grammar !== lastGrammar) {
            lint(grammar);
            lastGrammar = grammar;
        }

        const result = parse(rule, input);
        postMessage({ id, type: "success", result });
    } catch (err: any) {
        postMessage({ id, type: "error", error: err.toString() });
    }
};