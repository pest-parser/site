let START_SEED = 5;
let seed = START_SEED;
let spans;

function random() {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function randomN(n) {
  return Math.floor(random() * n);
}

function randomChoice(alphabet) {
  return alphabet.charAt(randomN(alphabet.length));
}

function fillElement(elem, alphabet, density) {
  let rect = elem.getBoundingClientRect();
  let GLYPHS = rect.width * density;

  while (elem.firstChild) {
    elem.removeChild(elem.firstChild);
  }

  for (let i = 0; i < GLYPHS; i++) {
    let p = document.createElement("P");
    let t = document.createTextNode(randomChoice(alphabet));

    p.appendChild(t);
    p.className = "glyph-background";
    p.style.color = "rgba(255, 255, 255, " + random() * 0.2 + ")";
    p.style.top = random() * rect.height * 1.3 - rect.height * 0.15 + "px";
    p.style.left = random() * rect.width - rect.width * 0.05 + "px";
    p.style.fontSize = randomN(20) + "pt";
    p.style.transform = "rotate(" + randomN(360) + "deg)";

    elem.appendChild(p);
  }
}

function findTokens() {
  let token = document.getElementsByClassName("token")[0];
  let tokens = [
    "{statement -> value -> ident}",
    "{statement -> calls -> dot}",
    "{statement -> calls -> ident}",
    "{statement -> calls -> parent}",
    "{statement -> calls -> args -> int}",
    "{statement -> calls -> parent}",
    "{statement -> semicolon}",
  ];

  function addListeners(i) {
    spans[i].addEventListener("mouseover", function () {
      let j = i;
      token.innerHTML = tokens[j];
    });
    spans[i].addEventListener("mouseout", function () {
      token.innerHTML = "{statement}";
    });
  }

  for (let i = 0; i < spans.length; i++) {
    addListeners(i);
  }
}

function jump() {
  let i = Math.floor(Math.random() * spans.length);

  let span = spans[i];
  let newSpan = span.cloneNode(true);
  span.parentNode.replaceChild(newSpan, span);
  newSpan.classList.add("jump");
}

window.addEventListener(
  "DOMContentLoaded",
  function () {
    seed = START_SEED;

    fillElement(
      document.getElementsByClassName("banner-features")[0],
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      0.2
    );
    fillElement(
      document.getElementsByClassName("banner-benchmark")[0],
      "0123456789",
      0.1
    );

    let sample = document.getElementsByClassName("sample")[0];
    spans = sample.children;

    jump();
    let jumpInterval = setInterval(jump, 2000);

    sample.addEventListener("mouseover", function () {
      clearInterval(jumpInterval);
      findTokens();
    });

    elems = document.getElementsByClassName("chart-bar-hidden");
    elems = Array.prototype.slice.call(elems);
    startAnimations();
  },
  false
);

let features = document.getElementsByClassName("banner-features")[0];
let benchmark = document.getElementsByClassName("banner-benchmark")[0];
let elems = [];

function startAnimations() {
  let windowHeight = window.innerHeight;
  for (let i = 0; i < elems.length; i++) {
    let posFromTop = elems[i].getBoundingClientRect().top;
    if (posFromTop - windowHeight <= 0) {
      elems[i].className = elems[i].className.replace(
        "chart-bar-hidden",
        "chart-bar-bounce"
      );
    }
  }
}

window.addEventListener("scroll", startAnimations);

window.addEventListener(
  "resize",
  function () {
    seed = START_SEED;

    fillElement(
      document.getElementsByClassName("banner-features")[0],
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      0.2
    );
    fillElement(
      document.getElementsByClassName("banner-benchmark")[0],
      "0123456789",
      0.1
    );
  },
  true
);
