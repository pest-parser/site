import Codemirror from "codemirror"
      import "codemirror/addon/display/placeholder.js"
      import "codemirror/addon/lint/lint.js"
      import "codemirror/addon/mode/simple.js"

      const editorDom = document.querySelector(".editor");
      const gridDom = document.querySelector(".editor-grid");
      const inputDom = document.querySelector(".editor-input");
      const outputDom = document.querySelector(".editor-output");
      const modeBtn = document.querySelector("#modeBtn");
      let windowHeight = window.innerHeight;
      var current_data = null;

      CodeMirror.defineSimpleMode("pest", {
        start: [
          {regex: /"/, token: "string", next: "string"},
          {regex: /'(?:[^'\\]|\\(?:[nrt0'"]|x[\da-fA-F]{2}|u\{[\da-fA-F]{6}\}))'/, token: "string"},
          {regex: /\/\/.*/, token: "comment"},
          {regex: /\d+/, token: "number"},
          {regex: /[~|*+?&!]|(\.\.)/, token: "operator"},
          {regex: /[a-zA-Z_]\w*/, token: "variable"},
          {regex: /=/, next: "mod"}
        ],
        mod: [
          {regex: /\{/, next: "start"},
          {regex: /[_@!$]/, token: "operator-2"},
        ],
        string: [
            {regex: /"/, token: "string", next: "start"},
            {regex: /(?:[^\\"]|\\(?:.|$))*/, token: "string"}
        ],
        meta: {
          dontIndentStates: ["comment"],
          lineComment: "//"
        }
      });

      CodeMirror.registerHelper("lint", "pest", function(text) {
        if (window.lint) {
          var doc = CodeMirror.Doc(text);
          var errors = window.lint(text);
          var mapped = [];

          for (var i = 0; i < errors.length; i++) {
            var from = doc.clipPos(eval("CodeMirror.Pos" + errors[i].get("from")));
            var to = doc.clipPos(eval("CodeMirror.Pos" + errors[i].get("to")));

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
              to: to
            });
          }

          return mapped;
        } else {
          return [];
        }
      });

      var grammar = document.getElementsByClassName("editor-grammar")[0];
      var myCodeMirror = CodeMirror.fromTextArea(grammar, {
        mode: "pest",
        lint: "pest",
        theme: "pest",
        placeholder: "Grammar",
      });

      var url = new URL(window.location.href);
      var bin = url.searchParams.get("bin");
      if (bin) {
        var http = new XMLHttpRequest();
        var url = "https://api.myjson.com/bins/" + bin;
        http.open("GET", url, true);

        http.onreadystatechange = function() {
          if (http.readyState === 4 && http.status === 200) {
            var data = JSON.parse(http.responseText);
            current_data = data;

            myCodeMirror.setValue(data["grammar"]);
          }
        }
        http.send(null);
      }

      function set_current_data() {
        if (current_data) {
          var select = document.getElementsByClassName("editor-input-select")[0];

          for (var i = 0; i < select.options.length; i++) {
            if (select.options[i].value === current_data["rule"]) {
              select.selectedIndex = i;
              var event = new Event('change');
              select.dispatchEvent(event);
              break;
            }
          }

          var input = document.getElementsByClassName("editor-input-text")[0];
          input.value = current_data["input"];

          current_data = null;
        }
      }

      function share() {
        var data = {};
        var select = document.getElementsByClassName("editor-input-select")[0];

        data["grammar"] = myCodeMirror.getValue();
        data["input"] = document.getElementsByClassName("editor-input-text")[0].value;
        data["rule"] = select.options[select.selectedIndex].value;

        var http = new XMLHttpRequest();
        var url = "https://api.myjson.com/bins";
        http.open("POST", url, true);
        http.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

        http.onreadystatechange = function() {
          if (http.readyState === 4 && http.status === 201) {
            var url = JSON.parse(http.responseText)["uri"];
            var tokens = url.split("/");
            var bin = tokens[tokens.length - 1];

            var link = document.getElementsByClassName("direct-link")[0];

            link.href = "https://pest-parser.github.io/?bin=" + bin + "#editor";
            link.text = "direct link";
          }
        };
        http.send(JSON.stringify(data));
      }
      let split = null;
      let sizes = localStorage.getItem('split-sizes');
      if (sizes) {
        sizes = JSON.parse(sizes)
      } else {
        sizes = [33, 33, 33] // default sizes
      }
      function makeResizable(wideMode) {
        if (wideMode) {
          split = Split(['.CodeMirror', '.editor-input', '.output-wrapper'], {
            sizes,
            onDragEnd: function(_sizes) {
              sizes = _sizes;
              localStorage.setItem('split-sizes', JSON.stringify(sizes))
            },
          })
        } else {
          if (split) {
            split.destroy();
          }
        }
      }
      function wideMode() {
        modeBtn.onclick = restore;
        modeBtn.innerText = "Normal Mode";
        inputDom.classList.add("wide-input");
        editorDom.classList.add("wide-editor");
        gridDom.classList.add("flex-editor");
        const upperHeight = document.querySelector('#modeBtn').scrollHeight + 30;
        gridDom.setAttribute('style', `height: ${windowHeight - upperHeight}px`);
        myCodeMirror.setSize(null, outputDom.clientHeight - 20);
        makeResizable(true);
        window.scrollTo(0,document.body.scrollHeight);
      }

      function restore() {
        modeBtn.onclick = wideMode;
        modeBtn.innerText = "Wide Mode";
        inputDom.classList.remove("wide-input");
        editorDom.classList.remove("wide-editor");
        gridDom.classList.remove("flex-editor");
        outputDom.setAttribute("rows", 7);
        myCodeMirror.setSize(null, outputDom.clientHeight);
        makeResizable(false);
      }