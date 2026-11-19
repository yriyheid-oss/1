import * as THREE from 'three';
import type { BirdNpcState, DogNpcState, PersonNpcState } from '../systems/npcSystem';
import type { WorldMaterialSet } from './materials';

export interface PersonRig {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  rodGroup: THREE.Group | null;
  bobber: THREE.Mesh | null;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

export interface DogRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  earL: THREE.Mesh;
  earR: THREE.Mesh;
  tail: THREE.Group;
  legFL: THREE.Group;
  legFR: THREE.Group;
  legBL: THREE.Group;
  legBR: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

export interface BirdRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  wingL: THREE.Group;
  wingR: THREE.Group;
  shadow: THREE.Mesh;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

export function createPersonRig(
  npc: PersonNpcState,
  mats: WorldMaterialSet
): PersonRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const coatMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(npc.coatColor),
    roughness: 0.84,
    metalness: 0.04,
  });
  const trouserMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#233238'),
    roughness: 0.86,
    metalness: 0.04,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#CFA282'),
    roughness: 0.68,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#352720'),
    roughness: 0.88,
    metalness: 0.0,
  });
  const apronMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(npc.role === 'vendor' ? '#C7B69A' : '#3C5954'),
    roughness: 0.88,
    metalness: 0.02,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x161a1d });
  materials.push(coatMat, trouserMat, skinMat, hairMat, apronMat, eyeMat);

  // Articulated legs + rounded leather boots
  const thighGeo = new THREE.CapsuleGeometry(0.066, 0.3, 6, 10);
  const calfGeo = new THREE.CapsuleGeometry(0.056, 0.28, 6, 10);
  const bootGeo = new THREE.CapsuleGeometry(0.062, 0.11, 6, 8);
  bootGeo.rotateX(Math.PI * 0.5);
  geometries.push(thighGeo, calfGeo, bootGeo);

  const makeLeg = (sx: number): THREE.Group => {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.088, 0.78, 0);
    const thigh = new THREE.Mesh(thighGeo, trouserMat);
    thigh.position.y = -0.19;
    thigh.castShadow = true;
    hip.add(thigh);

    const calf = new THREE.Mesh(calfGeo, trouserMat);
    calf.position.y = -0.49;
    calf.castShadow = true;
    hip.add(calf);

    const boot = new THREE.Mesh(bootGeo, mats.darkIron);
    boot.position.set(0, -0.71, 0.045);
    boot.scale.set(0.95, 0.82, 1.15);
    boot.castShadow = true;
    hip.add(boot);
    root.add(hip);
    return hip;
  };

  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // Torso, coat, waist belt & scarf
  const torso = new THREE.Group();
  torso.position.set(0, 0.8, 0);
  root.add(torso);

  const chestGeo = new THREE.CylinderGeometry(0.185, 0.145, 0.54, 14);
  const beltGeo = new THREE.CylinderGeometry(0.155, 0.155, 0.065, 14);
  const shoulderCapGeo = new THREE.SphereGeometry(0.072, 10, 8);
  const neckGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10);
  geometries.push(chestGeo, beltGeo, shoulderCapGeo, neckGeo);

  const chest = new THREE.Mesh(chestGeo, coatMat);
  chest.position.y = 0.29;
  chest.scale.set(1.12, 1.0, 0.78);
  chest.castShadow = true;
  chest.receiveShadow = true;
  torso.add(chest);

  const belt = new THREE.Mesh(beltGeo, mats.darkIron);
  belt.position.y = 0.08;
  belt.scale.set(1.12, 1.0, 0.82);
  torso.add(belt);

  const apronGeo = new THREE.BoxGeometry(0.28, 0.44, 0.035);
  geometries.push(apronGeo);
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.position.set(0, 0.16, 0.12);
  torso.add(apron);

  const scarfGeo = new THREE.TorusGeometry(0.115, 0.036, 8, 14);
  geometries.push(scarfGeo);
  const scarf = new THREE.Mesh(scarfGeo, apronMat);
  scarf.rotation.x = Math.PI * 0.5;
  scarf.position.y = 0.56;
  torso.add(scarf);

  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 0.59;
  torso.add(neck);

  // Head + hair + brimmed hat with leather band
  const head = new THREE.Group();
  head.position.set(0, 0.71, 0.01);
  torso.add(head);

  const skullGeo = new THREE.SphereGeometry(0.122, 14, 12);
  const hairGeo = new THREE.SphereGeometry(0.126, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const noseGeo = new THREE.ConeGeometry(0.02, 0.055, 6);
  const eyeGeo = new THREE.SphereGeometry(0.014, 8, 6);
  geometries.push(skullGeo, hairGeo, noseGeo, eyeGeo);

  const skull = new THREE.Mesh(skullGeo, skinMat);
  skull.scale.set(0.9, 1.08, 0.96);
  skull.castShadow = true;
  head.add(skull);

  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.rotation.x = -0.32;
  hair.position.set(0, 0.01, -0.015);
  head.add(hair);

  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.rotation.x = Math.PI * 0.5;
  nose.position.set(0, -0.008, 0.12);
  head.add(nose);

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx * 0.042, 0.02, 0.106);
    head.add(eye);
  }

  const brimGeo = new THREE.CylinderGeometry(0.22, 0.235, 0.022, 16);
  const crownGeo = new THREE.CylinderGeometry(0.115, 0.13, 0.11, 14);
  const hatBandGeo = new THREE.TorusGeometry(0.126, 0.014, 6, 16);
  geometries.push(brimGeo, crownGeo, hatBandGeo);
  const hatMat = npc.role === 'fisherman' ? mats.woodCatwalk : mats.darkIron;
  const brim = new THREE.Mesh(brimGeo, hatMat);
  brim.position.y = 0.09;
  brim.rotation.x = -0.08;
  brim.castShadow = true;
  head.add(brim);

  const crown = new THREE.Mesh(crownGeo, hatMat);
  crown.position.set(0, 0.15, -0.01);
  crown.rotation.x = -0.08;
  head.add(crown);

  const hatBand = new THREE.Mesh(hatBandGeo, mats.brassTrim);
  hatBand.rotation.x = Math.PI * 0.5 - 0.08;
  hatBand.position.set(0, 0.106, -0.006);
  head.add(hatBand);

  // Articulated upper/lower arms with natural slight elbow bend
  const upperArmGeo = new THREE.CapsuleGeometry(0.05, 0.2, 6, 8);
  const forearmGeo = new THREE.CapsuleGeometry(0.042, 0.2, 6, 8);
  const handGeo = new THREE.SphereGeometry(0.042, 8, 8);
  geometries.push(upperArmGeo, forearmGeo, handGeo);

  const makeArm = (sx: number): THREE.Group => {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * 0.225, 0.51, 0);
    shoulder.rotation.z = sx * 0.08;

    const cap = new THREE.Mesh(shoulderCapGeo, coatMat);
    shoulder.add(cap);

    const upper = new THREE.Mesh(upperArmGeo, coatMat);
    upper.position.y = -0.12;
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.24, 0);
    elbow.rotation.x = -0.26;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(forearmGeo, coatMat);
    forearm.position.y = -0.12;
    forearm.castShadow = true;
    elbow.add(forearm);

    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.y = -0.25;
    elbow.add(hand);

    torso.add(shoulder);
    return shoulder;
  };

  const armL = makeArm(-1);
  const armR = makeArm(1);

  // Optional articulated fishing rod held over the canal
  let rodGroup: THREE.Group | null = null;
  let bobber: THREE.Mesh | null = null;
  if (npc.holdingRod) {
    rodGroup = new THREE.Group();
    rodGroup.position.set(0, -0.44, 0.05);

    const rodGeo = new THREE.CylinderGeometry(0.011, 0.026, 2.35, 8);
    const reelGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.038, 10);
    const lineGeo = new THREE.CylinderGeometry(0.003, 0.003, 1.55, 4);
    const bobberGeo = new THREE.SphereGeometry(0.042, 10, 8);
    const bobberMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#D94E34'),
      roughness: 0.35,
      metalness: 0.05,
    });
    geometries.push(rodGeo, reelGeo, lineGeo, bobberGeo);
    materials.push(bobberMat);

    const rod = new THREE.Mesh(rodGeo, mats.woodCatwalk);
    rod.rotation.x = Math.PI * 0.36;
    rod.position.set(0, 0.48, 1.02);
    rod.castShadow = true;
    rodGroup.add(rod);

    const reel = new THREE.Mesh(reelGeo, mats.brassTrim);
    reel.rotation.z = Math.PI * 0.5;
    reel.position.set(0.03, 0.14, 0.24);
    rodGroup.add(reel);

    const line = new THREE.Mesh(lineGeo, mats.darkIron);
    line.position.set(0, 0.19, 1.98);
    rodGroup.add(line);

    bobber = new THREE.Mesh(bobberGeo, bobberMat);
    bobber.position.set(0, -0.58, 1.98);
    rodGroup.add(bobber);

    armR.add(rodGroup);
  }

  // Soft contact shadow disc
  const shadowGeo = new THREE.CircleGeometry(0.36, 18);
  geometries.push(shadowGeo);
  const shadow = new THREE.Mesh(shadowGeo, mats.contactShadow);
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.015;
  root.add(shadow);

  root.position.set(npc.x, npc.y, npc.z);
  root.rotation.y = npc.yaw;

  return {
    root,
    torso,
    head,
    armL,
    armR,
    legL,
    legR,
    rodGroup,
    bobber,
    geometries,
    materials,
  };
}

export function updatePersonVisual(rig: PersonRig, npc: PersonNpcState, elapsed: number): void {
  rig.root.position.set(npc.x, npc.y, npc.z);
  rig.root.rotation.y = npc.yaw;

  if (npc.walking) {
    const p = npc.gaitPhase;
    rig.legL.rotation.x = Math.sin(p) * 0.52;
    rig.legR.rotation.x = -Math.sin(p) * 0.52;
    rig.armL.rotation.x = -Math.sin(p) * 0.42;
    rig.armR.rotation.x = npc.holdingRod ? -0.58 : Math.sin(p) * 0.42;
    rig.torso.position.y = 0.82 + Math.abs(Math.sin(p)) * 0.035;
    rig.torso.rotation.x = 0.04;
    rig.head.rotation.y = Math.sin(elapsed * 0.9) * 0.08;
  } else {
    rig.legL.rotation.x *= 0.85;
    rig.legR.rotation.x *= 0.85;
    rig.armL.rotation.x *= 0.85;
    rig.torso.position.y = 0.82 + Math.sin(elapsed * 2.0 + npc.x) * 0.012;
    rig.torso.rotation.x = npc.holdingRod ? 0.06 : 0;

    if (npc.holdingRod) {
      rig.armR.rotation.x = -0.68 + Math.sin(elapsed * 1.4) * 0.04;
      if (rig.bobber) {
        rig.bobber.position.y = -0.58 + Math.sin(elapsed * 3.1 + npc.z) * 0.035;
      }
    } else {
      rig.armR.rotation.x *= 0.85;
    }
    rig.head.rotation.y = npc.lookAtCatTimer > 0 ? 0 : Math.sin(elapsed * 1.1 + npc.z) * 0.22;
  }
}

export function createDogRig(npc: DogNpcState, mats: WorldMaterialSet): DogRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const furMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(npc.coatColor),
    roughness: 0.78,
    metalness: 0.02,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#DECBB2'),
    roughness: 0.82,
    metalness: 0.0,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8E3B2E'),
    roughness: 0.48,
    metalness: 0.1,
  });
  materials.push(furMat, bellyMat, collarMat);

  const body = new THREE.Group();
  body.position.set(0, 0.42, 0);
  root.add(body);

  const ribcageGeo = new THREE.SphereGeometry(0.165, 14, 12);
  const waistGeo = new THREE.CapsuleGeometry(0.115, 0.34, 8, 14);
  waistGeo.rotateX(Math.PI * 0.5);
  const hipMassGeo = new THREE.SphereGeometry(0.14, 12, 10);
  const chestGeo = new THREE.SphereGeometry(0.155, 12, 10);
  const neckGeo = new THREE.CylinderGeometry(0.09, 0.125, 0.22, 12);
  geometries.push(ribcageGeo, waistGeo, hipMassGeo, chestGeo, neckGeo);

  const spine = new THREE.Mesh(waistGeo, furMat);
  spine.scale.set(0.95, 0.92, 1.0);
  spine.castShadow = true;
  spine.receiveShadow = true;
  body.add(spine);

  const ribcage = new THREE.Mesh(ribcageGeo, furMat);
  ribcage.position.set(0, -0.01, 0.13);
  ribcage.scale.set(0.9, 1.08, 1.15);
  ribcage.castShadow = true;
  body.add(ribcage);

  const hindquarters = new THREE.Mesh(hipMassGeo, furMat);
  hindquarters.position.set(0, 0.01, -0.19);
  hindquarters.scale.set(0.92, 0.98, 1.08);
  hindquarters.castShadow = true;
  body.add(hindquarters);

  const chest = new THREE.Mesh(chestGeo, bellyMat);
  chest.position.set(0, -0.04, 0.22);
  chest.scale.set(0.8, 0.95, 0.85);
  body.add(chest);

  const neck = new THREE.Mesh(neckGeo, furMat);
  neck.position.set(0, 0.14, 0.24);
  neck.rotation.x = 0.42;
  neck.castShadow = true;
  body.add(neck);

  const collarGeo = new THREE.TorusGeometry(0.112, 0.022, 8, 16);
  geometries.push(collarGeo);
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.set(0, 0.14, 0.25);
  collar.rotation.x = Math.PI * 0.34;
  body.add(collar);

  // Sculpted hound head + rounded snout + floppy hound ears
  const head = new THREE.Group();
  head.position.set(0, 0.25, 0.33);
  body.add(head);

  const skullGeo = new THREE.SphereGeometry(0.125, 14, 12);
  const snoutGeo = new THREE.CapsuleGeometry(0.048, 0.1, 6, 10);
  snoutGeo.rotateX(Math.PI * 0.5);
  const noseGeo = new THREE.SphereGeometry(0.025, 8, 8);
  const earGeo = new THREE.CapsuleGeometry(0.036, 0.095, 6, 8);
  const eyeGeo = new THREE.SphereGeometry(0.019, 8, 6);
  geometries.push(skullGeo, snoutGeo, noseGeo, earGeo, eyeGeo);

  const skull = new THREE.Mesh(skullGeo, furMat);
  skull.scale.set(0.95, 0.96, 1.05);
  skull.castShadow = true;
  head.add(skull);

  const snout = new THREE.Mesh(snoutGeo, bellyMat);
  snout.position.set(0, -0.024, 0.13);
  snout.scale.set(1.05, 0.85, 1.0);
  head.add(snout);

  const nose = new THREE.Mesh(noseGeo, mats.darkIron);
  nose.position.set(0, -0.008, 0.22);
  head.add(nose);

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, mats.darkIron);
    eye.position.set(sx * 0.056, 0.034, 0.104);
    head.add(eye);
  }

  const earL = new THREE.Mesh(earGeo, mats.darkIron);
  earL.position.set(-0.118, -0.02, -0.01);
  earL.scale.set(0.55, 1.0, 1.15);
  earL.rotation.z = 0.22;
  head.add(earL);

  const earR = new THREE.Mesh(earGeo, mats.darkIron);
  earR.position.set(0.118, -0.02, -0.01);
  earR.scale.set(0.55, 1.0, 1.15);
  earR.rotation.z = -0.22;
  head.add(earR);

  // 4 Articulated legs with upper shoulder/haunch & slim lower shank
  const legGeo = new THREE.CapsuleGeometry(0.04, 0.24, 6, 8);
  const pawGeo = new THREE.SphereGeometry(0.046, 8, 6);
  geometries.push(legGeo, pawGeo);

  const makeLeg = (x: number, z: number): THREE.Group => {
    const hip = new THREE.Group();
    hip.position.set(x, -0.06, z);
    const mesh = new THREE.Mesh(legGeo, furMat);
    mesh.position.y = -0.15;
    mesh.castShadow = true;
    hip.add(mesh);

    const paw = new THREE.Mesh(pawGeo, bellyMat);
    paw.position.set(0, -0.32, 0.022);
    paw.scale.set(0.95, 0.7, 1.28);
    hip.add(paw);
    body.add(hip);
    return hip;
  };

  const legFL = makeLeg(-0.088, 0.19);
  const legFR = makeLeg(0.088, 0.19);
  const legBL = makeLeg(-0.088, -0.21);
  const legBR = makeLeg(0.088, -0.21);

  // Wagging tail
  const tail = new THREE.Group();
  tail.position.set(0, 0.08, -0.29);
  body.add(tail);
  const tailGeo = new THREE.CapsuleGeometry(0.026, 0.22, 6, 8);
  geometries.push(tailGeo);
  const tailMesh = new THREE.Mesh(tailGeo, furMat);
  tailMesh.position.set(0, 0.11, -0.05);
  tailMesh.rotation.x = -0.52;
  tail.add(tailMesh);

  const shadowGeo = new THREE.CircleGeometry(0.45, 18);
  geometries.push(shadowGeo);
  const shadow = new THREE.Mesh(shadowGeo, mats.contactShadow);
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.015;
  root.add(shadow);

  root.position.set(npc.x, npc.y, npc.z);
  root.rotation.y = npc.yaw;

  return {
    root,
    body,
    head,
    earL,
    earR,
    tail,
    legFL,
    legFR,
    legBL,
    legBR,
    geometries,
    materials,
  };
}

export function updateDogVisual(rig: DogRig, npc: DogNpcState, elapsed: number): void {
  rig.root.position.set(npc.x, npc.y, npc.z);
  rig.root.rotation.y = npc.yaw;

  if (npc.behavior === 'chase') {
    const p = npc.gaitPhase;
    rig.legFL.rotation.x = Math.sin(p) * 0.78;
    rig.legFR.rotation.x = Math.sin(p + 0.45) * 0.78;
    rig.legBL.rotation.x = -Math.sin(p) * 0.78;
    rig.legBR.rotation.x = -Math.sin(p + 0.45) * 0.78;
    rig.body.position.y = 0.42 + Math.abs(Math.sin(p)) * 0.055;
    rig.body.rotation.x = Math.cos(p) * 0.08;
    rig.head.rotation.x = -0.18 + Math.sin(elapsed * 12.0) * 0.1;
  } else if (npc.behavior === 'patrol') {
    const p = npc.gaitPhase;
    rig.legFL.rotation.x = Math.sin(p) * 0.58;
    rig.legBR.rotation.x = Math.sin(p + 0.3) * 0.58;
    rig.legFR.rotation.x = -Math.sin(p) * 0.58;
    rig.legBL.rotation.x = -Math.sin(p + 0.3) * 0.58;
    rig.body.position.y = 0.42 + Math.abs(Math.sin(p)) * 0.03;
    rig.body.rotation.x = 0;
    rig.head.rotation.x = 0.05;
  } else {
    rig.legFL.rotation.x *= 0.82;
    rig.legFR.rotation.x *= 0.82;
    rig.legBL.rotation.x *= 0.82;
    rig.legBR.rotation.x *= 0.82;
    rig.body.position.y = 0.42 + Math.sin(elapsed * 3.0) * 0.008;
    rig.body.rotation.x = 0;
    rig.head.rotation.x =
      npc.behavior === 'sniff' ? 0.38 + Math.sin(elapsed * 7.0) * 0.08 : -0.14 + Math.sin(elapsed * 8.0) * 0.06;
  }

  rig.tail.rotation.z = Math.sin(npc.tailPhase) * (npc.behavior === 'alert' || npc.behavior === 'chase' ? 0.52 : 0.28);
  const earPerk = npc.behavior === 'chase' ? -0.25 : npc.behavior === 'alert' ? 0.35 : 0;
  rig.earL.rotation.x = earPerk;
  rig.earR.rotation.x = earPerk;
}

export function createBirdRig(npc: BirdNpcState, mats: WorldMaterialSet): BirdRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const isGull = npc.species === 'gull';
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(isGull ? '#E5E9EA' : '#6F7D82'),
    roughness: 0.72,
    metalness: 0.02,
  });
  const wingTipMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(isGull ? '#36444A' : '#3C4448'),
    roughness: 0.78,
    metalness: 0.02,
  });
  const beakMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(isGull ? '#E09A34' : '#8C6244'),
    roughness: 0.45,
    metalness: 0.05,
  });
  materials.push(bodyMat, wingTipMat, beakMat);

  const scale = isGull ? 1.15 : 0.88;
  const body = new THREE.Group();
  body.scale.setScalar(scale);
  body.position.y = 0.14;
  root.add(body);

  const torsoGeo = new THREE.CapsuleGeometry(0.075, 0.16, 6, 10);
  torsoGeo.rotateX(Math.PI * 0.42);
  const tailGeo = new THREE.BoxGeometry(0.11, 0.018, 0.12);
  geometries.push(torsoGeo, tailGeo);

  const torso = new THREE.Mesh(torsoGeo, bodyMat);
  torso.castShadow = true;
  body.add(torso);

  const tail = new THREE.Mesh(tailGeo, wingTipMat);
  tail.position.set(0, -0.01, -0.15);
  tail.rotation.x = 0.22;
  body.add(tail);

  // Head + beak
  const head = new THREE.Group();
  head.position.set(0, 0.075, 0.125);
  body.add(head);

  const headGeo = new THREE.SphereGeometry(0.055, 10, 8);
  const beakGeo = new THREE.ConeGeometry(0.018, 0.075, 6);
  const legGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4);
  geometries.push(headGeo, beakGeo, legGeo);

  const skull = new THREE.Mesh(headGeo, bodyMat);
  head.add(skull);

  const beak = new THREE.Mesh(beakGeo, beakMat);
  beak.rotation.x = Math.PI * 0.5;
  beak.position.set(0, -0.005, 0.072);
  head.add(beak);

  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, beakMat);
    leg.position.set(sx * 0.032, -0.085, 0);
    body.add(leg);
  }

  // Hinged wings
  const innerWingGeo = new THREE.BoxGeometry(0.2, 0.016, 0.12);
  const outerWingGeo = new THREE.BoxGeometry(0.16, 0.012, 0.09);
  geometries.push(innerWingGeo, outerWingGeo);

  const makeWing = (side: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.06, 0.04, 0.02);

    const inner = new THREE.Mesh(innerWingGeo, bodyMat);
    inner.position.set(side * 0.1, 0, -0.01);
    pivot.add(inner);

    const outer = new THREE.Mesh(outerWingGeo, wingTipMat);
    outer.position.set(side * 0.26, 0, -0.03);
    outer.rotation.y = side * -0.16;
    pivot.add(outer);

    body.add(pivot);
    return pivot;
  };

  const wingL = makeWing(-1);
  const wingR = makeWing(1);

  const shadowGeo = new THREE.CircleGeometry(0.18, 12);
  geometries.push(shadowGeo);
  const shadow = new THREE.Mesh(shadowGeo, mats.contactShadow);
  shadow.rotation.x = -Math.PI * 0.5;
  shadow.position.y = 0.012;
  root.add(shadow);

  root.position.set(npc.x, npc.y, npc.z);
  root.rotation.y = npc.yaw;

  return {
    root,
    body,
    head,
    wingL,
    wingR,
    shadow,
    geometries,
    materials,
  };
}

export function updateBirdVisual(rig: BirdRig, npc: BirdNpcState): void {
  rig.root.position.set(npc.x, npc.y, npc.z);
  rig.root.rotation.y = npc.yaw;

  if (npc.mode === 'perched') {
    rig.body.rotation.x = 0;
    rig.wingL.rotation.z = 1.15;
    rig.wingR.rotation.z = -1.15;
    rig.wingL.rotation.x = 0.25;
    rig.wingR.rotation.x = 0.25;
    const peck = Math.max(0, Math.sin(npc.peckPhase) - 0.55) * 1.1;
    rig.head.rotation.x = peck * 0.85;
    rig.head.rotation.y = npc.headTurn ?? 0;
    rig.shadow.visible = true;
  } else {
    rig.body.rotation.x = npc.pitch;
    const flap = Math.sin(npc.wingPhase) * (npc.mode === 'soaring' ? 0.42 : 0.72);
    rig.wingL.rotation.z = flap;
    rig.wingR.rotation.z = -flap;
    rig.wingL.rotation.x = 0;
    rig.wingR.rotation.x = 0;
    rig.head.rotation.x = 0;
    rig.head.rotation.y = 0;
    rig.shadow.visible = false;
  }
}
