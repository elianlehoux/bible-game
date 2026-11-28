import '@fontsource/figtree/400.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/marcellus/400.css';
import './styles.css';
import * as THREE from 'three';
import { createTerrain, createWater } from './world/terrain';
import { createSky } from './world/sky';
import { createProps } from './world/props';
import { Game } from './game/game';

const $ = (id: string) => document.getElementById(id)!;

function fail(msg: string): void {
  $('title').hidden = true;
  const f = $('fail');
  f.hidden = false;
  f.querySelector('p')!.textContent = msg;
}

function createRenderer(): THREE.WebGLRenderer | null {
  try {
    return new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
}

function main(): void {
  const stage = $('stage');
  const renderer = createRenderer();
  if (!renderer) return fail('Este navegador no tiene WebGL activado, y el juego lo necesita.');

  const lowEnd = Math.min(screen.width, screen.height) < 500 || (navigator.hardwareConcurrency ?? 8) <= 4;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.6 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  stage.prepend(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    fail('El teléfono liberó la memoria gráfica. Recarga la página para seguir jugando.');
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.85 ? 64 : 50; // más ángulo con el teléfono en vertical
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  createTerrain(scene);
  const water = createWater(scene);
  const sun = createSky(scene, lowEnd);
  const props = createProps(scene, lowEnd);
  const game = new Game(scene, camera, stage, { props, water, sun });

  const play = $('playBtn') as HTMLButtonElement;
  play.disabled = false;
  play.textContent = 'Jugar';
  play.addEventListener('click', () => {
    $('title').hidden = true;
    game.start();
  });
  $('againBtn').addEventListener('click', () => game.restart());

  const fs = $('fsBtn') as HTMLButtonElement;
  if (stage.requestFullscreen) {
    fs.hidden = false;
    fs.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else stage.requestFullscreen().catch(() => {});
    });
  }

  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as { __game: ReturnType<Game['debugApi']> }).__game = game.debugApi();
  }

  // Calidad adaptativa: si en los primeros segundos de juego va lento, baja la resolución.
  let perfT = 0, perfFrames = 0, perfDone = false;
  let last = performance.now();
  const loop = (now: number) => {
    const rdt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(rdt * game.timeScale, rdt);
    renderer.render(scene, camera);
    if (!perfDone && game.mode === 'explore') {
      perfT += rdt;
      perfFrames++;
      if (perfT > 4) {
        perfDone = true;
        if (perfFrames / perfT < 40 && renderer.getPixelRatio() > 1) {
          renderer.setPixelRatio(1);
          resize();
        }
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------- App instalable (PWA) ----------

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function setupInstall(): void {
  const btn = $('installBtn') as HTMLButtonElement;
  let deferred: BeforeInstallPromptEvent | null = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    btn.hidden = false;
  });
  btn.addEventListener('click', async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    btn.hidden = true;
  });
  // iPhone y iPad no avisan: se agrega desde Compartir → Agregar a inicio.
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone) $('iosHint').hidden = false;

  if (import.meta.env.PROD && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* sin modo offline */ });
  }
}

setupInstall();
main();
