import { EditorView, minimalSetup } from "codemirror";
import { linter, Diagnostic } from "@codemirror/lint";
import init, { lint } from "./pkg/pest_site.js";

const editorDom = document.querySelector<HTMLDivElement>(".editor")!;
const gridDom = document.querySelector<HTMLDivElement>(".editor-grid")!;
const inputDom = document.querySelector<HTMLDivElement>(".editor-input")!;
const outputDom =
  document.querySelector<HTMLTextAreaElement>(".editor-output")!;
const modeBtn = document.querySelector<HTMLButtonElement>("#modeBtn")!;

// let windowHeight = window.innerHeight;
// let current_data = null;
// CodeMirror.defineSimpleMode("pest", {
//   start: [
//     { regex: /"/, token: "string", next: "string" },
//     {
//       regex: /'(?:[^'\\]|\\(?:[nrt0'"]|x[\da-fA-F]{2}|u\{[\da-fA-F]{6}\}))'/,
//       token: "string",
//     },
//     { regex: /\/\/.*/, token: "comment" },
//     { regex: /\d+/, token: "number" },
//     { regex: /[~|*+?&!]|(\.\.)/, token: "operator" },
//     { regex: /[a-zA-Z_]\w*/, token: "variable" },
//     { regex: /=/, next: "mod" },
//   ],
//   mod: [
//     { regex: /\{/, next: "start" },
//     { regex: /[_@!$]/, token: "operator-2" },
//   ],
//   string: [
//     { regex: /"/, token: "string", next: "start" },
//     { regex: /(?:[^\\"]|\\(?:.|$))*/, token: "string" },
//   ],
//   meta: {
//     dontIndentStates: ["comment"],
//     lineComment: "//",
//   },
// });


let current_data = null;

const pestLinter = linter((view) => {
  if (lint) {
    let errors = lint(view.state.doc.toString());
    let diagnostics: Diagnostic[] = [];

    for (let i = 0; i < errors.length; i++) {
      let [fromLine, fromCh] = errors[i].get("from").slice(1, -1).split(", ").map(x => parseInt(x));
      let [toLine, toCh] = errors[i].get("to").slice(1, -1).split(", ").map(x => parseInt(x));

      if (fromLine === toLine && fromCh === toCh) {
        toCh += 1;
      }

      if (fromLine === toLine && fromCh === toCh) {
        fromCh -= 1;
      }

      diagnostics.push({
        severity: "error",
        message: errors[i].get("message"),
        from: view.state.doc.line(fromLine + 1).from + fromCh,
        to: view.state.doc.line(toLine + 1).from + toCh,
      });
    }

    return diagnostics;
  } else {
    return [];
  }
});

let grammar = document.querySelector(".editor-grammar")!;
const editor = new EditorView({
  extensions: [minimalSetup, pestLinter],
  parent: grammar,
});

(window as any).set_current_data = function() {
  if (current_data) {
    var select = document.querySelector<HTMLSelectElement>("editor-input-select")!;

    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === current_data["rule"]) {
        select.selectedIndex = i;
        var event = new Event('change');
        select.dispatchEvent(event);
        break;
      }
    }

    const input = document.querySelector<HTMLInputElement>(".editor-input-text")!;
    input.value = current_data["input"];

    current_data = null;
  }
}

init()