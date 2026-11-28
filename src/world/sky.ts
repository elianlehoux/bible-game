import * as THREE from 'three';

/** Sol bajo del oeste: luz de tarde que ilumina a Goliat de frente cuando David lo mira. */
export const SUN = new THREE.Vector3(-0.62, 0.36, 0.42).normalize();

export interface SunRig { place(x: number, z: number): void }

/** Hora del día de cada mapa: dirección del sol y colores del cielo. */
export interface SkyOpts {
  sun?: THREE.Vector3;
  top?: string;
  mid?: string;
  horizon?: string;
  fog?: string;
  sunColor?: string;
  light?: number;
}

/** Mañana temprano: sol bajo del este y cielo más frío. */
export const MANANA: SkyOpts = { sun: new THREE.Vector3(0.55, 0.32, -0.6).normalize(), top: '#4f86c6', mid: '#bcd3e2', horizon: '#f5dcb6', fog: '#e6dccb', sunColor: '#fff1d6', light: 1.55 };
/** Atardecer: sol casi en el horizonte y luz anaranjada. */
export const ATARDECER: SkyOpts = { sun: new THREE.Vector3(-0.7, 0.22, 0.35).normalize(), top: '#4a6fa5', mid: '#d6b7a0', horizon: '#f2a865', fog: '#e3b98d', sunColor: '#ffc98a', light: 1.5 };

export function createSky(scene: THREE.Scene, lowEnd: boolean, o: SkyOpts = {}): SunRig {
  const SUN_DIR = o.sun ?? SUN;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(500, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(o.top ?? '#5d8cc0') },
        mid: { value: new THREE.Color(o.mid ?? '#b9cfdc') },
        hor: { value: new THREE.Color(o.horizon ?? '#f3cf98') },
        sunDir: { value: SUN_DIR },
        sunCol: { value: new THREE.Color(o.sunColor ?? '#fff0cc') },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP;
void main(){
  float y = vP.y;
  vec3 c = mix(hor, mid, smoothstep(0.0, 0.2, y));
  c = mix(c, top, smoothstep(0.2, 0.75, y));
  float s = max(dot(normalize(vP), sunDir), 0.0);
  c += sunCol * (pow(s, 900.0) * 2.0 + pow(s, 14.0) * 0.28);
  c = mix(hor * 0.95, c, smoothstep(-0.08, 0.02, y));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
    }),
  );
  scene.add(sky);
  scene.fog = new THREE.Fog(o.fog ?? '#e8cfa2', 75, 270);

  // three.js usa unidades físicas: las intensidades van multiplicadas por π respecto del prototipo.
  scene.add(new THREE.HemisphereLight('#cfe0ef', '#7d6c46', 0.62 * Math.PI));
  const sun = new THREE.DirectionalLight(o.sunColor ?? '#ffdcaa', (o.light ?? 1.7) * Math.PI);
  sun.castShadow = true;
  const size = lowEnd ? 1024 : 2048;
  sun.shadow.mapSize.set(size, size);
  Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 180 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  return {
    // La sombra sigue al jugador para gastar el mapa de sombras solo donde se ve.
    place(x, z) {
      sun.position.set(x + SUN_DIR.x * 90, SUN_DIR.y * 90, z + SUN_DIR.z * 90);
      sun.target.position.set(x, 0, z);
    },
  };
}
