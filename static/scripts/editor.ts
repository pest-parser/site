// we can't safely type codemirror@v5 because of the addon system
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const CodeMirror: any;

import Split from "split.js";
import init, { lint, format } from "../../pkg/pest_site.js";
import { initShareButton } from "./shareButton";

let loaded = false;

const editorDom = document.querySelector<HTMLLinkElement>(".editor")!;
const gridDom = document.querySelector<HTMLDivElement>(".editor-grid")!;
const inputDom = document.querySelector<HTMLDivElement>(".editor-input")!;
const inputTextDom = document.querySelector<HTMLTextAreaElement>('.editor-input-text')!;
const outputDom =
  document.querySelector<HTMLTextAreaElement>(".editor-output")!;
const modeBtn = document.querySelector<HTMLButtonElement>("#modeBtn")!;
const formatBtn = document.querySelector<HTMLButtonElement>("#formatBtn")!;

const windowHeight = window.innerHeight;

CodeMirror.defineSimpleMode("pest", {
  start: [
    { regex: /\/\/.*/, token: "comment" },
    { regex: /[a-zA-Z_]\w*/, token: "constiable" },
    { regex: /=/, token: "operator", next: "mod" },
  ],
  mod: [
    { regex: /\{/, token: "bracket", next: "inside_rule" },
    { regex: /[_@!$]/, token: "operator-2" },
  ],
  inside_rule: [
    { regex: /"/, token: "string", next: "string" },
    {
      regex: /'(?:[^'\\]|\\(?:[nrt0'"]|x[\da-fA-F]{2}|u\{[\da-fA-F]{6}\}))'/,
      token: "string",
    },
    { regex: /\}/, token: "bracket", next: "start" },
    { regex: /#\w+/, token: "tag" },
    { regex: /[a-zA-Z_]\w*/, token: "constiable-2" },
    { regex: /=/, token: "operator-2" },
    { regex: /\d+/, token: "number" },
    { regex: /[~|*+?&!]|(\.\.)/, token: "operator" },
  ],
  string: [
    { regex: /"/, token: "string", next: "inside_rule" },
    { regex: /(?:[^\\"]|\\(?:.|$))*/, token: "string" },
  ],
  meta: {
    dontIndentStates: ["comment"],
    lineComment: "//",
  },
});







CodeMirror.registerHelper("lint", "pest", function (text) {
  if (loaded) {
    const doc = CodeMirror.Doc(text);
    const errors = lint(text);
    const mapped: { message: string; from: number; to: number }[] = [];

    for (let i = 0; i < errors.length; i++) {
      let from = doc.clipPos(eval("CodeMirror.Pos" + errors[i].get("from")));
      let to = doc.clipPos(eval("CodeMirror.Pos" + errors[i].get("to")));

      if (from.line === to.line && from.ch === to.ch) {
        to.ch += 1;
        to = doc.clipPos(to);
      }

      if (from.line === to.line && from.ch === to.ch) {
        from.ch -= 1;
        from = doc.clipPos(from);
      }

      mapped.push({
        message: errors[i].get("message"),
        from: from,
        to: to,
      });
    }

    return mapped;
  } else {
    return [];
  }
});

const grammar = document.querySelector<HTMLTextAreaElement>(".editor-grammar")!;
const myCodeMirror = CodeMirror.fromTextArea(grammar, {
  mode: "pest",
  lint: "pest",
  theme: "pest",
  placeholder: "Grammar",
});

initShareButton({ myCodeMirror });

function doFormat() {
  if (!loaded || !myCodeMirror) {
    return;
  }

  const grammar = myCodeMirror.getValue();
  const formatted = format(grammar);
  myCodeMirror.setValue(formatted);
}

let split: Split.Instance | null = null;
let sizes = JSON.parse(localStorage.getItem("split-sizes") ?? "[33, 33, 33]");
if (!Array.isArray(sizes) || sizes.length !== 3) {
  console.warn("Invalid split sizes", sizes);
  sizes = [33, 33, 33];
}

function makeResizable(wideMode: boolean) {
  if (wideMode) {
    split = Split([".CodeMirror", ".editor-input", ".output-wrapper"], {
      sizes,
      onDragEnd: function (_sizes) {
        sizes = _sizes;
        localStorage.setItem("split-sizes", JSON.stringify(sizes));
      },
    });
  } else {
    if (split) {
      split.destroy();
    }
  }
}

type SavedGrammar = {
  grammar: string;
  input: string;
};
function saveCode() {
  const grammar = myCodeMirror.getValue();
  const input = inputTextDom.value;
  const json = JSON.stringify({ grammar, input } satisfies SavedGrammar);
  localStorage.setItem("last-editor-state", json);
}
function getSavedCode() {
  const json = localStorage.getItem("last-editor-state")
  const parsed = JSON.parse(json || "null")
  return parsed || { grammar: "", input: "" }
}


function wideMode() {
  modeBtn.onclick = restore;
  modeBtn.innerText = "Normal Mode";
  inputDom.classList.add("wide-input");
  editorDom.classList.add("wide-editor");
  gridDom.classList.add("flex-editor");
  const upperHeight = document.querySelector("#modeBtn")!.scrollHeight + 30;
  gridDom.setAttribute("style", `height: ${windowHeight - upperHeight}px`);
  myCodeMirror.setSize(null, outputDom.clientHeight - 20);
  makeResizable(true);
  window.scrollTo(0, document.body.scrollHeight);
}

function restore() {
  modeBtn.onclick = wideMode;
  modeBtn.innerText = "Wide Mode";
  inputDom.classList.remove("wide-input");
  editorDom.classList.remove("wide-editor");
  gridDom.classList.remove("flex-editor");
  outputDom.setAttribute("rows", "7");
  myCodeMirror.setSize(null, outputDom.clientHeight);
  makeResizable(false);
}

modeBtn.onclick = wideMode;
formatBtn.onclick = doFormat;

init().then(() => {
  loaded = true
  const { grammar, input } = getSavedCode();
  myCodeMirror.setValue(grammar);
  inputTextDom.value = input;
});

inputTextDom.addEventListener("input", saveCode);
myCodeMirror.on("change", saveCode);