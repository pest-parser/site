import './base';
import './style.scss';

import Split from 'split.js';
import init, { format, lint } from '../pkg/pest_site';

const pestGrammar = {
  start: [
    { regex: /"/, token: 'string', next: 'string' },
    {
      regex: /'(?:[^'\\]|\\(?:[nrt0'"]|x[\da-fA-F]{2}|u\{[\da-fA-F]{6}\}))'/,
      token: 'string',
    },
    { regex: /\/\/.*/, token: 'comment' },
    { regex: /\d+/, token: 'number' },
    { regex: /[~|*+?&!]|(\.\.)/, token: 'operator' },
    { regex: /[a-zA-Z_]\w*/, token: 'variable' },
    { regex: /=/, next: 'mod' },
  ],
  mod: [
    { regex: /\{/, next: 'start' },
    { regex: /[_@!$]/, token: 'operator-2' },
  ],
  string: [
    { regex: /"/, token: 'string', next: 'start' },
    { regex: /(?:[^\\"]|\\(?:.|$))*/, token: 'string' },
  ],
  meta: {
    dontIndentStates: ['comment'],
    lineComment: '//',
  },
};

let wasmReady = false;
async function run() {
  await init();
  wasmReady = true;
}
run();

CodeMirror.defineSimpleMode('pest', pestGrammar);
CodeMirror.registerHelper('lint', 'pest', (text: string) => {
  if (!wasmReady) return [];

  const doc = CodeMirror.Doc(text);
  const errors = lint(text);
  const mapped: any[] = [];

  for (let i = 0; i < errors.length; i++) {
    let from = doc.clipPos(eval('CodeMirror.Pos' + errors[i].get('from')));
    let to = doc.clipPos(eval('CodeMirror.Pos' + errors[i].get('to')));

    if (from.line === to.line && from.ch === to.ch) {
      to.ch += 1;
      to = doc.clipPos(to);
    }

    if (from.line === to.line && from.ch === to.ch) {
      from.ch -= 1;
      from = doc.clipPos(from);
    }

    mapped.push({
      message: errors[i].get('message'),
      from: from,
      to: to,
    });
  }

  return mapped;
});

let current_data: any = null;
let myCodeMirror: any = null;

const createBin = () => {
  let url = new URL(window.location.href);
  let bin = url.searchParams.get('bin');
  if (bin) {
    let http = new XMLHttpRequest();
    let url = 'https://api.myjson.com/bins/' + bin;
    http.open('GET', url, true);

    http.onreadystatechange = function () {
      if (http.readyState === 4 && http.status === 200) {
        let data = JSON.parse(http.responseText);
        current_data = data;

        myCodeMirror.setValue(data['grammar']);
      }
    };
    http.send(null);
  }
};

/**
 * Export a set_current_data method for Rust call on global.
 */
window.setCurrentData = () => {
  if (current_data) {
    let select: any = document.querySelector('.editor-input-select');

    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === current_data['rule']) {
        select.selectedIndex = i;
        let event = new Event('change');
        select.dispatchEvent(event);
        break;
      }
    }

    let input: any = document.querySelector('.editor-input-text');
    input.value = current_data['input'];

    current_data = null;
  }
};

const share = () => {
  let data: Record<string, any> = {};
  let select: any = document.querySelector('.editor-input-select');

  data['grammar'] = myCodeMirror.getValue();
  data['input'] = document.querySelector('.editor-input-text');
  data['rule'] = select.options[select.selectedIndex].value;

  let http = new XMLHttpRequest();
  let url = 'https://api.myjson.com/bins';
  http.open('POST', url, true);
  http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

  http.onreadystatechange = () => {
    if (http.readyState === 4 && http.status === 201) {
      let url = JSON.parse(http.responseText)['uri'];
      let tokens = url.split('/');
      let bin = tokens[tokens.length - 1];

      let link: any = document.querySelector('.direct-link');

      link.href = 'https://pest-parser.github.io/?bin=' + bin + '#editor';
      link.text = 'direct link';
    }
  };
  http.send(JSON.stringify(data));
};

const doFormat = () => {
  if (!myCodeMirror) {
    return;
  }

  let grammar = myCodeMirror.getValue();
  let formatted = format(grammar);
  myCodeMirror.setValue(formatted);
};

let split: any;
const makeResizable = (wideMode: boolean) => {
  let sizes: any = localStorage.getItem('split-sizes');
  if (sizes) {
    sizes = JSON.parse(sizes);
  } else {
    sizes = [33, 33, 33]; // default sizes
  }

  if (wideMode) {
    split = Split(['.CodeMirror', '.editor-input', '.output-wrapper'], {
      sizes,
      onDragEnd: function (_sizes) {
        sizes = _sizes;
        localStorage.setItem('split-sizes', JSON.stringify(sizes));
      },
    });
  } else {
    split?.destroy();
  }
};

const toggleMode = (e: Event) => {
  let btn = e.target as HTMLElement;
  const editorDom = document.querySelector('.editor') as HTMLElement;
  const gridDom = document.querySelector('.editor-grid') as HTMLElement;
  const inputDom = document.querySelector('.editor-input') as HTMLElement;
  const outputDom = document.querySelector('.editor-output') as HTMLElement;

  if (btn.getAttribute('mode') !== 'wide') {
    btn.setAttribute('mode', 'wide');
    btn.innerText = 'Normal Mode';
    inputDom.classList.add('wide-input');
    editorDom.classList.add('wide-editor');
    gridDom.classList.add('flex-editor');
    const upperHeight = btn.scrollHeight + 30;
    gridDom.setAttribute(
      'style',
      `height: ${window.innerHeight - upperHeight}px`
    );
    myCodeMirror.setSize(null, outputDom.clientHeight - 20);
    makeResizable(true);
    window.scrollTo(0, document.body.scrollHeight);
  } else {
    btn.setAttribute('mode', '');
    btn.innerText = 'Wide Mode';
    inputDom.classList.remove('wide-input');
    editorDom.classList.remove('wide-editor');
    gridDom.classList.remove('flex-editor');
    gridDom.setAttribute('style', 'height: auto');
    outputDom.setAttribute('rows', '7');
    myCodeMirror.setSize(null, outputDom.clientHeight);
    makeResizable(false);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  createBin();

  myCodeMirror = CodeMirror.fromTextArea(
    document.querySelector('.editor-grammar'),
    {
      mode: 'pest',
      lint: 'pest',
      theme: 'pest',
      placeholder: 'Grammar',
    }
  );

  document.querySelector('#btn-mode')?.addEventListener('click', toggleMode);
  document.querySelector('#btn-format')?.addEventListener('click', doFormat);
  document.querySelector('#btn-share')?.addEventListener('click', share);
});
