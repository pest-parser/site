export { CodeMirror, setCurrentData };

interface Window {
  setCurrentData;
  CodeMirror;
}

declare global {
  var CodeMirror;
  var setCurrentData;
}
