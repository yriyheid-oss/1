import * as THREE from 'three';

export const PALETTE = {
  slateDark: '#1D2C31',
  slateMasonry: '#26353B',
  verdigris: '#3F7D70',
  brass: '#8F5E46',
  mist: '#9EB4AD',
  fogTeal: '#1A2E33',
  pipFur: '#C8662B',
  pipDark: '#241915',
  amberChime: '#F4A949',
  dangerBeam: '#FF5733',
  dawnKey: '#FFC98B',
  hemiSky: '#75A3AD',
  hemiGround: '#132024',
} as const;

export interface WorldMaterialSet {
  slateRoof: THREE.MeshStandardMaterial;
  masonryWall: THREE.MeshStandardMaterial;
  verdigrisRoof: THREE.MeshStandardMaterial;
  brassTrim: THREE.MeshStandardMaterial;
  darkIron: THREE.MeshStandardMaterial;
  woodCatwalk: THREE.MeshStandardMaterial;
  windowGlass: THREE.MeshStandardMaterial;
  lanternGlow: THREE.MeshStandardMaterial;
  echoLedge: THREE.MeshStandardMaterial;
  mossFoliage: THREE.MeshStandardMaterial;
  terracottaPot: THREE.MeshStandardMaterial;
  waterSurface: THREE.MeshPhysicalMaterial;
  waterUniforms: {
    uTime: { value: number };
    uWaterQuality: { value: number };
    uEnableGlints: { value: number };
    uRainIntensity: { value: number };
    uSunDir: { value: THREE.Vector3 };
    uSkyReflectTint: { value: THREE.Color };
  };
  causticsUniforms: {
    uTime: { value: number };
    uCausticsStrength: { value: number };
  };
  beamMaterial: THREE.ShaderMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  moteTexture: THREE.CanvasTexture;
  steamTexture: THREE.CanvasTexture;
  dispose: () => void;
}

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves = 4): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * valueNoise(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return v;
}

function createCanvasPair(
  size: number,
  repeatX: number,
  repeatY: number,
  maxAniso: number,
  painter: (
    albedo: CanvasRenderingContext2D,
    bump: CanvasRenderingContext2D,
    rough: CanvasRenderingContext2D,
    size: number
  ) => void
): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const cA = document.createElement('canvas');
  const cB = document.createElement('canvas');
  const cR = document.createElement('canvas');
  cA.width = cB.width = cR.width = size;
  cA.height = cB.height = cR.height = size;

  painter(cA.getContext('2d')!, cB.getContext('2d')!, cR.getContext('2d')!, size);

  const setup = (canvas: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = Math.max(1, Math.min(8, maxAniso));
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  return {
    map: setup(cA, true),
    bumpMap: setup(cB, false),
    roughnessMap: setup(cR, false),
  };
}

function makeContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(8, 15, 18, 0.78)');
  grad.addColorStop(0.55, 'rgba(8, 15, 18, 0.36)');
  grad.addColorStop(1, 'rgba(8, 15, 18, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSoftMoteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 228, 185, 1.0)');
  grad.addColorStop(0.35, 'rgba(244, 169, 73, 0.55)');
  grad.addColorStop(1, 'rgba(244, 169, 73, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSteamWispTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(205, 224, 220, 0.72)');
  grad.addColorStop(0.45, 'rgba(158, 180, 173, 0.34)');
  grad.addColorStop(1, 'rgba(158, 180, 173, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWaterNormalTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const tau = Math.PI * 2;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      // Seamless periodic multi-directional capillary ripples & swells
      const p1 = tau * (u * 2 + v * 1) + 0.4 * Math.sin(tau * (v * 3));
      const p2 = tau * (u * -3 + v * 2) + 0.35 * Math.cos(tau * (u * 2));
      const p3 = tau * (u * 5 + v * 4);
      const p4 = tau * (u * -7 + v * 6);
      const p5 = tau * (u * 11 - v * 9);

      const dx =
        Math.cos(p1) * 0.24 +
        Math.cos(p2) * -0.18 +
        Math.cos(p3) * 0.14 +
        Math.cos(p4) * -0.09 +
        Math.cos(p5) * 0.06;
      const dy =
        Math.cos(p1) * 0.14 +
        Math.cos(p2) * 0.16 +
        Math.cos(p3) * 0.12 +
        Math.cos(p4) * 0.1 +
        Math.cos(p5) * -0.05;

      const nx = -dx * 0.55;
      const ny = -dy * 0.55;
      const nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      const idx = (y * size + x) * 4;
      img.data[idx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
      img.data[idx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
      img.data[idx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  return tex;
}

/**
 * Generates an atmospheric Copper Dawn HDR-like environment cube map using PMREMGenerator
 * so every metallic brass gear, wet slate puddle, and cat eye reflects warm amber dawn + cool teal mist.
 */
export function createDawnEnvironment(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();

  const skyGeo = new THREE.SphereGeometry(20, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 canal = vec3(0.05, 0.11, 0.13);
        vec3 horizon = vec3(0.16, 0.28, 0.30);
        vec3 zenith = vec3(0.04, 0.09, 0.12);
        vec3 col = mix(canal, horizon, smoothstep(0.35, 0.52, h));
        col = mix(col, zenith, smoothstep(0.52, 0.92, h));
        // Warm dawn sun glow in +X +Z +Y direction
        vec3 sunDir = normalize(vec3(0.68, 0.36, 0.63));
        float sunDot = max(0.0, dot(d, sunDir));
        col += vec3(2.8, 1.85, 1.05) * pow(sunDot, 22.0);
        col += vec3(0.95, 0.56, 0.28) * pow(sunDot, 4.0) * 0.65;
        // Cool misty bounce opposite sun
        vec3 fillDir = normalize(vec3(-0.7, 0.25, -0.6));
        float fillDot = max(0.0, dot(d, fillDir));
        col += vec3(0.18, 0.36, 0.40) * pow(fillDot, 3.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skySphere = new THREE.Mesh(skyGeo, skyMat);
  envScene.add(skySphere);

  const envTarget = pmrem.fromScene(envScene, 0.02);
  skyGeo.dispose();
  skyMat.dispose();
  pmrem.dispose();
  return envTarget;
}

export interface SkyDaylightUpdate {
  time: number;
  duskFactor: number;
  horizonColor: THREE.Color;
  midColor: THREE.Color;
  topColor: THREE.Color;
  sunDir: readonly [number, number, number];
  sunGlowColor: THREE.Color;
}

export function createDawnSkyDome(): {
  mesh: THREE.Mesh;
  setEcoMode: (eco: boolean) => void;
  setDaylight: (opts: SkyDaylightUpdate) => void;
  dispose: () => void;
} {
  const geo = new THREE.SphereGeometry(480, 32, 24);
  const uniforms = {
    uEcoMode: { value: 0 },
    uTime: { value: 0 },
    uDuskFactor: { value: 0.14 },
    uHorizonColor: { value: new THREE.Color('#2A484E') },
    uMidColor: { value: new THREE.Color('#203F48') },
    uTopColor: { value: new THREE.Color('#0E1E24') },
    uSunDir: { value: new THREE.Vector3(0.64, 0.30, 0.71).normalize() },
    uSunGlowColor: { value: new THREE.Color('#FFC98B') },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uEcoMode;
      uniform float uTime;
      uniform float uDuskFactor;
      uniform vec3 uHorizonColor;
      uniform vec3 uMidColor;
      uniform vec3 uTopColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunGlowColor;
      varying vec3 vWorldDir;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      void main() {
        vec3 d = normalize(vWorldDir);
        float y = d.y;
        if (uEcoMode > 0.5) {
          vec3 ecoLow = mix(uHorizonColor * 1.45, vec3(0.24, 0.41, 0.47), 0.35);
          vec3 ecoHigh = mix(uMidColor * 1.55, vec3(0.42, 0.58, 0.64), 0.35);
          vec3 ecoSky = mix(ecoLow, ecoHigh, smoothstep(-0.05, 0.55, y));
          gl_FragColor = vec4(ecoSky, 1.0);
          return;
        }

        vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.24, y));
        col = mix(col, uTopColor, smoothstep(0.22, 0.78, y));

        // Dynamic sun glow & disc tracking Dawn -> Noon -> Dusk
        vec3 sunDir = normalize(uSunDir);
        float sunAmt = max(0.0, dot(d, sunDir));
        col += uSunGlowColor * pow(sunAmt, 5.5) * 0.38 * smoothstep(-0.08, 0.28, y);
        col += mix(uSunGlowColor, vec3(1.0, 0.94, 0.80), 0.5) * pow(sunAmt, 42.0) * 0.62;

        // Subtle drifting cloud bands tinted by current sun color
        if (y > 0.02) {
          vec2 uv = d.xz / (y + 0.35) * 1.4 + vec2(uTime * 0.008, uTime * 0.004);
          float c = noise(uv * 2.2) * 0.6 + noise(uv * 5.0) * 0.4;
          float cloudMask = smoothstep(0.46, 0.78, c) * smoothstep(0.02, 0.24, y) * (1.0 - smoothstep(0.45, 0.85, y));
          vec3 cloudCol = mix(uMidColor * 1.35, uSunGlowColor * 0.88, pow(sunAmt, 2.5));
          col = mix(col, cloudCol, cloudMask * 0.42);
        }

        // Crisp twinkling stars emerging smoothly during Dusk
        if (uDuskFactor > 0.08 && y > 0.06) {
          vec2 starGrid = floor((d.xz / (y + 0.45)) * 78.0);
          vec2 starFract = fract((d.xz / (y + 0.45)) * 78.0) - 0.5;
          float rnd = hash(starGrid);
          if (rnd > 0.955) {
            float starDist = length(starFract);
            float twinkle = 0.65 + 0.35 * sin(uTime * (2.0 + fract(rnd * 31.0) * 3.5) + rnd * 40.0);
            float starGlow = smoothstep(0.28, 0.02, starDist) * twinkle;
            float horizonMask = smoothstep(0.06, 0.34, y);
            col += vec3(0.88, 0.92, 1.0) * starGlow * uDuskFactor * horizonMask * 0.85;
          }
        }

        // Seamless blend to horizon/fog color below horizon
        col = mix(uHorizonColor, col, smoothstep(-0.04, 0.12, y));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  return {
    mesh,
    setEcoMode: (eco: boolean) => {
      uniforms.uEcoMode.value = eco ? 1 : 0;
    },
    setDaylight: (opts: SkyDaylightUpdate) => {
      uniforms.uTime.value = opts.time;
      uniforms.uDuskFactor.value = opts.duskFactor;
      uniforms.uHorizonColor.value.copy(opts.horizonColor);
      uniforms.uMidColor.value.copy(opts.midColor);
      uniforms.uTopColor.value.copy(opts.topColor);
      uniforms.uSunDir.value.set(opts.sunDir[0], opts.sunDir[1], opts.sunDir[2]).normalize();
      uniforms.uSunGlowColor.value.copy(opts.sunGlowColor);
    },
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}

export function createWorldMaterials(renderer: THREE.WebGLRenderer): WorldMaterialSet {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const textures: THREE.Texture[] = [];

  // 1. Wet Venetian Slate Roof Tiles (with rain puddles in roughnessMap + stone relief in bumpMap)
  const slateMaps = createCanvasPair(512, 2.5, 2.5, maxAniso, (ctxA, ctxB, ctxR, s) => {
    ctxA.fillStyle = '#19262B';
    ctxA.fillRect(0, 0, s, s);
    ctxB.fillStyle = '#202020';
    ctxB.fillRect(0, 0, s, s);
    ctxR.fillStyle = '#9E9E9E';
    ctxR.fillRect(0, 0, s, s);

    const rows = 10;
    const cols = 6;
    const h = s / rows;
    const w = s / cols;

    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (w * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * w + off;
        const y = r * h;
        const n = hash2(c + 19, r + 7);
        const baseR = Math.round(28 + n * 16);
        const baseG = Math.round(44 + n * 18);
        const baseB = Math.round(50 + n * 18);
        ctxA.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
        ctxA.fillRect(x + 2, y + 2, w - 4, h - 4);

        // Chipped slate edge highlight
        ctxA.fillStyle = 'rgba(158, 180, 173, 0.11)';
        ctxA.fillRect(x + 3, y + 2, w - 6, 3);

        // Tile height for bump
        const bVal = Math.round(145 + n * 65);
        ctxB.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
        ctxB.fillRect(x + 3, y + 3, w - 6, h - 6);

        // Per-tile dampness variation
        const rVal = Math.round(105 + n * 75);
        ctxR.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
        ctxR.fillRect(x + 2, y + 2, w - 4, h - 4);
      }
    }

    // Rainwater puddles & subtle moss streaks across tiles
    const imgA = ctxA.getImageData(0, 0, s, s);
    const imgR = ctxR.getImageData(0, 0, s, s);
    for (let py = 0; py < s; py += 2) {
      for (let px = 0; px < s; px += 2) {
        const wet = fbm(px / 72, py / 72, 3);
        const grain = hash2(px, py) * 14 - 7;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const idx = ((py + dy) * s + (px + dx)) * 4;
            if (wet > 0.57) {
              // Glossy puddle: slightly darker albedo, very low roughness (18..40)
              imgA.data[idx] = Math.max(10, imgA.data[idx] * 0.76);
              imgA.data[idx + 1] = Math.max(15, imgA.data[idx + 1] * 0.8);
              imgA.data[idx + 2] = Math.max(18, imgA.data[idx + 2] * 0.84);
              const gloss = Math.round(16 + (1 - wet) * 50);
              imgR.data[idx] = imgR.data[idx + 1] = imgR.data[idx + 2] = gloss;
            } else {
              imgA.data[idx] = Math.min(255, Math.max(0, imgA.data[idx] + grain));
              imgA.data[idx + 1] = Math.min(255, Math.max(0, imgA.data[idx + 1] + grain));
              imgA.data[idx + 2] = Math.min(255, Math.max(0, imgA.data[idx + 2] + grain));
            }
          }
        }
      }
    }
    ctxA.putImageData(imgA, 0, 0);
    ctxR.putImageData(imgR, 0, 0);
  });
  textures.push(slateMaps.map, slateMaps.bumpMap, slateMaps.roughnessMap);

  // 2. Patina Oxidized Verdigris Standing-Seam Copper
  const copperMaps = createCanvasPair(512, 2, 2, maxAniso, (ctxA, ctxB, ctxR, s) => {
    ctxA.fillStyle = '#387266';
    ctxA.fillRect(0, 0, s, s);
    ctxB.fillStyle = '#888888';
    ctxB.fillRect(0, 0, s, s);
    ctxR.fillStyle = '#A8A8A8';
    ctxR.fillRect(0, 0, s, s);

    const panels = 8;
    const pw = s / panels;
    for (let i = 0; i < panels; i++) {
      const x = i * pw;
      const n = hash2(i, 3);
      ctxA.fillStyle = `rgb(${Math.round(52 + n * 16)}, ${Math.round(112 + n * 20)}, ${Math.round(100 + n * 16)})`;
      ctxA.fillRect(x, 0, pw - 5, s);

      // Tarnished copper edge streak near batten seam
      ctxA.fillStyle = 'rgba(130, 86, 62, 0.35)';
      ctxA.fillRect(x + pw - 9, 0, 4, s);

      // Raised standing seam rib in bump + lower roughness on exposed bronze edge
      ctxA.fillStyle = '#254C44';
      ctxA.fillRect(x + pw - 5, 0, 5, s);
      ctxB.fillStyle = '#FFFFFF';
      ctxB.fillRect(x + pw - 5, 0, 4, s);
      ctxR.fillStyle = '#626262';
      ctxR.fillRect(x + pw - 5, 0, 5, s);

      // Horizontal lock seam + rivets
      ctxA.fillStyle = 'rgba(26, 48, 44, 0.45)';
      ctxA.fillRect(x, s * 0.5 - 2, pw, 3);
      ctxB.fillStyle = '#C8C8C8';
      ctxB.fillRect(x, s * 0.5 - 2, pw, 3);

      for (let r = 0; r < 6; r++) {
        const ry = (r + 0.5) * (s / 6);
        ctxA.fillStyle = '#6E4C3B';
        ctxA.beginPath();
        ctxA.arc(x + pw - 9, ry, 2.5, 0, Math.PI * 2);
        ctxA.fill();
        ctxB.fillStyle = '#F0F0F0';
        ctxB.beginPath();
        ctxB.arc(x + pw - 9, ry, 2.5, 0, Math.PI * 2);
        ctxB.fill();
      }
    }

    // Subtle rain patina streaks
    for (let k = 0; k < 120; k++) {
      const sx = hash2(k, 11) * s;
      const sy = hash2(k, 23) * s;
      const len = 30 + hash2(k, 31) * 70;
      ctxA.fillStyle = k % 3 === 0 ? 'rgba(158, 190, 178, 0.08)' : 'rgba(25, 45, 42, 0.09)';
      ctxA.fillRect(sx, sy, 3, len);
    }
  });
  textures.push(copperMaps.map, copperMaps.bumpMap, copperMaps.roughnessMap);

  // 3. Weathered Venetian Stone & Brick Masonry
  const masonryMaps = createCanvasPair(512, 2, 2, maxAniso, (ctxA, ctxB, ctxR, s) => {
    ctxA.fillStyle = '#1E2A2F';
    ctxA.fillRect(0, 0, s, s);
    ctxB.fillStyle = '#2A2A2A';
    ctxB.fillRect(0, 0, s, s);
    ctxR.fillStyle = '#D8D8D8';
    ctxR.fillRect(0, 0, s, s);

    const rows = 12;
    const cols = 6;
    const h = s / rows;
    const w = s / cols;

    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (w * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * w + off;
        const y = r * h;
        const n = hash2(c * 3 + 5, r * 7 + 11);
        const tone = Math.round(n * 24 - 12);
        const warmShift = n > 0.68 ? 10 : 0;
        ctxA.fillStyle = `rgb(${44 + tone + warmShift}, ${56 + tone}, ${62 + tone})`;
        ctxA.fillRect(x + 3, y + 3, w - 6, h - 6);

        const b = Math.round(135 + n * 75);
        ctxB.fillStyle = `rgb(${b},${b},${b})`;
        ctxB.fillRect(x + 3, y + 3, w - 6, h - 6);

        const rv = Math.round(170 + n * 65);
        ctxR.fillStyle = `rgb(${rv},${rv},${rv})`;
        ctxR.fillRect(x + 3, y + 3, w - 6, h - 6);
      }
    }

    // Damp waterline moss & dark moisture near lower masonry
    const mossGrad = ctxA.createLinearGradient(0, s * 0.55, 0, s);
    mossGrad.addColorStop(0, 'rgba(30, 56, 48, 0)');
    mossGrad.addColorStop(0.6, 'rgba(32, 66, 54, 0.38)');
    mossGrad.addColorStop(1, 'rgba(18, 36, 32, 0.72)');
    ctxA.fillStyle = mossGrad;
    ctxA.fillRect(0, 0, s, s);

    const wetGrad = ctxR.createLinearGradient(0, s * 0.6, 0, s);
    wetGrad.addColorStop(0, 'rgba(40,40,40,0)');
    wetGrad.addColorStop(1, 'rgba(40,40,40,0.65)');
    ctxR.fillStyle = wetGrad;
    ctxR.fillRect(0, 0, s, s);
  });
  textures.push(masonryMaps.map, masonryMaps.bumpMap, masonryMaps.roughnessMap);

  // 4. Aged Timber Planks
  const woodMaps = createCanvasPair(512, 1, 3, maxAniso, (ctxA, ctxB, ctxR, s) => {
    ctxA.fillStyle = '#553A2C';
    ctxA.fillRect(0, 0, s, s);
    ctxB.fillStyle = '#606060';
    ctxB.fillRect(0, 0, s, s);
    ctxR.fillStyle = '#C8C8C8';
    ctxR.fillRect(0, 0, s, s);

    const planks = 6;
    const pw = s / planks;
    for (let p = 0; p < planks; p++) {
      const x = p * pw;
      const n = hash2(p, 19);
      ctxA.fillStyle = `rgb(${Math.round(86 + n * 24)}, ${Math.round(58 + n * 16)}, ${Math.round(44 + n * 12)})`;
      ctxA.fillRect(x + 2, 0, pw - 4, s);

      for (let g = 0; g < 26; g++) {
        const gx = x + 4 + hash2(p * 17 + g, 5) * (pw - 8);
        ctxA.fillStyle = g % 2 === 0 ? 'rgba(34, 22, 16, 0.25)' : 'rgba(145, 108, 84, 0.16)';
        ctxA.fillRect(gx, 0, 2, s);
        ctxB.fillStyle = g % 2 === 0 ? '#909090' : '#D0D0D0';
        ctxB.fillRect(gx, 0, 2, s);
      }

      // Plank dark gap
      ctxA.fillStyle = '#1D1410';
      ctxA.fillRect(x, 0, 3, s);
      ctxB.fillStyle = '#181818';
      ctxB.fillRect(x, 0, 3, s);
    }
  });
  textures.push(woodMaps.map, woodMaps.bumpMap, woodMaps.roughnessMap);

  // 5. Brushed Horological Brass (soft warm satin sheen with subtle patina)
  const brassMaps = createCanvasPair(256, 1, 1, maxAniso, (ctxA, ctxB, ctxR, s) => {
    ctxA.fillStyle = '#966345';
    ctxA.fillRect(0, 0, s, s);
    ctxB.fillStyle = '#808080';
    ctxB.fillRect(0, 0, s, s);
    ctxR.fillStyle = '#585858';
    ctxR.fillRect(0, 0, s, s);

    for (let i = 0; i < 160; i++) {
      const y = (i / 160) * s;
      const n = hash2(i, 9);
      ctxA.fillStyle = n > 0.5 ? 'rgba(225, 175, 124, 0.045)' : 'rgba(65, 38, 24, 0.05)';
      ctxA.fillRect(0, y, s, 1.5);
      const b = Math.round(122 + n * 18);
      ctxB.fillStyle = `rgb(${b},${b},${b})`;
      ctxB.fillRect(0, y, s, 1.5);
      const r = Math.round(72 + n * 38);
      ctxR.fillStyle = `rgb(${r},${r},${r})`;
      ctxR.fillRect(0, y, s, 1.5);
    }

    for (let p = 0; p < 48; p++) {
      const px = hash2(p, 31) * s;
      const py = hash2(p, 47) * s;
      ctxA.fillStyle = p % 2 === 0 ? 'rgba(54, 96, 84, 0.09)' : 'rgba(42, 24, 16, 0.08)';
      ctxA.fillRect(px, py, 6, 42);
    }
  });
  textures.push(brassMaps.map, brassMaps.bumpMap, brassMaps.roughnessMap);

  const contactTex = makeContactShadowTexture();
  const moteTexture = makeSoftMoteTexture();
  const steamTexture = makeSteamWispTexture();
  const waterNormalTex = makeWaterNormalTexture(256);
  waterNormalTex.anisotropy = Math.max(1, Math.min(8, maxAniso));
  textures.push(contactTex, moteTexture, steamTexture, waterNormalTex);

  const slateRoof = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: slateMaps.map,
    bumpMap: slateMaps.bumpMap,
    bumpScale: 0.035,
    roughnessMap: slateMaps.roughnessMap,
    roughness: 0.92,
    metalness: 0.14,
  });

  const masonryWall = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: masonryMaps.map,
    bumpMap: masonryMaps.bumpMap,
    bumpScale: 0.045,
    roughnessMap: masonryMaps.roughnessMap,
    roughness: 0.95,
    metalness: 0.05,
  });

  const verdigrisRoof = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: copperMaps.map,
    bumpMap: copperMaps.bumpMap,
    bumpScale: 0.035,
    roughnessMap: copperMaps.roughnessMap,
    roughness: 0.85,
    metalness: 0.34,
  });

  const brassTrim = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: brassMaps.map,
    bumpMap: brassMaps.bumpMap,
    bumpScale: 0.015,
    roughnessMap: brassMaps.roughnessMap,
    roughness: 0.65,
    metalness: 0.88,
  });

  const darkIron = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#20262A'),
    bumpMap: brassMaps.bumpMap,
    bumpScale: 0.012,
    roughness: 0.44,
    metalness: 0.78,
  });

  const woodCatwalk = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: woodMaps.map,
    bumpMap: woodMaps.bumpMap,
    bumpScale: 0.03,
    roughnessMap: woodMaps.roughnessMap,
    roughness: 0.9,
    metalness: 0.04,
  });

  const windowGlass = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFD9A0'),
    emissive: new THREE.Color('#F4A949'),
    emissiveIntensity: 1.15,
    roughness: 0.18,
    metalness: 0.25,
  });

  const lanternGlow = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFE5B4'),
    emissive: new THREE.Color('#F4A949'),
    emissiveIntensity: 2.1,
    roughness: 0.12,
    metalness: 0.08,
  });

  const echoLedge = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.amberChime),
    emissive: new THREE.Color(PALETTE.amberChime),
    emissiveIntensity: 0.95,
    transparent: true,
    opacity: 0.78,
    roughness: 0.25,
    metalness: 0.4,
  });

  const mossFoliage = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#274E3E'),
    roughness: 0.88,
    metalness: 0.02,
    bumpMap: masonryMaps.bumpMap,
    bumpScale: 0.025,
  });

  const terracottaPot = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8A4733'),
    roughness: 0.84,
    metalness: 0.04,
    bumpMap: masonryMaps.bumpMap,
    bumpScale: 0.018,
  });

  const causticsUniforms = {
    uTime: { value: 0 },
    uCausticsStrength: { value: 1.0 },
  };

  function applyWaterCausticsAndWetEdge(mat: THREE.MeshStandardMaterial): void {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCausticTime = causticsUniforms.uTime;
      shader.uniforms.uCausticsStrength = causticsUniforms.uCausticsStrength;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vCausticWorldPos;`
        )
        .replace(
          '#include <worldpos_vertex>',
          `#include <worldpos_vertex>
          vCausticWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uCausticTime;
          uniform float uCausticsStrength;
          varying vec3 vCausticWorldPos;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float wetBand = step(-0.25, vCausticWorldPos.y) * (1.0 - smoothstep(0.05, 1.02, vCausticWorldPos.y));
          diffuseColor.rgb *= mix(1.0, 0.56, wetBand * (0.45 + 0.55 * uCausticsStrength));`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          float wetRoughMask = step(-0.25, vCausticWorldPos.y) * (1.0 - smoothstep(0.05, 0.98, vCausticWorldPos.y));
          roughnessFactor = mix(roughnessFactor, 0.16, wetRoughMask * 0.85);`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          if (uCausticsStrength > 0.05) {
            float cMask = smoothstep(-0.15, 0.10, vCausticWorldPos.y) * (1.0 - smoothstep(0.32, 1.45, vCausticWorldPos.y));
            if (cMask > 0.01) {
              vec2 cw = vCausticWorldPos.xz * 2.15 + vec2(vCausticWorldPos.y * 1.35, -vCausticWorldPos.y * 1.15);
              float w1 = sin(cw.x * 2.6 + uCausticTime * 1.9 + sin(cw.y * 2.2 - uCausticTime * 1.4));
              float w2 = cos(cw.y * 2.9 - uCausticTime * 1.6 + cos(cw.x * 2.4 + uCausticTime * 1.3));
              float web = pow(clamp((w1 * w2) * 0.5 + 0.5, 0.0, 1.0), 4.0);
              totalEmissiveRadiance += vec3(0.18, 0.48, 0.42) * web * cMask * uCausticsStrength * 0.65;
            }
          }`
        );
    };
  }

  applyWaterCausticsAndWetEdge(masonryWall);
  applyWaterCausticsAndWetEdge(woodCatwalk);
  applyWaterCausticsAndWetEdge(terracottaPot);

  // Realistic Venetian Canal Water: normal-mapped ripples, Fresnel sky/dawn reflection, city light shimmers & rain splashes
  const waterUniforms = {
    uTime: { value: 0 },
    uWaterQuality: { value: 2 },
    uEnableGlints: { value: 1 },
    uRainIntensity: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.62, 0.28, 0.65).normalize() },
    uSkyReflectTint: { value: new THREE.Color('#1B4249') },
  };
  const waterSurface = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0C282D'),
    roughness: 0.09,
    metalness: 0.05,
    normalMap: waterNormalTex,
    normalScale: new THREE.Vector2(0.55, 0.55),
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    clearcoatNormalMap: waterNormalTex,
    clearcoatNormalScale: new THREE.Vector2(0.55, 0.55),
    envMapIntensity: 1.15,
  });

  waterSurface.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.uniforms.uWaterQuality = waterUniforms.uWaterQuality;
    shader.uniforms.uEnableGlints = waterUniforms.uEnableGlints;
    shader.uniforms.uRainIntensity = waterUniforms.uRainIntensity;
    shader.uniforms.uSunDir = waterUniforms.uSunDir;
    shader.uniforms.uSkyReflectTint = waterUniforms.uSkyReflectTint;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uWaterQuality;
        varying vec3 vWaterWorldPos;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        if (uWaterQuality >= 1.5) {
          float swell = sin(position.x * 0.52 + uTime * 1.1) * 0.022 + cos(position.y * 0.68 - uTime * 0.9) * 0.018;
          transformed.z += swell;
        }`
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uWaterQuality;
        uniform float uEnableGlints;
        uniform float uRainIntensity;
        uniform vec3 uSunDir;
        uniform vec3 uSkyReflectTint;
        varying vec3 vWaterWorldPos;

        float canalHash21(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float rainRingSample(vec2 uv, float t, float speedScale) {
          vec2 cell = floor(uv);
          vec2 f = fract(uv);
          float seed = canalHash21(cell);
          float seed2 = canalHash21(cell + vec2(19.3, 47.1));
          float activeCell = step(0.45, canalHash21(cell + vec2(7.1, 91.7)));
          vec2 center = vec2(0.24 + seed * 0.52, 0.24 + seed2 * 0.52);
          float age = fract(t * speedScale + seed * 4.37);
          float dist = length(f - center);
          float radius = age * 0.24;
          float band = exp(-pow((dist - radius) * 58.0, 2.0));
          float env = smoothstep(0.0, 0.10, age) * pow(1.0 - age, 1.8);
          return band * env * activeCell;
        }

        float rainRipplePattern(vec2 wp, float t) {
          float rA = rainRingSample(wp * 2.1, t, 1.55);
          float rB = rainRingSample(wp * 3.2 + vec2(4.7, 9.2), t, 1.95);
          return clamp(rA + rB * 0.8, 0.0, 1.0);
        }

        float canalBoxDist(vec2 p, vec2 bMin, vec2 bMax) {
          vec2 c = (bMin + bMax) * 0.5;
          vec2 h = (bMax - bMin) * 0.5;
          vec2 d = abs(p - c) - h;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }

        vec3 canalWaveNormal(vec2 wp, float t) {
          float p1 = wp.x * 1.35 + wp.y * 0.65 + t * 1.15;
          float p2 = wp.y * 1.95 - wp.x * 0.95 - t * 0.95;
          float p3 = (wp.x + wp.y) * 3.4 - t * 1.85;
          float p4 = (wp.x - wp.y) * 5.2 + t * 2.25;
          float p5 = wp.x * 8.4 - wp.y * 7.1 + t * 2.9;
          float dHx = cos(p1) * 0.16 - sin(p2) * 0.11 + cos(p3) * 0.08 + cos(p4) * 0.055 + cos(p5) * 0.032;
          float dHz = cos(p1) * 0.09 + sin(p2) * 0.15 + cos(p3) * 0.08 - cos(p4) * 0.055 - cos(p5) * 0.028;
          return normalize(vec3(-dHx, 1.0, -dHz));
        }`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        if (uWaterQuality >= 1.5) {
          vec3 wWave = canalWaveNormal(vWaterWorldPos.xz, uTime);
          vec3 rippleView = normalize((viewMatrix * vec4(wWave, 0.0)).xyz);
          normal = normalize(mix(normal, rippleView, 0.72));
        }`
      )
      .replace(
        '#include <clearcoat_normal_fragment_maps>',
        `#include <clearcoat_normal_fragment_maps>
        clearcoatNormal = normal;`
      )
      .replace(
        '#include <opaque_fragment>',
        `
        if (uWaterQuality < 0.5) {
          // Low (Eco): bright legible Venetian canal teal surface, zero heavy shader waves/glints
          outgoingLight = vec3(0.068, 0.165, 0.178);
        } else if (uWaterQuality < 1.5 || uEnableGlints < 0.5) {
          // Medium: bright Venetian canal jade with optional raindrop splash rings
          vec2 wp = vWaterWorldPos.xz;
          float streamM = sin(wp.x * 0.55 + wp.y * 0.45) * 0.5 + 0.5;
          vec3 baseCol = mix(vec3(0.042, 0.108, 0.118), mix(vec3(0.105, 0.165, 0.148), uSkyReflectTint * 0.45, 0.35), streamM * 0.6);
          if (uRainIntensity > 0.02) {
            float rSplash = rainRipplePattern(wp, uTime) * uRainIntensity;
            baseCol += vec3(0.32, 0.46, 0.48) * rSplash * 0.55;
          }
          outgoingLight = mix(outgoingLight * 0.45 + baseCol, baseCol, 0.78);
        } else {
          vec3 wN = canalWaveNormal(vWaterWorldPos.xz, uTime);
          float rainSparkle = 0.0;
          if (uRainIntensity > 0.02) {
            rainSparkle = rainRipplePattern(vWaterWorldPos.xz, uTime) * uRainIntensity;
            wN = normalize(wN + vec3((rainSparkle - 0.15) * 0.22, 0.0, (rainSparkle - 0.15) * 0.18));
          }
          vec3 viewDirW = normalize(cameraPosition - vWaterWorldPos);
          vec3 reflDir = reflect(-viewDirW, wN);
          float ndotv = clamp(dot(wN, viewDirW), 0.0, 1.0);
          float fresnel = 0.04 + 0.88 * pow(1.0 - ndotv, 4.2);

          // Deep dark Venetian canal jade-teal in linear RGB (so sRGB gamma stays rich & moody, never milky)
          float waveShading = clamp(wN.x * 1.8 + wN.z * 1.4, -0.45, 0.45) * 0.5 + 0.5;
          float stream = sin(vWaterWorldPos.x * 0.95 + vWaterWorldPos.z * 0.55 + uTime * 0.75) * 0.5 + 0.5;
          vec3 deepWater = mix(vec3(0.004, 0.019, 0.024), vec3(0.011, 0.042, 0.048), stream * 0.65 + waveShading * 0.35);

          // Time-of-Day sky + sun reflections broken across wave facets
          vec3 sunDir = normalize(uSunDir);
          float sunRefl = max(0.0, dot(reflDir, sunDir));
          vec3 skyBaseRefl = mix(vec3(0.012, 0.036, 0.044), uSkyReflectTint * 0.35, 0.65);
          vec3 skyRefl = mix(skyBaseRefl, vec3(0.11, 0.072, 0.046), pow(sunRefl, 3.0) * 0.72);
          skyRefl += vec3(0.55, 0.34, 0.16) * pow(sunRefl, 88.0) * 0.95;
          skyRefl += vec3(0.18, 0.11, 0.06) * pow(sunRefl, 18.0) * 0.32;
          skyRefl *= (0.65 + 0.70 * waveShading);

          // Subtle warm reflections of flooded windows & lanterns distorted by wave slopes
          vec2 wp = vWaterWorldPos.xz;
          float ripShift = wN.x * 3.2 + wN.z * 1.8;
          float winBandL = exp(-pow((wp.x + 6.4 + ripShift * 0.5) * 0.72, 2.0));
          float winBandR = exp(-pow((wp.x - 6.4 + ripShift * 0.5) * 0.72, 2.0));
          float winGrid = 0.5 + 0.5 * sin((wp.y + ripShift * 0.7) * 1.75);
          float winShimmer = (winBandL + winBandR) * smoothstep(0.45, 0.96, winGrid) * (0.25 + 0.75 * fresnel);

          float skiffGlowA = exp(-length(wp - vec2(5.4 + ripShift * 0.35, -1.6)) * 0.75);
          float skiffGlowB = exp(-length(wp - vec2(-5.6 + ripShift * 0.35, -9.2)) * 0.75);
          vec3 lanternShimmer = vec3(0.52, 0.28, 0.10) * (winShimmer * 0.24 + (skiffGlowA + skiffGlowB) * 0.26);

          // Shoreline proximity to buildings, stone quays, market piers, dam wall & skiffs
          float dStart = canalBoxDist(wp, vec2(-3.35, -3.35), vec2(3.35, 3.35));
          float dBelfry = canalBoxDist(wp, vec2(-3.55, -13.75), vec2(3.55, -7.25));
          float dPerch = canalBoxDist(wp, vec2(-2.35, -18.35), vec2(2.35, -14.65));
          float dQuayL = canalBoxDist(wp, vec2(-10.3, -48.1), vec2(-6.9, 24.1));
          float dQuayR = canalBoxDist(wp, vec2(6.9, -48.1), vec2(10.3, 24.1));
          float dPierE = canalBoxDist(wp, vec2(10.2, 5.6), vec2(22.8, 17.6));
          float dPierW = canalBoxDist(wp, vec2(-22.8, 5.6), vec2(-10.2, 17.6));
          float dQuays = min(min(dQuayL, dQuayR), min(dPierE, dPierW));
          float dDam = max(0.0, wp.y + 24.4);
          float dSkiffA = canalBoxDist(wp, vec2(4.9, -5.4), vec2(5.9, -2.2));
          float dSkiffB = canalBoxDist(wp, vec2(-6.1, -13.0), vec2(-5.1, -9.8));
          float shoreDist = min(min(min(dStart, dBelfry), min(dPerch, dDam)), min(dQuays, min(dSkiffA, dSkiffB)));

          // Wet stone darkening right at the wall base + delicate broken meniscus ripple
          float contactAO = smoothstep(0.0, 0.7, shoreDist);
          vec3 waterCol = mix(deepWater * (0.42 + 0.58 * contactAO), skyRefl * (0.52 + 0.48 * contactAO), fresnel);
          waterCol += lanternShimmer;

          // Raindrop delicate glinting splash rings
          waterCol += vec3(0.28, 0.44, 0.48) * rainSparkle * 0.24;

          float foamNoise = sin(wp.x * 6.8 + wp.y * 5.9 + uTime * 2.1) * 0.5 + cos(wp.x * 11.4 - wp.y * 9.2 - uTime * 1.7) * 0.5;
          float shoreBand = 1.0 - smoothstep(0.01, 0.24, shoreDist);
          float lapWave = smoothstep(0.45, 0.92, sin(shoreDist * 28.0 - uTime * 2.4 + foamNoise * 3.0) * 0.5 + 0.5);
          float edgeThin = 1.0 - smoothstep(0.0, 0.06, shoreDist);
          float foamMask = clamp((shoreBand * lapWave * 0.24 + edgeThin * 0.16) * (0.55 + 0.45 * foamNoise), 0.0, 0.26);
          waterCol = mix(waterCol, vec3(0.14, 0.22, 0.23), foamMask);

          outgoingLight = mix(outgoingLight * 0.25 + waterCol, waterCol, 0.88);
        }
        #include <opaque_fragment>
        `
      );
  };

  // Soft volumetric light-cone halo material
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#FFD18F') },
      uOpacity: { value: 0.14 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNorm;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vNorm = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNorm;
      varying vec3 vViewDir;
      void main() {
        float edgeFade = pow(abs(dot(normalize(vNorm), normalize(vViewDir))), 1.8);
        float vertFade = smoothstep(0.0, 0.35, vUv.y) * pow(vUv.y, 1.2);
        float alpha = edgeFade * vertFade * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });

  const contactShadow = new THREE.MeshBasicMaterial({
    map: contactTex,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });

  const allMaterials: THREE.Material[] = [
    slateRoof,
    masonryWall,
    verdigrisRoof,
    brassTrim,
    darkIron,
    woodCatwalk,
    windowGlass,
    lanternGlow,
    echoLedge,
    mossFoliage,
    terracottaPot,
    waterSurface,
    beamMaterial,
    contactShadow,
  ];

  return {
    slateRoof,
    masonryWall,
    verdigrisRoof,
    brassTrim,
    darkIron,
    woodCatwalk,
    windowGlass,
    lanternGlow,
    echoLedge,
    mossFoliage,
    terracottaPot,
    waterSurface,
    waterUniforms,
    causticsUniforms,
    beamMaterial,
    contactShadow,
    moteTexture,
    steamTexture,
    dispose: () => {
      for (const m of allMaterials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
