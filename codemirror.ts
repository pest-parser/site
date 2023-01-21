import {EditorView, minimalSetup} from "codemirror"

const editorDom = document.querySelector<HTMLDivElement>(".editor")!;
const gridDom = document.querySelector<HTMLDivElement>(".editor-grid")!;
const inputDom = document.querySelector<HTMLDivElement>(".editor-input")!;
const outputDom = document.querySelector<HTMLTextAreaElement>(".editor-output")!;
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

// CodeMirror.registerHelper("lint", "pest", function (text) {
//   if (window.lint) {
//     let doc = CodeMirror.Doc(text);
//     let errors = window.lint(text);
//     let mapped = [];

//     for (let i = 0; i < errors.length; i++) {
//       let from = doc.clipPos(eval("CodeMirror.Pos" + errors[i].get("from")));
//       let to = doc.clipPos(eval("CodeMirror.Pos" + errors[i].get("to")));

//       if (from.line === to.line && from.ch === to.ch) {
//         to.ch += 1;
//         to = doc.clipPos(to);
//       }

//       if (from.line === to.line && from.ch === to.ch) {
//         from.ch -= 1;
//         from = doc.clipPos(from);
//       }

//       mapped.push({
//         message: errors[i].get("message"),
//         from: from,
//         to: to,
//       });
//     }

//     return mapped;
//   } else {
//     return [];
//   }
// });
let current_data = null;


let grammar = document.querySelector(".editor-grammar")!;
const editor = new EditorView({
    extensions: [minimalSetup],
    parent: grammar
})
