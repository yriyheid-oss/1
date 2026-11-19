import * as THREE from 'three';
import type { CatState } from '../systems/parkour';
import { computeFelinePose, easeOutQuad } from '../systems/felineKinematics';
import { CAT_BREED_SPECS, type CatBreedId } from '../data/tuning';

export interface CatRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  chestGroup: THREE.Group;
  headGroup: THREE.Group;
  earL: THREE.Group;
  earR: THREE.Group;
  eyelidL: THREE.Mesh;
  eyelidR: THREE.Mesh;
  mouthFish: THREE.Group;
  bellPivot: THREE.Group;
  tailBase: THREE.Group;
  tailMid: THREE.Group;
  tailSub: THREE.Group;
  tailTip: THREE.Group;
  legFL: THREE.Group;
  legFR: THREE.Group;
  legBL: THREE.Group;
  legBR: THREE.Group;
  shinFL: THREE.Group;
  shinFR: THREE.Group;
  shinBL: THREE.Group;
  shinBR: THREE.Group;
  scarfBase: THREE.Group;
  scarfMid: THREE.Group;
  scarfTip: THREE.Group;
  scarfMat: THREE.MeshStandardMaterial;
  setCollarAccent: (accentHex: string) => void;
  contactShadow: THREE.Mesh;
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
  textures: THREE.Texture[];
  baseBodyScale: [number, number, number];
  legLengthScale: number;
  earBaseTiltX: number;
  isBobtail: boolean;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  earLag: number;
  tailLag: number;
  prevGrounded: boolean;
  headLookYaw: number;
  headLookPitch: number;
  breathPhase: number;
}

function makeFurMicroTexture(breed: CatBreedId): {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  rough: THREE.CanvasTexture;
} {
  const spec = CAT_BREED_SPECS[breed];
  const cA = document.createElement('canvas');
  const cB = document.createElement('canvas');
  const cR = document.createElement('canvas');
  cA.width = cB.width = cR.width = 128;
  cA.height = cB.height = cR.height = 128;
  const ctxA = cA.getContext('2d')!;
  const ctxB = cB.getContext('2d')!;
  const ctxR = cR.getContext('2d')!;
  ctxA.fillStyle = spec.coatHex;
  ctxA.fillRect(0, 0, 128, 128);
  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, 128, 128);
  ctxR.fillStyle = '#BFBFBF';
  ctxR.fillRect(0, 0, 128, 128);

  if (spec.pattern === 'calico') {
    const blobs: Array<[number, number, number, string]> = [
      [26, 30, 24, spec.stripeHex],
      [96, 22, 22, spec.patchHex],
      [64, 72, 26, spec.stripeHex],
      [18, 98, 20, spec.patchHex],
      [104, 102, 25, spec.stripeHex],
      [60, 14, 18, spec.patchHex],
    ];
    for (const [bx, by, br, col] of blobs) {
      ctxA.fillStyle = col;
      ctxA.beginPath();
      ctxA.arc(bx, by, br, 0, Math.PI * 2);
      ctxA.fill();
    }
  } else if (spec.pattern === 'tabby') {
    ctxA.fillStyle = spec.stripeHex;
    ctxA.globalAlpha = 0.24;
    for (let y = 6; y < 128; y += 22) {
      ctxA.fillRect(0, y, 128, 7);
    }
    ctxA.globalAlpha = 1.0;
  }

  for (let i = 0; i < 950; i++) {
    const x = (i * 53) % 128;
    const y = (i * 97) % 128;
    const h = 3 + (i % 5);
    ctxA.globalAlpha = 0.22;
    ctxA.fillStyle =
      i % 4 === 0 ? spec.patchHex : i % 5 === 0 ? spec.stripeHex : spec.coatHex;
    ctxA.fillRect(x, y, 1.5, h);
    ctxA.globalAlpha = 1.0;
    const v = 104 + ((i * 29) % 92);
    ctxB.fillStyle = `rgb(${v},${v},${v})`;
    ctxB.fillRect(x, y, 1.5, h);
    const rv = 158 + ((i * 17) % 68);
    ctxR.fillStyle = `rgb(${rv},${rv},${rv})`;
    ctxR.fillRect(x, y, 1.5, h);
  }
  const map = new THREE.CanvasTexture(cA);
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = new THREE.CanvasTexture(cB);
  const rough = new THREE.CanvasTexture(cR);
  map.wrapS = map.wrapT = bump.wrapS = bump.wrapT = rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);
  bump.repeat.set(3, 3);
  rough.repeat.set(3, 3);
  return { map, bump, rough };
}

function applyRimTint(mat: THREE.MeshPhysicalMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      vec3 viewDirRim = normalize(vViewPosition);
      float rim = pow(1.0 - clamp(dot(normalize(vNormal), viewDirRim), 0.0, 1.0), 2.8);
      gl_FragColor.rgb += vec3(0.45, 0.58, 0.54) * rim * 0.34;
      #include <dithering_fragment>
      `
    );
  };
}

export function createCatRig(
  contactShadowMat: THREE.MeshBasicMaterial,
  breed: CatBreedId = 'ginger',
  collarAccentHex = '#F4A949'
): CatRig {
  const spec = CAT_BREED_SPECS[breed];
  const anat = spec.anatomy;

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.34 * anat.legLengthScale, 0);
  bodyGroup.scale.set(...anat.bodyScale);
  root.add(bodyGroup);

  const chestGroup = new THREE.Group();
  bodyGroup.add(chestGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const { map: furMap, bump: furBump, rough: furRough } = makeFurMicroTexture(breed);
  const textures: THREE.Texture[] = [furMap, furBump, furRough];

  const furMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: furMap,
    roughness: Math.max(0.46, 0.78 - anat.coatGloss * 0.45),
    metalness: 0.02,
    bumpMap: furBump,
    bumpScale: anat.coatGloss > 0.3 ? 0.007 : 0.013,
    roughnessMap: furRough,
    sheen: 0.9,
    sheenRoughness: 0.52,
    sheenColor: new THREE.Color(spec.sheenHex),
    clearcoat: anat.coatGloss,
    clearcoatRoughness: 0.32,
  });
  applyRimTint(furMat);

  const earTipMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.earHex),
    roughness: 0.74 - anat.coatGloss * 0.3,
    metalness: 0.02,
    bumpMap: furBump,
    bumpScale: 0.01,
    sheen: 0.55,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(spec.sheenHex),
  });

  const pawMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.pawHex),
    roughness: 0.74 - anat.coatGloss * 0.3,
    metalness: 0.02,
    bumpMap: furBump,
    bumpScale: 0.01,
    sheen: 0.55,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(spec.sheenHex),
  });

  const tailTipMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.tailTipHex),
    roughness: 0.74 - anat.coatGloss * 0.3,
    metalness: 0.02,
    bumpMap: furBump,
    bumpScale: 0.01,
    sheen: 0.55,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(spec.sheenHex),
  });

  const creamMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.creamHex),
    roughness: 0.76,
    metalness: 0.0,
    bumpMap: furBump,
    bumpScale: 0.008,
    sheen: 0.85,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(spec.sheenHex),
  });

  const muzzleMat = spec.pattern === 'points' ? earTipMat : creamMat;

  const noseMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.noseHex),
    roughness: 0.32,
    metalness: 0.05,
  });

  const innerEarMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#9E6254'),
    roughness: 0.72,
    metalness: 0.0,
  });

  const collarMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.collarHex),
    roughness: 0.42,
    metalness: 0.18,
  });

  const bellMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#F4A949'),
    emissive: new THREE.Color('#F4A949'),
    emissiveIntensity: 0.9,
    roughness: 0.22,
    metalness: 0.88,
  });

  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.eyeHex),
    emissive: new THREE.Color(spec.eyeEmissiveHex),
    emissiveIntensity: 0.62,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const scarfMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(collarAccentHex),
    emissive: new THREE.Color(collarAccentHex),
    emissiveIntensity: 0.14,
    roughness: 0.44,
    metalness: 0.1,
  });

  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f0b09 });
  const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xf4ead8 });

  materials.push(
    furMat,
    earTipMat,
    pawMat,
    tailTipMat,
    creamMat,
    noseMat,
    innerEarMat,
    collarMat,
    bellMat,
    scarfMat,
    eyeMat,
    pupilMat,
    whiskerMat
  );

  // 1. Sleek organic feline spine + breed ribcage + optional Maine Coon / plush chest ruff
  const spineGeo = new THREE.CapsuleGeometry(0.116, 0.36, 10, 18);
  spineGeo.rotateX(Math.PI * 0.5);
  geometries.push(spineGeo);
  const spine = new THREE.Mesh(spineGeo, furMat);
  spine.scale.set(0.95, 1.02, 1.0);
  spine.castShadow = true;
  spine.receiveShadow = true;
  chestGroup.add(spine);

  const shoulderGeo = new THREE.SphereGeometry(0.125, 16, 12);
  geometries.push(shoulderGeo);
  const shoulders = new THREE.Mesh(shoulderGeo, furMat);
  shoulders.position.set(0, 0.018, 0.16);
  shoulders.scale.set(0.95, 1.0, 1.08);
  shoulders.castShadow = true;
  chestGroup.add(shoulders);

  const haunchGeo = new THREE.SphereGeometry(0.124, 16, 12);
  geometries.push(haunchGeo);
  const haunch = new THREE.Mesh(haunchGeo, furMat);
  haunch.position.set(0, 0.015, -0.155);
  haunch.scale.set(0.88, 0.98, 1.1);
  haunch.castShadow = true;
  chestGroup.add(haunch);

  const chestBibGeo = new THREE.SphereGeometry(0.11, 14, 10);
  geometries.push(chestBibGeo);
  const chestBib = new THREE.Mesh(chestBibGeo, creamMat);
  chestBib.position.set(0, -0.025, 0.23);
  chestBib.scale.set(0.88 * anat.neckFluff, 1.05 * Math.min(1.25, anat.neckFluff), 0.92);
  chestGroup.add(chestBib);

  if (anat.neckFluff > 1.2) {
    // Rich Maine Coon collar mane lobes framing chest & cheeks
    const ruffGeo = new THREE.SphereGeometry(0.088, 12, 10);
    geometries.push(ruffGeo);
    for (const side of [-1, 1]) {
      const ruff = new THREE.Mesh(ruffGeo, creamMat);
      ruff.position.set(side * 0.072, 0.03, 0.215);
      ruff.scale.set(0.85, 1.12, 0.85);
      chestGroup.add(ruff);
    }
  }

  const neckGeo = new THREE.CylinderGeometry(0.082, 0.105, 0.16, 14);
  geometries.push(neckGeo);
  const neck = new THREE.Mesh(neckGeo, furMat);
  neck.position.set(0, 0.09, 0.23);
  neck.rotation.x = 0.42;
  neck.castShadow = true;
  chestGroup.add(neck);

  // 2. Expressive feline head sculpted per breed + fold/tuft ears + eyelids
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.175, 0.305);
  headGroup.scale.set(...anat.headScale);
  chestGroup.add(headGroup);

  const craniumGeo = new THREE.SphereGeometry(0.118, 18, 14);
  geometries.push(craniumGeo);
  const cranium = new THREE.Mesh(craniumGeo, furMat);
  cranium.scale.set(1.06, 0.94, 1.02);
  cranium.castShadow = true;
  headGroup.add(cranium);

  const cheekGeo = new THREE.SphereGeometry(0.064, 12, 10);
  geometries.push(cheekGeo);
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(cheekGeo, creamMat);
    cheek.position.set(side * 0.068, -0.028, 0.035);
    cheek.scale.set(1.05 * anat.neckFluff * 0.85, 0.85, 0.95);
    headGroup.add(cheek);
  }

  const muzzleGeo = new THREE.SphereGeometry(0.058, 14, 10);
  geometries.push(muzzleGeo);
  const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzle.position.set(0, -0.03, 0.098 * anat.muzzleScale[2]);
  muzzle.scale.set(1.08 * anat.muzzleScale[0], 0.78 * anat.muzzleScale[1], 1.05 * anat.muzzleScale[2]);
  headGroup.add(muzzle);

  const noseGeo = new THREE.ConeGeometry(0.018, 0.02, 3);
  geometries.push(noseGeo);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, -0.015, 0.156 * anat.muzzleScale[2]);
  nose.rotation.x = -Math.PI * 0.5;
  nose.rotation.z = Math.PI;
  headGroup.add(nose);

  // Gleaming stolen silver fish carried crosswise in Pip's mouth
  const mouthFish = new THREE.Group();
  const fishProfile = [
    new THREE.Vector2(0.001, 0.14),
    new THREE.Vector2(0.026, 0.09),
    new THREE.Vector2(0.036, 0.02),
    new THREE.Vector2(0.022, -0.07),
    new THREE.Vector2(0.006, -0.13),
  ];
  const mouthFishGeo = new THREE.LatheGeometry(fishProfile, 10);
  mouthFishGeo.rotateZ(-Math.PI * 0.5);
  mouthFishGeo.scale(1.0, 0.48, 0.95);
  const mouthTailGeo = new THREE.BoxGeometry(0.065, 0.008, 0.024);
  const mouthFishMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#AECED4'),
    roughness: 0.14,
    metalness: 0.45,
    clearcoat: 0.9,
  });
  geometries.push(mouthFishGeo, mouthTailGeo);
  materials.push(mouthFishMat);

  const mfBody = new THREE.Mesh(mouthFishGeo, mouthFishMat);
  mouthFish.add(mfBody);
  for (const s of [-1, 1]) {
    const lobe = new THREE.Mesh(mouthTailGeo, mouthFishMat);
    lobe.position.set(-0.125, 0, s * 0.012);
    lobe.rotation.y = s * 0.44;
    mouthFish.add(lobe);
  }
  mouthFish.position.set(0.01, -0.042, 0.155 * anat.muzzleScale[2]);
  mouthFish.rotation.y = 0.25;
  mouthFish.rotation.z = -0.18;
  mouthFish.visible = false;
  headGroup.add(mouthFish);

  const earOuterGeo = new THREE.ConeGeometry(0.056, 0.135, 12);
  const earInnerGeo = new THREE.ConeGeometry(0.032, 0.09, 8);
  const tuftGeo = new THREE.ConeGeometry(0.016, 0.052, 6);
  const foldCapGeo = new THREE.SphereGeometry(0.044, 10, 8);
  geometries.push(earOuterGeo, earInnerGeo, tuftGeo, foldCapGeo);

  const earBaseTiltX = anat.earFold ? 0.72 : 0.12;
  const makeEar = (side: number): THREE.Group => {
    const earPivot = new THREE.Group();
    earPivot.position.set(side * 0.074, anat.earFold ? 0.084 : 0.095, anat.earFold ? 0.014 : -0.008);
    earPivot.rotation.z = -side * anat.earTiltZ;
    earPivot.rotation.y = side * 0.22;
    earPivot.rotation.x = earBaseTiltX;
    earPivot.scale.set(...anat.earScale);

    if (anat.earFold) {
      // Scottish Fold drooping rounded forward ear flap
      const foldCap = new THREE.Mesh(foldCapGeo, earTipMat);
      foldCap.position.set(0, 0.018, 0.025);
      foldCap.scale.set(0.95, 0.58, 1.25);
      foldCap.castShadow = true;
      earPivot.add(foldCap);
    } else {
      const outer = new THREE.Mesh(earOuterGeo, earTipMat);
      outer.scale.set(0.85, 1.0, 0.65);
      outer.castShadow = true;
      earPivot.add(outer);

      const inner = new THREE.Mesh(earInnerGeo, innerEarMat);
      inner.position.set(0, -0.008, 0.018);
      inner.scale.set(0.75, 0.95, 0.45);
      earPivot.add(inner);

      if (anat.earTufts) {
        // Maine Coon lynx ear brush tips
        const tuft = new THREE.Mesh(tuftGeo, creamMat);
        tuft.position.set(0, 0.075, 0);
        tuft.castShadow = true;
        earPivot.add(tuft);
      }
    }

    headGroup.add(earPivot);
    return earPivot;
  };
  const earL = makeEar(-1);
  const earR = makeEar(1);

  const eyeGeo = new THREE.SphereGeometry(0.028, 12, 10);
  const pupilGeo = new THREE.BoxGeometry(0.008, 0.028, 0.01);
  const lidGeo = new THREE.SphereGeometry(0.031, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  geometries.push(eyeGeo, pupilGeo, lidGeo);

  const makeEye = (side: number): THREE.Mesh => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.05, 0.018, 0.098);
    eye.scale.set(1.0, 1.06, 0.65);
    headGroup.add(eye);

    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(side * 0.052, 0.018, 0.115);
    headGroup.add(pupil);

    const lid = new THREE.Mesh(lidGeo, furMat);
    lid.position.set(side * 0.05, 0.02, 0.099);
    lid.scale.set(1.05, 1.05, 0.72);
    lid.rotation.x = -Math.PI * 0.48;
    headGroup.add(lid);
    return lid;
  };
  const eyelidL = makeEye(-1);
  const eyelidR = makeEye(1);

  const whiskerGeo = new THREE.CylinderGeometry(0.002, 0.001, 0.11, 4);
  geometries.push(whiskerGeo);
  for (const side of [-1, 1]) {
    for (const row of [-1, 1]) {
      const w = new THREE.Mesh(whiskerGeo, whiskerMat);
      w.position.set(side * 0.088, -0.028 + row * 0.01, 0.115 * anat.muzzleScale[2]);
      w.rotation.z = side * (Math.PI * 0.5 + row * 0.12);
      w.rotation.y = -side * 0.18;
      headGroup.add(w);
    }
  }

  // 3. Collar + LatheGeometry Resonance Brass Bell
  const collarGeo = new THREE.TorusGeometry(0.095, 0.02, 10, 22);
  geometries.push(collarGeo);
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.set(0, 0.082, 0.242);
  collar.rotation.x = Math.PI * 0.34;
  chestGroup.add(collar);

  const bellPivot = new THREE.Group();
  bellPivot.position.set(0, -0.015, 0.315);
  chestGroup.add(bellPivot);

  const bellProfile = [
    new THREE.Vector2(0.001, 0.045),
    new THREE.Vector2(0.022, 0.036),
    new THREE.Vector2(0.036, 0.015),
    new THREE.Vector2(0.046, -0.015),
    new THREE.Vector2(0.052, -0.035),
    new THREE.Vector2(0.032, -0.038),
    new THREE.Vector2(0.0, -0.045),
  ];
  const bellGeo = new THREE.LatheGeometry(bellProfile, 16);
  geometries.push(bellGeo);
  const bell = new THREE.Mesh(bellGeo, bellMat);
  bell.position.set(0, -0.036, 0);
  bellPivot.add(bell);

  // 3b. Dynamic 3-segment Silk Scarf Ribbon fluttering behind the collar
  const scarfSeg1Geo = new THREE.BoxGeometry(0.056, 0.012, 0.13);
  const scarfSeg2Geo = new THREE.BoxGeometry(0.046, 0.01, 0.13);
  const scarfSeg3Geo = new THREE.BoxGeometry(0.032, 0.008, 0.12);
  geometries.push(scarfSeg1Geo, scarfSeg2Geo, scarfSeg3Geo);

  const scarfBase = new THREE.Group();
  scarfBase.position.set(0.018, 0.138, 0.16);
  chestGroup.add(scarfBase);
  const sMesh1 = new THREE.Mesh(scarfSeg1Geo, scarfMat);
  sMesh1.position.set(0, 0, -0.065);
  sMesh1.castShadow = true;
  scarfBase.add(sMesh1);

  const scarfMid = new THREE.Group();
  scarfMid.position.set(0, 0, -0.125);
  scarfBase.add(scarfMid);
  const sMesh2 = new THREE.Mesh(scarfSeg2Geo, scarfMat);
  sMesh2.position.set(0, 0, -0.062);
  sMesh2.castShadow = true;
  scarfMid.add(sMesh2);

  const scarfTip = new THREE.Group();
  scarfTip.position.set(0, 0, -0.12);
  scarfMid.add(scarfTip);
  const sMesh3 = new THREE.Mesh(scarfSeg3Geo, scarfMat);
  sMesh3.position.set(0, 0, -0.058);
  scarfTip.add(sMesh3);

  // 4. Articulated two-segment limbs + rounded paws (proportioned per breed)
  const upperLegGeo = new THREE.CapsuleGeometry(0.036 * anat.legRadiusScale, 0.11 * anat.legLengthScale, 6, 10);
  const lowerLegGeo = new THREE.CapsuleGeometry(0.028 * anat.legRadiusScale, 0.11 * anat.legLengthScale, 6, 10);
  const pawGeo = new THREE.SphereGeometry(0.038 * Math.max(0.9, anat.legRadiusScale), 10, 8);
  geometries.push(upperLegGeo, lowerLegGeo, pawGeo);

  const segY = 0.135 * anat.legLengthScale;
  const makeJointedLeg = (x: number, z: number, isHind: boolean): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = new THREE.Group();
    hip.position.set(x, -0.045, z);
    const upper = new THREE.Mesh(upperLegGeo, furMat);
    upper.position.set(0, -0.068 * anat.legLengthScale, 0);
    if (isHind) {
      upper.scale.set(0.95, 1.04, 1.32);
    }
    upper.castShadow = true;
    hip.add(upper);

    const knee = new THREE.Group();
    knee.position.set(0, -segY, 0);
    hip.add(knee);

    const lower = new THREE.Mesh(lowerLegGeo, furMat);
    lower.position.set(0, -0.065 * anat.legLengthScale, 0);
    lower.castShadow = true;
    knee.add(lower);

    const paw = new THREE.Mesh(pawGeo, pawMat);
    paw.position.set(0, -0.145 * anat.legLengthScale, 0.016);
    paw.scale.set(0.96, 0.72, 1.25);
    knee.add(paw);

    bodyGroup.add(hip);
    return { hip, knee };
  };

  const fl = makeJointedLeg(-0.072, 0.17, false);
  const fr = makeJointedLeg(0.072, 0.17, false);
  const bl = makeJointedLeg(-0.068, -0.175, true);
  const br = makeJointedLeg(0.068, -0.175, true);

  // 5. Fluid 4-segment S-tail (or fluffy pom-pom cluster for Kuril Bobtail)
  const tRad = anat.tailRadiusScale;
  const tLen = anat.tailLengthScale;
  const tailSeg1Geo = anat.bobtail
    ? new THREE.SphereGeometry(0.056, 10, 8)
    : new THREE.CapsuleGeometry(0.033 * tRad, 0.11 * tLen, 6, 10);
  const tailSeg2Geo = anat.bobtail
    ? new THREE.SphereGeometry(0.062, 10, 8)
    : new THREE.CapsuleGeometry(0.027 * tRad, 0.11 * tLen, 6, 10);
  const tailSeg3Geo = anat.bobtail
    ? new THREE.SphereGeometry(0.048, 8, 8)
    : new THREE.CapsuleGeometry(0.021 * tRad, 0.11 * tLen, 6, 10);
  const tailTipGeo = anat.bobtail
    ? new THREE.SphereGeometry(0.036, 8, 8)
    : new THREE.CapsuleGeometry(0.015 * tRad, 0.10 * tLen, 6, 10);
  geometries.push(tailSeg1Geo, tailSeg2Geo, tailSeg3Geo, tailTipGeo);

  const tailBase = new THREE.Group();
  tailBase.position.set(0, 0.052, -0.245);
  chestGroup.add(tailBase);
  const t1 = new THREE.Mesh(tailSeg1Geo, furMat);
  t1.position.set(0, anat.bobtail ? 0.028 : 0.068 * tLen, 0);
  t1.castShadow = true;
  tailBase.add(t1);

  const tailMid = new THREE.Group();
  tailMid.position.set(0, anat.bobtail ? 0.045 : 0.132 * tLen, 0);
  tailBase.add(tailMid);
  const t2 = new THREE.Mesh(tailSeg2Geo, furMat);
  t2.position.set(0, anat.bobtail ? 0.022 : 0.065 * tLen, 0);
  t2.castShadow = true;
  tailMid.add(t2);

  const tailSub = new THREE.Group();
  tailSub.position.set(0, anat.bobtail ? 0.038 : 0.128 * tLen, 0);
  tailMid.add(tailSub);
  const t3 = new THREE.Mesh(tailSeg3Geo, furMat);
  t3.position.set(0, anat.bobtail ? 0.018 : 0.062 * tLen, 0);
  t3.castShadow = true;
  tailSub.add(t3);

  const tailTip = new THREE.Group();
  tailTip.position.set(0, anat.bobtail ? 0.028 : 0.122 * tLen, 0);
  tailSub.add(tailTip);
  const t4 = new THREE.Mesh(tailTipGeo, tailTipMat);
  t4.position.set(0, anat.bobtail ? 0.012 : 0.058 * tLen, 0);
  t4.castShadow = true;
  tailTip.add(t4);

  // 6. Contact shadow
  const shadowGeo = new THREE.CircleGeometry(0.48, 24);
  geometries.push(shadowGeo);
  const contactShadow = new THREE.Mesh(shadowGeo, contactShadowMat);
  contactShadow.rotation.x = -Math.PI * 0.5;
  contactShadow.position.set(0, 0.016, 0);
  root.add(contactShadow);

  return {
    root,
    bodyGroup,
    chestGroup,
    headGroup,
    earL,
    earR,
    eyelidL,
    eyelidR,
    mouthFish,
    bellPivot,
    tailBase,
    tailMid,
    tailSub,
    tailTip,
    legFL: fl.hip,
    legFR: fr.hip,
    legBL: bl.hip,
    legBR: br.hip,
    shinFL: fl.knee,
    shinFR: fr.knee,
    shinBL: bl.knee,
    shinBR: br.knee,
    scarfBase,
    scarfMid,
    scarfTip,
    scarfMat,
    setCollarAccent: (accentHex: string) => {
      scarfMat.color.set(accentHex);
      scarfMat.emissive.set(accentHex);
    },
    contactShadow,
    materials,
    geometries,
    textures,
    baseBodyScale: anat.bodyScale,
    legLengthScale: anat.legLengthScale,
    earBaseTiltX,
    isBobtail: anat.bobtail,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    earLag: 0,
    tailLag: 0,
    prevGrounded: true,
    headLookYaw: 0,
    headLookPitch: 0,
    breathPhase: 0,
  };
}

/**
 * Platformer feline animation updater (Ori / Hollow Knight / Crash Bandicoot style):
 *  1) 0.10s grounded anticipation crouch (squashY = 0.85, squashX = 1.15, coiled knees)
 *  2) Airborne leg tuck under belly + vertical stretch (1.10 / 0.90) + delayed ear & tail velocity lag
 *  3) Deep landing squash (0.65 / 1.35) + elastic +10% bounce rebound -> ease smoothly into Idle
 */
export function updateAnimation(
  rig: CatRig,
  cat: CatState,
  elapsed: number,
  dt: number,
  chimePulse = 0
): void {
  rig.root.position.set(cat.x, cat.y, cat.z);
  rig.root.rotation.y = cat.yaw;

  const speed = Math.hypot(cat.vx, cat.vz);
  const moving =
    speed > 0.25 && cat.grounded && !cat.hopActive && !cat.sleeping && cat.jumpPrepTimer <= 0;
  const pose = computeFelinePose(cat, speed, elapsed);

  // Smooth non-linear squash & stretch blending across all jump/land phases
  const scaleBlend = easeOutQuad(Math.min(1, dt * (cat.landTimer > 0 || cat.jumpPrepTimer > 0 ? 28 : 14)));
  rig.scaleX += (pose.scaleX - rig.scaleX) * scaleBlend;
  rig.scaleY += (pose.scaleY - rig.scaleY) * scaleBlend;
  rig.scaleZ += (pose.scaleZ - rig.scaleZ) * scaleBlend;
  rig.prevGrounded = cat.grounded;

  rig.bodyGroup.scale.set(
    rig.baseBodyScale[0] * rig.scaleX,
    rig.baseBodyScale[1] * rig.scaleY,
    rig.baseBodyScale[2] * rig.scaleZ
  );

  // Breathing ribcage expansion + gentle purr vibration
  rig.breathPhase += dt * (cat.sleeping ? 1.7 : cat.sprinting ? 6.5 : cat.purring ? 4.8 : 2.3);
  const purrVib = cat.purring ? Math.sin(elapsed * 34) * 0.014 : 0;
  const breathAmt = cat.sprinting ? 0.028 : cat.sleeping ? 0.024 : 0.018;
  rig.chestGroup.scale.set(
    1 + Math.sin(rig.breathPhase) * breathAmt + purrVib,
    1 + Math.sin(rig.breathPhase) * (breathAmt * 0.8) - purrVib * 0.5,
    1
  );

  // Sinusoidal/exponentially damped joint follow-through (never robotic snap)
  const smoothRate = 1 - Math.exp(-pose.jointSmoothRate * dt);
  const smoothJoint = (curr: number, target: number) => curr + (target - curr) * smoothRate;

  const targetBodyY = pose.bodyY * rig.legLengthScale;
  rig.bodyGroup.position.y += (targetBodyY - rig.bodyGroup.position.y) * Math.min(1, 24 * dt);

  rig.legFL.rotation.x = smoothJoint(rig.legFL.rotation.x, pose.legFL);
  rig.shinFL.rotation.x = smoothJoint(rig.shinFL.rotation.x, pose.shinFL);
  rig.legFR.rotation.x = smoothJoint(rig.legFR.rotation.x, pose.legFR);
  rig.shinFR.rotation.x = smoothJoint(rig.shinFR.rotation.x, pose.shinFR);
  rig.legBL.rotation.x = smoothJoint(rig.legBL.rotation.x, pose.legBL);
  rig.shinBL.rotation.x = smoothJoint(rig.shinBL.rotation.x, pose.shinBL);
  rig.legBR.rotation.x = smoothJoint(rig.legBR.rotation.x, pose.legBR);
  rig.shinBR.rotation.x = smoothJoint(rig.shinBR.rotation.x, pose.shinBR);

  let bodyActionPitch = pose.bodyPitch;
  rig.chestGroup.rotation.z = smoothJoint(rig.chestGroup.rotation.z, pose.chestRoll);

  if (cat.rubTimer > 0 && !cat.swimming && !cat.sleeping) {
    const rubWave = Math.sin(elapsed * 6.5);
    rig.chestGroup.rotation.z = rubWave * 0.24;
    rig.bodyGroup.position.x = rubWave * 0.08;
    bodyActionPitch -= 0.08;
  } else {
    rig.bodyGroup.position.x *= 0.85;
  }

  rig.bodyGroup.rotation.x = bodyActionPitch + cat.slopePitch;
  rig.bodyGroup.rotation.z = cat.slopeRoll + pose.spinRoll;

  // Delayed secondary lag for ears & tail driven by vertical velocity (-down on rise, +up on fall)
  const lagBlend = 1 - Math.exp(-9.5 * dt);
  rig.earLag += (pose.earAirOffset - rig.earLag) * lagBlend;
  const desiredTailLag = !cat.grounded && !cat.swimming ? THREE.MathUtils.clamp(-cat.vy * 0.055, -0.45, 0.45) : 0;
  rig.tailLag += (desiredTailLag - rig.tailLag) * lagBlend;

  // Fluid S-wave tail (or cheeky Kuril Bobtail wag) with airborne velocity follow-through
  if (cat.sleeping) {
    rig.tailBase.rotation.x = -1.35;
    rig.tailBase.rotation.z = 0.65;
    rig.tailMid.rotation.x = 0.2;
    rig.tailMid.rotation.z = 0.58;
    rig.tailSub.rotation.x = 0.15;
    rig.tailSub.rotation.z = 0.55;
    rig.tailTip.rotation.x = 0.1;
    rig.tailTip.rotation.z = 0.48 + Math.sin(elapsed * 1.4) * 0.08;
  } else if (cat.dashTimer > 0 || cat.gliding) {
    const waveFreq = cat.dashTimer > 0 ? 11.0 : 5.5;
    const waveAmp = cat.dashTimer > 0 ? 0.08 : 0.18;
    rig.tailBase.rotation.x = pose.tailBaseX + rig.tailLag;
    rig.tailBase.rotation.z = Math.sin(elapsed * waveFreq) * waveAmp;
    rig.tailMid.rotation.x = pose.tailCurlX * 0.35 + rig.tailLag * 0.5;
    rig.tailMid.rotation.z = Math.sin(elapsed * waveFreq - 0.5) * waveAmp;
    rig.tailSub.rotation.x = 0.06 + rig.tailLag * 0.4;
    rig.tailSub.rotation.z = Math.sin(elapsed * waveFreq - 1.0) * waveAmp;
    rig.tailTip.rotation.x = 0.04;
    rig.tailTip.rotation.z = Math.sin(elapsed * waveFreq - 1.5) * waveAmp;
  } else {
    const tailFreq = cat.swimming ? 3.2 : cat.purring ? 5.6 : cat.sprinting ? 4.2 : 2.2;
    const tailAmp = rig.isBobtail ? 0.12 : cat.sprinting ? 0.14 : 0.24;
    const bobScale = rig.isBobtail ? 0.45 : 1.0;
    const targetTailX =
      cat.rubTimer > 0 || cat.purring
        ? -0.18 + Math.sin(elapsed * 4.5) * 0.05
        : pose.tailBaseX + rig.tailLag + Math.sin(elapsed * tailFreq) * 0.07;
    rig.tailBase.rotation.x = smoothJoint(rig.tailBase.rotation.x, targetTailX);
    rig.tailBase.rotation.z = Math.sin(elapsed * tailFreq * 0.9) * tailAmp;
    rig.tailMid.rotation.x = smoothJoint(rig.tailMid.rotation.x, (pose.tailCurlX + rig.tailLag * 0.65) * bobScale);
    rig.tailMid.rotation.z = Math.sin(elapsed * tailFreq * 0.9 - 0.7) * tailAmp * 1.1;
    rig.tailSub.rotation.x = smoothJoint(rig.tailSub.rotation.x, (pose.tailCurlX * 0.85 + rig.tailLag * 0.5) * bobScale);
    rig.tailSub.rotation.z = Math.sin(elapsed * tailFreq * 0.9 - 1.4) * tailAmp * 1.15;
    rig.tailTip.rotation.x =
      (pose.tailCurlX * 0.7 + rig.tailLag * 0.4) * bobScale + Math.cos(elapsed * 1.8) * 0.08;
    rig.tailTip.rotation.z = Math.sin(elapsed * tailFreq * 0.9 - 2.1) * tailAmp;
  }

  // Head tracking & gimbal counter-pitch
  let desiredHeadYaw = THREE.MathUtils.clamp(cat.yawRate * 0.14, -0.35, 0.35);
  let desiredHeadPitch = (cat.swimming ? -0.12 : cat.crouching ? 0.12 : 0) + pose.headCounterPitch;
  if (cat.sleeping) {
    desiredHeadYaw = 0.62;
    desiredHeadPitch = 0.36;
  } else if (cat.rubTimer > 0) {
    desiredHeadYaw = Math.sin(elapsed * 6.5) * 0.42;
    desiredHeadPitch = -0.22;
  } else if (cat.idleTime > 0.7 && !moving && !cat.swimming) {
    desiredHeadYaw += Math.sin(elapsed * 1.1) * 0.24;
    desiredHeadPitch += Math.sin(elapsed * 1.7 + 0.5) * 0.08;
  }
  if (!cat.sleeping && cat.targetLedge && (cat.grounded || cat.swimming)) {
    desiredHeadPitch -= 0.16;
  }
  if (!cat.sleeping && chimePulse > 0) {
    desiredHeadPitch -= chimePulse * 0.22;
  }
  rig.headLookYaw += (desiredHeadYaw - rig.headLookYaw) * Math.min(1, 8 * dt);
  rig.headLookPitch += (desiredHeadPitch - rig.headLookPitch) * Math.min(1, 10 * dt);
  rig.headGroup.rotation.y = rig.headLookYaw;
  rig.headGroup.rotation.x = rig.headLookPitch;
  rig.headGroup.rotation.z =
    cat.sleeping
      ? 0.25
      : cat.rubTimer > 0
        ? Math.sin(elapsed * 6.5) * 0.22
        : cat.purring
          ? Math.sin(elapsed * 6) * 0.08
          : -rig.headLookYaw * 0.18;

  rig.mouthFish.visible = cat.carryingFish && !cat.sleeping;

  // Natural blinking eyelids + happy purr squint / sleeping closed eyes
  const blinkCycle = elapsed % 3.8;
  const blinkAmt = blinkCycle > 3.62 ? Math.sin(((blinkCycle - 3.62) / 0.18) * Math.PI) : 0;
  const lidClose = cat.sleeping
    ? 0.98
    : cat.frightTimer > 0
      ? 0
      : Math.max(blinkAmt, cat.purring || cat.rubTimer > 0 ? 0.64 : 0);
  const lidAngle = THREE.MathUtils.lerp(-Math.PI * 0.48, 0.12, lidClose);
  rig.eyelidL.rotation.x = lidAngle;
  rig.eyelidR.rotation.x = lidAngle;

  // Independent feline ear twitches + speed-delayed ear angle (press down rising, lift falling)
  const earTwitchCycle = elapsed % 4.3;
  const twitchL = earTwitchCycle > 4.05 ? Math.sin(((earTwitchCycle - 4.05) / 0.25) * Math.PI * 2) * 0.22 : 0;
  const earTwitchR = (elapsed + 1.9) % 5.1;
  const twitchR = earTwitchR > 4.88 ? Math.sin(((earTwitchR - 4.88) / 0.22) * Math.PI * 2) * 0.2 : 0;
  const earPosture =
    cat.frightTimer > 0 || cat.dashTimer > 0
      ? -0.45
      : cat.swimming
        ? -0.18
        : !cat.grounded
          ? rig.earLag
          : cat.sprinting
            ? -0.32
            : cat.crouching || cat.jumpPrepTimer > 0
              ? rig.earLag - 0.12
              : 0;
  rig.earL.rotation.x = rig.earBaseTiltX + earPosture + twitchL;
  rig.earR.rotation.x = rig.earBaseTiltX + earPosture + twitchR;

  // Collar bell jingle
  rig.bellPivot.rotation.x =
    Math.min(0.45, speed * 0.06) + Math.sin(cat.gaitPhase * 2) * 0.08 + chimePulse * 0.35;
  rig.bellPivot.rotation.z = Math.sin(elapsed * 3.5) * 0.08 + Math.sin(elapsed * 24) * chimePulse * 0.38;

  // Dynamic 3-segment Silk Scarf trailing wave + vertical velocity flutter
  const dashBoost = cat.dashTimer > 0 ? 1.15 : 0;
  const glideBoost = cat.gliding ? 0.85 : 0;
  const airWind = !cat.grounded ? Math.min(0.65, Math.abs(cat.vy) * 0.08) : 0;
  const moveFactor = Math.min(1, (speed + dashBoost * 5 + glideBoost * 4 + airWind * 3) / 5.5);
  const scarfWind = Math.min(1.85, speed * 0.16 + dashBoost + glideBoost + airWind + 0.12);
  const waveFreq = 4.8 + scarfWind * 6.5;
  const turnDrag = THREE.MathUtils.clamp(-cat.yawRate * 0.2, -0.48, 0.48);
  if (cat.sleeping) {
    rig.scarfBase.rotation.set(-0.08, 0.28, 0);
    rig.scarfMid.rotation.set(-0.18, 0.24, 0);
    rig.scarfTip.rotation.set(-0.22, 0.2, 0);
  } else {
    const vertFlutter = !cat.grounded ? THREE.MathUtils.clamp(-cat.vy * 0.04, -0.32, 0.32) : 0;
    const restPitch = THREE.MathUtils.lerp(0.04, 0.34, moveFactor) + vertFlutter;
    const curlMid = THREE.MathUtils.lerp(-0.16, 0.04, moveFactor);
    const curlTip = THREE.MathUtils.lerp(-0.14, 0.06, moveFactor);
    const amp = 0.05 + scarfWind * 0.11;
    rig.scarfBase.rotation.x = restPitch + Math.sin(elapsed * waveFreq) * amp * 0.45;
    rig.scarfBase.rotation.y = turnDrag * 0.45 + Math.cos(elapsed * waveFreq * 0.8) * amp * 0.4;
    rig.scarfMid.rotation.x = curlMid + Math.sin(elapsed * waveFreq - 1.1) * amp * 0.9;
    rig.scarfMid.rotation.y = turnDrag * 0.65 + Math.cos(elapsed * waveFreq * 0.8 - 1.1) * amp * 0.65;
    rig.scarfTip.rotation.x = curlTip + Math.sin(elapsed * waveFreq - 2.2) * amp * 1.2;
    rig.scarfTip.rotation.y = turnDrag * 0.85 + Math.cos(elapsed * waveFreq * 0.8 - 2.2) * amp * 0.85;
  }

  rig.contactShadow.visible = !cat.swimming;
  rig.contactShadow.scale.setScalar(cat.grounded ? 1 : 0.65);
}

export const updateCatVisual = updateAnimation;
