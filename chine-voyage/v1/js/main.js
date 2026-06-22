/* =========================================================
   Voyage en Chine — Variante 1 : Three.js
   Fleur de cerisier qui éclôt et s'estompe au défilement.
   ========================================================= */

import * as THREE from "three";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;

/* ---------- Utilitaires ---------- */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/* =========================================================
   1. Scène, caméra, rendu
   ========================================================= */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 6.4);

/* ---------- Lumières ---------- */
scene.add(new THREE.AmbientLight(0xfff0f5, 0.85));

const key = new THREE.DirectionalLight(0xffffff, 1.15);
key.position.set(3, 4, 5);
scene.add(key);

const fill = new THREE.DirectionalLight(0xffd9e6, 0.6);
fill.position.set(-4, -1, 3);
scene.add(fill);

const goldRim = new THREE.PointLight(0xffd98a, 0.9, 30);
goldRim.position.set(0, 0, 3.5);
scene.add(goldRim);

/* =========================================================
   2. Géométrie d'un pétale (avec encoche caractéristique)
   ========================================================= */
function createPetalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-0.52, 0.28, -0.58, 1.05, -0.20, 1.52); // flanc gauche
  shape.quadraticCurveTo(0, 1.34, 0.20, 1.52);                // encoche au sommet
  shape.bezierCurveTo(0.58, 1.05, 0.52, 0.28, 0, 0);          // flanc droit

  const geo = new THREE.ShapeGeometry(shape, 24);

  // Galbe : on creuse légèrement le pétale et on recourbe la pointe.
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const cup = -0.26 * x * x;          // creux transversal
    const curl = -0.10 * smoothstep(0.6, 1.5, y); // pointe recourbée
    pos.setZ(i, cup + curl);
  }
  geo.computeVertexNormals();
  return geo;
}

const petalGeo = createPetalGeometry();

const petalMaterial = new THREE.MeshStandardMaterial({
  color: 0xf7b7cf,
  emissive: 0xf48fb1,
  emissiveIntensity: 0.18,
  roughness: 0.62,
  metalness: 0.0,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 1,
});

/* =========================================================
   3. Assemblage de la fleur (5 pétales + étamines)
   ========================================================= */
const flower = new THREE.Group();
scene.add(flower);

const PETALS = 5;
const pivots = [];

for (let i = 0; i < PETALS; i++) {
  const armature = new THREE.Group();          // distribue autour du centre
  armature.rotation.z = (i / PETALS) * Math.PI * 2;

  const pivot = new THREE.Group();             // gère le pliage (ouverture)
  const mesh = new THREE.Mesh(petalGeo, petalMaterial);
  pivot.add(mesh);
  armature.add(pivot);
  flower.add(armature);
  pivots.push(pivot);
}

/* ---------- Étamines dorées (visibles à l'ouverture) ---------- */
const stamens = new THREE.Group();
const stamenMat = new THREE.MeshStandardMaterial({
  color: 0xe9b94e, emissive: 0xc9912b, emissiveIntensity: 0.4,
  roughness: 0.4, transparent: true, opacity: 0,
});
const antherGeo = new THREE.SphereGeometry(0.055, 10, 10);
const filamentGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6);
for (let i = 0; i < 11; i++) {
  const a = (i / 11) * Math.PI * 2;
  const r = 0.18 + Math.random() * 0.08;
  const grp = new THREE.Group();
  const fil = new THREE.Mesh(filamentGeo, stamenMat);
  fil.position.y = 0.21;
  const anther = new THREE.Mesh(antherGeo, stamenMat);
  anther.position.y = 0.44;
  grp.add(fil, anther);
  grp.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.08);
  grp.rotation.z = a - Math.PI / 2;
  grp.rotation.x = -0.5;
  stamens.add(grp);
}
flower.add(stamens);

/* ---------- Halo lumineux derrière la fleur ---------- */
function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,225,236,0.95)");
  g.addColorStop(0.4, "rgba(247,160,196,0.45)");
  g.addColorStop(1, "rgba(247,160,196,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlowTexture(),
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  opacity: 0,
}));
glow.scale.set(7, 7, 1);
glow.position.z = -0.6;
flower.add(glow);

/* =========================================================
   4. Pétales qui tombent (ambiance)
   ========================================================= */
const fallingMat = new THREE.MeshStandardMaterial({
  color: 0xf9c9da, roughness: 0.7, side: THREE.DoubleSide,
  transparent: true, opacity: 0.55,
});
const falling = [];
if (!prefersReduced) {
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(petalGeo, fallingMat);
    const s = 0.12 + Math.random() * 0.06;
    m.scale.setScalar(s);
    m.position.set((Math.random() - 0.5) * 11, Math.random() * 9 - 2, (Math.random() - 0.5) * 4 - 1);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    m.userData = {
      vy: 0.006 + Math.random() * 0.01,
      sway: 0.4 + Math.random() * 0.6,
      phase: Math.random() * 6,
      spin: (Math.random() - 0.5) * 0.02,
    };
    scene.add(m);
    falling.push(m);
  }
}

/* =========================================================
   5. Application de l'épanouissement (bloom 0 → 1)
   ========================================================= */
const FOLD_CLOSED = 1.45;   // bouton fermé : pétales repliés vers l'avant
const FOLD_OPEN = -0.08;    // pleinement ouvert : pétales à plat, pointe relevée

function applyBloom(t) {
  // t : progression de l'ouverture (0 = bouton, 1 = fleur ouverte + estompée)
  const fold = lerp(FOLD_CLOSED, FOLD_OPEN, smoothstep(0, 1, t));
  for (const p of pivots) p.rotation.x = fold;

  flower.scale.setScalar(lerp(0.78, 1.28, t));

  // Estompage : la fleur reste pleine puis disparaît dans la 2ᵉ moitié.
  const flowerOpacity = 1 - smoothstep(0.5, 1.0, t);
  petalMaterial.opacity = flowerOpacity;
  stamenMat.opacity = smoothstep(0.25, 0.7, t) * flowerOpacity;

  // Halo : éclat maximal à mi-ouverture.
  glow.material.opacity = Math.sin(clamp(t, 0, 1) * Math.PI) * 0.7;
}

applyBloom(0);

/* Accès d'inspection (vérification — sans effet sur le rendu). */
window.__flower = {
  state: () => ({
    bloom: +bloom.toFixed(3),
    target: +targetBloom.toFixed(3),
    foldDeg: +(pivots[0].rotation.x * 180 / Math.PI).toFixed(1),
    petalOpacity: +petalMaterial.opacity.toFixed(3),
    stamenOpacity: +stamenMat.opacity.toFixed(3),
    glow: +glow.material.opacity.toFixed(3),
    scale: +flower.scale.x.toFixed(3),
  }),
  set: (t) => { targetBloom = bloom = t; applyBloom(t); return window.__flower.state(); },
};

/* =========================================================
   6. Pilotage par le défilement (GSAP ScrollTrigger)
   ========================================================= */
let targetBloom = 0;

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

/* Mouvement réduit : fleur joliment ouverte, sans scrub ni pétales. */
if (prefersReduced) {
  targetBloom = 0.55;
  applyBloom(0.55);
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
}

/* =========================================================
   7. Parallaxe souris + boucle de rendu
   ========================================================= */
const mouse = { x: 0, y: 0 };
if (!isTouch && !prefersReduced) {
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });
}

let bloom = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const elapsed = clock.elapsedTime;

  // Lissage de l'ouverture vers la cible définie par le scroll.
  bloom += (targetBloom - bloom) * Math.min(1, dt * 6);
  applyBloom(bloom);

  if (!prefersReduced) {
    // Respiration et légère rotation de la fleur.
    flower.rotation.z = Math.sin(elapsed * 0.25) * 0.06 + bloom * 0.5;
    flower.position.y = Math.sin(elapsed * 0.7) * 0.04;

    // Parallaxe douce de la caméra.
    camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 0.35 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    // Pétales qui tombent.
    for (const m of falling) {
      const u = m.userData;
      m.position.y -= u.vy * 60 * dt;
      m.position.x += Math.sin(elapsed * u.sway + u.phase) * 0.004;
      m.rotation.x += u.spin;
      m.rotation.z += u.spin * 0.7;
      if (m.position.y < -5) { m.position.y = 6; m.position.x = (Math.random() - 0.5) * 11; }
    }
  }

  renderer.render(scene, camera);
}
animate();

/* =========================================================
   8. Redimensionnement
   ========================================================= */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // On recule la caméra sur écran étroit pour garder la fleur cadrée.
  camera.position.z = w < 760 ? 8.2 : 6.4;
  camera.updateProjectionMatrix();
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
}
window.addEventListener("resize", onResize);
onResize();

/* =========================================================
   9. Divers (nav, année)
   ========================================================= */
window.addEventListener("scroll", () => {
  document.getElementById("nav").classList.toggle("is-scrolled", window.scrollY > 40);
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// GSAP est chargé en "defer" : on attend le chargement complet.
window.addEventListener("load", initScroll);
