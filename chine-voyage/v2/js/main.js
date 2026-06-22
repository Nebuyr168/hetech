/* =========================================================
   Voyage en Chine — Variante 2 : SVG + CSS 3D
   Fleur de cerisier à l'encre qui éclôt et s'estompe au défilement.
   Aucun Three.js, aucun WebGL : pétales SVG animés par transforms 3D CSS.
   ========================================================= */

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Utilitaires ---------- */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

const SVGNS = "http://www.w3.org/2000/svg";
const PETALS = 5;

const stage = document.getElementById("flower-stage");
const flowerSvg = document.getElementById("flower-svg");
const petalsGroup = document.getElementById("petals-group");
const coreGroup = document.getElementById("flower-core");
const halo = document.getElementById("flower-halo");

/* =========================================================
   1. Construction de la fleur : 5 pétales disposés radialement
      (rotation de 72°) à partir de la forme définie dans <defs>.
   ========================================================= */
const petals = [];

for (let i = 0; i < PETALS; i++) {
  // Armature : oriente le pétale autour du centre (72° entre chacun).
  const armature = document.createElementNS(SVGNS, "g");
  armature.setAttribute("class", "petale-armature");
  armature.setAttribute("transform", `rotate(${(i / PETALS) * 360})`);

  // Pivot : porte la transformation 3D d'ouverture (gérée en CSS via la classe .petale).
  const pivot = document.createElementNS(SVGNS, "g");
  pivot.setAttribute("class", "petale");

  // La forme est ancrée par sa base au centre (0,0) puis poussée vers le haut.
  const use = document.createElementNS(SVGNS, "use");
  use.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#petale-forme");
  use.setAttribute("href", "#petale-forme");
  use.setAttribute("transform", "translate(0,-6) scale(1,-1)"); // pointe vers le haut

  pivot.appendChild(use);
  armature.appendChild(pivot);
  petalsGroup.appendChild(armature);
  petals.push(pivot);
}

/* =========================================================
   2. Cœur : pistil central + étamines dorées rayonnantes.
   ========================================================= */
(function buildCore() {
  const STAMENS = 11;
  for (let i = 0; i < STAMENS; i++) {
    const a = (i / STAMENS) * Math.PI * 2;
    const len = 26 + Math.random() * 10;
    const x = Math.cos(a) * len;
    const y = Math.sin(a) * len;

    const fil = document.createElementNS(SVGNS, "path");
    fil.setAttribute("class", "etamine-filament");
    fil.setAttribute("d", `M 0 0 Q ${x * 0.4} ${y * 0.4 - 4} ${x} ${y}`);
    coreGroup.appendChild(fil);

    const anther = document.createElementNS(SVGNS, "circle");
    anther.setAttribute("class", "etamine-anthere");
    anther.setAttribute("cx", x.toFixed(1));
    anther.setAttribute("cy", y.toFixed(1));
    anther.setAttribute("r", "4.4");
    coreGroup.appendChild(anther);
  }
  // Pistil central.
  const pistil = document.createElementNS(SVGNS, "circle");
  pistil.setAttribute("class", "pistil");
  pistil.setAttribute("cx", "0");
  pistil.setAttribute("cy", "0");
  pistil.setAttribute("r", "8");
  coreGroup.appendChild(pistil);
})();

/* =========================================================
   3. Application de l'épanouissement (bloom 0 → 1)
      Mécanique reproduite de la V1, mais en transforms 3D CSS :
        - rotateX : du replié (bouton) vers le plat (ouvert)
        - translateZ + scale : la fleur gonfle en s'ouvrant
        - opacité : pleine jusqu'à mi-course puis fondu vers 0
   ========================================================= */
const FOLD_CLOSED = 78;   // bouton fermé : pétales fortement repliés vers l'avant (deg)
const FOLD_OPEN = -8;     // pleinement ouvert : pétales à plat, pointe légèrement relevée

let bloom = 0;        // valeur lissée réellement appliquée
let targetBloom = 0;  // cible définie par le scroll

function applyBloom(t) {
  // t : progression de l'ouverture (0 = bouton, 1 = fleur ouverte + estompée)
  const e = smoothstep(0, 1, t);
  const fold = lerp(FOLD_CLOSED, FOLD_OPEN, e);
  const lift = lerp(-26, 18, e);     // translateZ : recule replié, avance ouvert
  const petalScale = lerp(0.82, 1.06, e);

  for (const p of petals) {
    p.style.transform =
      `translateZ(${lift.toFixed(2)}px) rotateX(${fold.toFixed(2)}deg) scale(${petalScale.toFixed(3)})`;
  }

  // La fleur entière gonfle légèrement.
  const globalScale = lerp(0.80, 1.26, e);
  flowerSvg.style.transform = `scale(${globalScale.toFixed(3)}) rotate(${(e * 26).toFixed(2)}deg)`;

  // Estompage : la fleur reste pleine puis disparaît dans la 2ᵉ moitié (courbe smoothstep).
  const flowerOpacity = 1 - smoothstep(0.5, 1.0, t);
  stage.style.opacity = flowerOpacity.toFixed(3);

  // Le cœur apparaît à l'ouverture puis suit l'estompage de la fleur.
  coreGroup.style.opacity = (smoothstep(0.25, 0.7, t) * flowerOpacity).toFixed(3);

  // Halo : éclat maximal à mi-ouverture.
  if (halo) halo.style.opacity = (Math.sin(clamp(t, 0, 1) * Math.PI) * 0.9).toFixed(3);
}

applyBloom(0);

/* Accès d'inspection (vérification — sans effet sur le rendu). */
window.__flower = {
  state: () => ({
    bloom: +bloom.toFixed(3),
    target: +targetBloom.toFixed(3),
    foldDeg: +lerp(FOLD_CLOSED, FOLD_OPEN, smoothstep(0, 1, bloom)).toFixed(1),
    stageOpacity: +(+stage.style.opacity || 0).toFixed(3),
    coreOpacity: +(+coreGroup.style.opacity || 0).toFixed(3),
    halo: +(halo ? +halo.style.opacity || 0 : 0).toFixed(3),
    petalCount: petals.length,
  }),
  set: (t) => { targetBloom = bloom = clamp(t, 0, 1); applyBloom(bloom); return window.__flower.state(); },
};

/* =========================================================
   4. Pilotage par le défilement (GSAP ScrollTrigger)
      Même mécanique que la V1 : scrub sur la zone .hero-scroll.
   ========================================================= */
function initScroll() {
  const { gsap } = window;
  if (!gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(window.ScrollTrigger);

  // Ouverture de la fleur le long de la zone héro.
  window.ScrollTrigger.create({
    trigger: ".hero-scroll",
    start: "top top",
    end: "bottom bottom",
    scrub: 1,
    onUpdate: (self) => { targetBloom = self.progress; },
  });

  // Disparition du texte d'accroche.
  gsap.to(".hero-content", {
    opacity: 0, y: -50, ease: "none",
    scrollTrigger: { trigger: ".hero-scroll", start: "top top", end: "45% top", scrub: true },
  });

  // Avion qui traverse la section d'arrivée.
  gsap.to(".plane", {
    x: () => window.innerWidth + 220, y: -40, ease: "none",
    scrollTrigger: { trigger: ".arrivee", start: "top bottom", end: "bottom top", scrub: true },
  });

  // Apparition des éléments .reveal.
  gsap.utils.toArray(".reveal").forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
      onStart: () => el.classList.add("is-in"),
    });
  });

  window.ScrollTrigger.refresh();
}

/* Mouvement réduit : fleur joliment ouverte, figée, sans scrub. */
if (prefersReduced) {
  targetBloom = 0.55;
  bloom = 0.55;
  applyBloom(0.55);
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
}

/* =========================================================
   5. Boucle de lissage (uniquement si animation autorisée)
      Lisse l'ouverture vers la cible définie par le scroll.
   ========================================================= */
if (!prefersReduced) {
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    bloom += (targetBloom - bloom) * Math.min(1, dt * 6);
    applyBloom(bloom);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* =========================================================
   6. Divers (nav, année)
   ========================================================= */
window.addEventListener("scroll", () => {
  document.getElementById("nav").classList.toggle("is-scrolled", window.scrollY > 40);
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

window.addEventListener("resize", () => {
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
});

// GSAP est chargé en "defer" : on attend le chargement complet.
window.addEventListener("load", initScroll);
