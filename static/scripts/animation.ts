var START_SEED = 5;
var seed = START_SEED;
var spans: HTMLCollection;

function random() {
  var x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function randomN(n: number) {
  return Math.floor(random() * n);
}

function randomChoice(alphabet: string) {
  return alphabet.charAt(randomN(alphabet.length));
}

function fillElement(elem: Element, alphabet: string, density: number) {
  var rect = elem.getBoundingClientRect();
  var GLYPHS = rect.width * density;

  while (elem.firstChild) {
    elem.removeChild(elem.firstChild);
  }

  for (var i = 0; i < GLYPHS; i++) {
    var p = document.createElement("P");
    var t = document.createTextNode(randomChoice(alphabet));

    p.appendChild(t);
    p.className = "glyph-background";
    p.style.color = "rgba(255, 255, 255, " + random() * 0.2 + ")";
    p.style.top = (random() * rect.height * 1.3 - rect.height * 0.15) + "px";
    p.style.left = (random() * rect.width - rect.width * 0.05) + "px";
    p.style.fontSize = randomN(20) + "pt";
    p.style.transform = "rotate(" + randomN(360) + "deg)";

    elem.appendChild(p);
  }
}

function findTokens() {
  var token = document.getElementsByClassName("token")[0];
  var tokens = [
    "{statement -> value -> ident}",
    "{statement -> calls -> dot}",
    "{statement -> calls -> ident}",
    "{statement -> calls -> parent}",
    "{statement -> calls -> args -> int}",
    "{statement -> calls -> parent}",
    "{statement -> semicolon}"
  ];

  function addListeners(i: number) {
    spans[i].addEventListener("mouseover", function () {
      var j = i;
      token.innerHTML = tokens[j];
    });
    spans[i].addEventListener("mouseout", function () {
      token.innerHTML = "{statement}";
    });
  }

  for (var i = 0; i < spans.length; i++) {
    addListeners(i);
  }
}

function jump() {
  var i = Math.floor(Math.random() * spans.length);

  var span = spans[i];
  var newSpan = span.cloneNode(true);
  span.parentNode!.replaceChild(newSpan, span);
  if (newSpan instanceof HTMLSpanElement)
    newSpan.classList.add("jump");
}

window.addEventListener("DOMContentLoaded", function () {
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

  var sample = document.getElementsByClassName("sample")[0];
  spans = sample.children;

  jump();
  var jumpInterval = setInterval(jump, 2000);

  sample.addEventListener("mouseover", function () {
    clearInterval(jumpInterval);
    findTokens();
  });

  elems = [...document.getElementsByClassName("chart-bar-hidden")];
  startAnimations();
}, false);

var features = document.getElementsByClassName("banner-features")[0];
var benchmark = document.getElementsByClassName("banner-benchmark")[0];
var elems: Element[] = [];

function startAnimations() {
  var windowHeight = window.innerHeight;
  for (var i = 0; i < elems.length; i++) {
    var posFromTop = elems[i].getBoundingClientRect().top;
    if (posFromTop - windowHeight <= 0) {
      elems[i].className = elems[i].className.replace(
        "chart-bar-hidden",
        "chart-bar-bounce"
      );
    }
  }
}

window.addEventListener("scroll", startAnimations);

window.addEventListener("resize", function () {
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
}, true);