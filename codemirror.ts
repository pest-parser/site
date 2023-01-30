import { EditorView, minimalSetup } from "codemirror";
import { linter, Diagnostic } from "@codemirror/lint";
import { closeBrackets } from "@codemirror/autocomplete";
import { StreamLanguage } from "@codemirror/language";
import { tags } from "@lezer/highlight"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
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

const pestLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.match(/"/)) {
      stream.eatWhile(/[^"]/);
      stream.eat(/"/);
      return "string";
    } else if (stream.match(/'(?:[^'\\]|\\(?:[nrt0'"]|x[\da-fA-F]{2}|u\{[\da-fA-F]{6}\}))'/)) {
      return "string";
    } else if (stream.match(/\/\/.*/)) {
      return "comment";
    } else if (stream.match(/\d+/)) {
      return "number";
    } else if (stream.match(/[~|*+?&!]|(\.\.)/)) {
      return "operator";
    } else if (stream.match(/[a-zA-Z_]\w*/)) {
      return "variable";
    } else if (stream.match(/=/)) {
      stream.eatWhile(/[_@!$]/);
      return "operator-2";
    } else {
      stream.next();
      return null;
    }
  },
});
let current_data = null;

const pestLinter = linter((view) => {
  if (lint) {
    let errors = lint(view.state.doc.toString());
    let diagnostics: Diagnostic[] = [];

    for (let i = 0; i < errors.length; i++) {
      let [fromLine, fromCh] = errors[i].get("from").slice(1, -1).split(", ").map(x => parseInt(x));
      let [toLine, toCh] = errors[i].get("to").slice(1, -1).split(", ").map(x => parseInt(x));

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

const pestHighlightStyle = HighlightStyle.define([
  {tag: tags.string, color: "#7ef69d"},
])

let grammar = document.querySelector(".editor-grammar")!;
const editor = new EditorView({
  extensions: [minimalSetup, pestLinter, closeBrackets(), pestLanguage, syntaxHighlighting(pestHighlightStyle)],
  parent: grammar,
});

(window as any).set_current_data = function() {
  if (current_data) {
    const select = document.querySelector<HTMLSelectElement>("editor-input-select")!;

    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === current_data["rule"]) {
        select.selectedIndex = i;
        const event = new Event('change');
        select.dispatchEvent(event);
        break;
      }
    }

    const input = document.querySelector<HTMLInputElement>(".editor-input-text")!;
    input.value = current_data["input"];

    current_data = null;
  }
}

// function wideMode() {
//   modeBtn.onclick = restore;
//   modeBtn.innerText = "Normal Mode";
//   inputDom.classList.add("wide-input");
//   editorDom.classList.add("wide-editor");
//   gridDom.classList.add("flex-editor");
//   const upperHeight = document.querySelector('#modeBtn').scrollHeight + 30;
//   gridDom.setAttribute('style', `height: ${windowHeight - upperHeight}px`);
//   editor.setSize(null, outputDom.clientHeight - 20);
//   makeResizable(true);
//   window.scrollTo(0,document.body.scrollHeight);
// }

// function restore() {
//   modeBtn.onclick = wideMode;
//   modeBtn.innerText = "Wide Mode";
//   inputDom.classList.remove("wide-input");
//   editorDom.classList.remove("wide-editor");
//   gridDom.classList.remove("flex-editor");
//   outputDom.setAttribute("rows", 7);
//   editor.setSize(null, outputDom.clientHeight);
//   makeResizable(false);
// }

init()