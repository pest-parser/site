import { encode, decode } from "url-safe-base64";

let copyButton, copyButtonOriginalText, shareLinkWarning;

export function initShareButton({ myCodeMirror }) {
    shareLinkWarning = document.getElementById("shareLinkWarning");
    tryLoadFromShareLink(myCodeMirror);
    copyButton = document.getElementById("shareLinkBtn");
    copyButtonOriginalText = copyButton.innerText;
    copyButton.onclick = () => copyShareLink(myCodeMirror);
}

let copyButtonTimerHandle: number | undefined = undefined;

function copyShareLink(codeMirror) {
    clearTimeout(copyButtonTimerHandle);
    const url = shareURL(codeMirror);
    if (url.length > 2000) {
        setShareLinkLengthWarning();
    } else {
        clearShareLinkWarning();
    }
    navigator.clipboard.writeText(url);
    copyButton.classList.add("copied");
    copyButton.innerText = "Copied";
    copyButtonTimerHandle = window.setTimeout(
        () => { copyButton.classList.remove("copied"); copyButton.innerText = copyButtonOriginalText; },
        1400
    );
}

function tryLoadFromShareLink(codeMirror) {
    let url = new URL(window.location.href);
    let gdata = url.searchParams.get("g");
    if (gdata) {
        const decoded = decodeShareData(gdata);
        codeMirror.setValue(decoded["grammar"]);
        const inputEditor = document.querySelector<HTMLInputElement>(".editor-input-text")!;
        inputEditor.value = decoded["input"];
    }
}

function shareData(codeMirror) {
    let data = {};
    data["grammar"] = codeMirror.getValue();
    data["input"] = document.querySelector<HTMLInputElement>(".editor-input-text")!.value;
    return data;
}

function shareURL(codeMirror) {
    const gdata = encodeShareData(shareData(codeMirror));
    const url = new URL(window.location.href);
    url.searchParams.set("g", gdata);
    url.hash = "editor";
    return url.toString();
}

function setShareLinkLengthWarning() {
    shareLinkWarning.innerText = "Share link > 2000 chars; it may not work."
    shareLinkWarning.style.display = null;
}

function clearShareLinkWarning() {
    shareLinkWarning.innerText = "";
    shareLinkWarning.style.display = "none";
}

function encodeShareData(data: any) {
    return encode(btoa(JSON.stringify(data)));
}

function decodeShareData(encoded: string) {
    return JSON.parse(atob(decode(encoded)));
}
