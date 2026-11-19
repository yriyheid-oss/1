import * as THREE from 'three';
import type { SolidCollider, WalkSurface } from '../systems/parkour';
import type { WorldMaterialSet } from './materials';

function makePitchedRoofGeometry(spanWidth: number, length: number, height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-spanWidth * 0.5, 0);
  shape.lineTo(0, height);
  shape.lineTo(spanWidth * 0.5, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: length,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -length * 0.5);
  return geo;
}

export interface BuildingPhysics {
  gableSurface: WalkSurface | null;
  colliders: SolidCollider[];
  chimneyTop: { x: number; y: number; z: number } | null;
}

export function getBuildingPhysics(
  idPrefix: string,
  originX: number,
  originZ: number,
  width: number,
  depth: number,
  topY: number,
  withGable: boolean
): BuildingPhysics {
  const colliders: SolidCollider[] = [
    {
      id: `${idPrefix}_body`,
      minX: originX - width * 0.5 + 0.08,
      maxX: originX + width * 0.5 - 0.08,
      minZ: originZ - depth * 0.5 + 0.08,
      maxZ: originZ + depth * 0.5 - 0.08,
      minY: -1.0,
      maxY: topY - 0.14,
    },
  ];

  if (!withGable) {
    return { gableSurface: null, colliders, chimneyTop: null };
  }

  const gableSpan = Math.min(2.3, width * 0.36);
  const gableLen = Math.min(2.8, depth * 0.44);
  const gableH = 1.25;
  const gx = -width * 0.32;
  const gz = -depth * 0.25;

  const dormerHalfW = (gableSpan * 0.88) * 0.5;
  const dormerHalfL = (gableLen * 0.88) * 0.5;

  const cx = width * 0.34;
  const cz = -depth * 0.34;

  colliders.push(
    {
      id: `${idPrefix}_dormer_wall`,
      minX: originX + gx - dormerHalfW,
      maxX: originX + gx + dormerHalfW,
      minZ: originZ + gz - dormerHalfL,
      maxZ: originZ + gz + dormerHalfL,
      minY: topY,
      maxY: topY + 0.52,
    },
    {
      id: `${idPrefix}_chimney`,
      minX: originX + cx - 0.29,
      maxX: originX + cx + 0.29,
      minZ: originZ + cz - 0.29,
      maxZ: originZ + cz + 0.29,
      minY: topY,
      maxY: topY + 2.25,
    }
  );

  const gableSurface: WalkSurface = {
    id: `${idPrefix}_gable_roof`,
    minX: originX + gx - gableSpan * 0.5 - 0.04,
    maxX: originX + gx + gableSpan * 0.5 + 0.04,
    minZ: originZ + gz - gableLen * 0.5 - 0.04,
    maxZ: originZ + gz + gableLen * 0.5 + 0.04,
    topY: topY + 0.49,
    kind: 'roof',
    gable: {
      axis: 'z',
      center: originX + gx,
      halfSpan: gableSpan * 0.5 + 0.04,
      eaveY: topY + 0.49,
      ridgeY: topY + 0.49 + gableH + 0.05,
    },
  };

  return {
    gableSurface,
    colliders,
    chimneyTop: {
      x: originX + cx,
      y: topY + 2.38,
      z: originZ + cz,
    },
  };
}

export function buildRooftopBuilding(
  width: number,
  depth: number,
  topY: number,
  mats: WorldMaterialSet,
  withGable = true,
  withRailing = false,
  withLivingProps = false
): THREE.Group {
  const g = new THREE.Group();
  const deckThickness = 0.24;
  const masonryTop = topY - deckThickness - 0.02;
  const baseHeight = masonryTop + 2.6;

  // 1. Weathered Venetian masonry tower body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, baseHeight, depth),
    mats.masonryWall
  );
  body.position.set(0, masonryTop - baseHeight * 0.5, 0);
  body.receiveShadow = true;
  body.castShadow = true;
  g.add(body);

  // 2. Waterline stone plinth collar + recessed canal boat-arch relief
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.24, 1.15, depth + 0.24),
    mats.darkIron
  );
  plinth.position.set(0, 0.32, 0);
  plinth.receiveShadow = true;
  g.add(plinth);

  // Venetian stone pilasters + dark recessed boat-gate arch near canal water
  if (width >= 5.5) {
    const gateW = Math.min(1.85, width * 0.32);
    const gateVoid = new THREE.Mesh(
      new THREE.BoxGeometry(gateW, 1.35, 0.12),
      mats.darkIron
    );
    gateVoid.position.set(0, 0.55, depth * 0.5 + 0.04);
    g.add(gateVoid);

    const gateArch = new THREE.Mesh(
      new THREE.TorusGeometry(gateW * 0.5, 0.08, 8, 16, Math.PI),
      mats.brassTrim
    );
    gateArch.position.set(0, 1.22, depth * 0.5 + 0.08);
    g.add(gateArch);
  }

  // Vertical corner copper rainwater downspouts bolted to masonry
  const pipeH = topY + 0.6;
  const downspoutGeo = new THREE.CylinderGeometry(0.055, 0.055, pipeH, 8);
  const strapGeo = new THREE.TorusGeometry(0.075, 0.018, 6, 10);
  for (const sx of [-1, 1]) {
    const px = sx * (width * 0.48);
    const pz = depth * 0.5 + 0.08;
    const pipe = new THREE.Mesh(downspoutGeo, mats.verdigrisRoof);
    pipe.position.set(px, pipeH * 0.5 - 0.5, pz);
    g.add(pipe);

    for (const sy of [0.8, topY - 1.2]) {
      const strap = new THREE.Mesh(strapGeo, mats.brassTrim);
      strap.rotation.x = Math.PI * 0.5;
      strap.position.set(px, sy, pz);
      g.add(strap);
    }
  }

  // 3. Wet slate rooftop walking deck
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.22, deckThickness, depth + 0.22),
    mats.slateRoof
  );
  deck.position.set(0, topY - deckThickness * 0.5, 0);
  deck.receiveShadow = true;
  deck.castShadow = true;
  g.add(deck);

  // Brass rain-gutter trim framing rooftop perimeter
  const gutterF = new THREE.Mesh(new THREE.BoxGeometry(width + 0.34, 0.06, 0.09), mats.brassTrim);
  gutterF.position.set(0, topY - 0.04, depth * 0.5 + 0.13);
  g.add(gutterF);
  const gutterB = gutterF.clone();
  gutterB.position.z = -(depth * 0.5 + 0.13);
  g.add(gutterB);

  // 4. Stepped tarnished brass cornice eaves under deck
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.38, 0.11, depth + 0.38),
    mats.brassTrim
  );
  cornice.position.set(0, topY - 0.27, 0);
  cornice.castShadow = true;
  g.add(cornice);

  // Exposed timber rafter corbels along front & back eaves
  const rafterCount = Math.max(3, Math.floor(width / 1.1));
  const rafterGeo = new THREE.BoxGeometry(0.11, 0.14, 0.28);
  for (let i = 0; i < rafterCount; i++) {
    const rx = -width * 0.42 + (i / Math.max(1, rafterCount - 1)) * (width * 0.84);
    for (const side of [-1, 1]) {
      const rafter = new THREE.Mesh(rafterGeo, mats.woodCatwalk);
      rafter.position.set(rx, topY - 0.39, side * (depth * 0.5 + 0.08));
      g.add(rafter);
    }
  }

  // 5. Recessed Venetian arched windows on front/back masonry
  const winW = Math.min(0.68, width * 0.18);
  const winH = 0.92;
  const winPaneGeo = new THREE.BoxGeometry(winW, winH, 0.05);
  const frameGeo = new THREE.BoxGeometry(winW + 0.16, winH + 0.18, 0.1);
  const sillGeo = new THREE.BoxGeometry(winW + 0.24, 0.08, 0.18);
  const archGeo = new THREE.TorusGeometry(winW * 0.5, 0.055, 8, 16, Math.PI);
  const barVGeo = new THREE.BoxGeometry(0.035, winH, 0.07);
  const barHGeo = new THREE.BoxGeometry(winW, 0.035, 0.07);
  const shutterGeo = new THREE.BoxGeometry(0.18, winH + 0.04, 0.05);

  for (const sideX of [-1, 1]) {
    for (const faceZ of [1, -1]) {
      if (faceZ === -1 && topY < 3.4) continue;
      const wx = sideX * (width * 0.25);
      const wy = topY - 1.5;
      const wz = faceZ * (depth * 0.5 + 0.01);

      const frame = new THREE.Mesh(frameGeo, mats.darkIron);
      frame.position.set(wx, wy, wz);
      g.add(frame);

      const arch = new THREE.Mesh(archGeo, mats.brassTrim);
      arch.position.set(wx, wy + winH * 0.5 + 0.03, wz + faceZ * 0.045);
      g.add(arch);

      const pane = new THREE.Mesh(winPaneGeo, mats.windowGlass);
      pane.position.set(wx, wy, wz + faceZ * 0.032);
      g.add(pane);

      // Louvered weathered wooden shutters flanking each window
      for (const sSide of [-1, 1]) {
        const shutter = new THREE.Mesh(shutterGeo, mats.verdigrisRoof);
        shutter.position.set(wx + sSide * (winW * 0.5 + 0.18), wy, wz + faceZ * 0.04);
        shutter.rotation.y = faceZ * -sSide * 0.18;
        g.add(shutter);
      }

      const barV = new THREE.Mesh(barVGeo, mats.darkIron);
      barV.position.set(wx, wy, wz + faceZ * 0.048);
      g.add(barV);

      const barH = new THREE.Mesh(barHGeo, mats.darkIron);
      barH.position.set(wx, wy + 0.08, wz + faceZ * 0.048);
      g.add(barH);

      const sill = new THREE.Mesh(sillGeo, mats.brassTrim);
      sill.position.set(wx, wy - winH * 0.5 - 0.06, wz + faceZ * 0.05);
      g.add(sill);
    }
  }

  // 6. Pitched Venetian Verdigris Gable Wing + Copper Chimney Stack
  if (withGable) {
    const gableSpan = Math.min(2.3, width * 0.36);
    const gableLen = Math.min(2.8, depth * 0.44);
    const gableH = 1.25;
    const gx = -width * 0.32;
    const gz = -depth * 0.25;

    const dormerBase = new THREE.Mesh(
      new THREE.BoxGeometry(gableSpan * 0.88, 0.45, gableLen * 0.88),
      mats.masonryWall
    );
    dormerBase.position.set(gx, topY + 0.22, gz);
    dormerBase.castShadow = true;
    dormerBase.receiveShadow = true;
    g.add(dormerBase);

    // Organic damp moss tufts creeping along dormer base seam
    const mossOffsets: Array<[number, number, number]> = [
      [0.44, 0.32, 0.09],
      [0.45, 0.14, 0.07],
      [0.41, 0.42, 0.06],
    ];
    for (const [ox, oz, rad] of mossOffsets) {
      const tuft = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 0), mats.mossFoliage);
      tuft.position.set(gx + gableSpan * ox, topY + rad * 0.45, gz + gableLen * oz);
      tuft.scale.set(1.25, 0.55, 1.35);
      tuft.rotation.y = ox * 3.1;
      g.add(tuft);
    }

    const roofGeo = makePitchedRoofGeometry(gableSpan, gableLen, gableH);
    const pitchedRoof = new THREE.Mesh(roofGeo, mats.verdigrisRoof);
    pitchedRoof.position.set(gx, topY + 0.44, gz);
    pitchedRoof.castShadow = true;
    pitchedRoof.receiveShadow = true;
    g.add(pitchedRoof);

    // Brass circular attic porthole window on front gable face
    const bullseyeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.038, 8, 18),
      mats.brassTrim
    );
    bullseyeRing.position.set(gx, topY + 0.88, gz + gableLen * 0.5 + 0.05);
    g.add(bullseyeRing);

    const bullseyeGlass = new THREE.Mesh(
      new THREE.CircleGeometry(0.19, 16),
      mats.windowGlass
    );
    bullseyeGlass.position.set(gx, topY + 0.88, gz + gableLen * 0.5 + 0.055);
    g.add(bullseyeGlass);

    // Brass ridge cap beam + rooftop finial
    const ridgeBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, gableLen + 0.16, 8),
      mats.brassTrim
    );
    ridgeBeam.rotation.x = Math.PI * 0.5;
    ridgeBeam.position.set(gx, topY + 0.44 + gableH, gz);
    g.add(ridgeBeam);

    // Ornate brick, copper & terracotta chimney stack on opposite rear corner
    const cx = width * 0.34;
    const cz = -depth * 0.34;
    const brickPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.55, 0.56),
      mats.masonryWall
    );
    brickPlinth.position.set(cx, topY + 0.27, cz);
    brickPlinth.castShadow = true;
    g.add(brickPlinth);

    const flue = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.21, 1.55, 14),
      mats.brassTrim
    );
    flue.position.set(cx, topY + 1.25, cz);
    flue.castShadow = true;
    g.add(flue);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 0.24, 12),
      mats.terracottaPot
    );
    pot.position.set(cx, topY + 2.08, cz);
    g.add(pot);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.032, 8, 16),
      mats.darkIron
    );
    collar.rotation.x = Math.PI * 0.5;
    collar.position.set(cx, topY + 1.92, cz);
    g.add(collar);

    const cowl = new THREE.Mesh(
      new THREE.ConeGeometry(0.29, 0.22, 12),
      mats.darkIron
    );
    cowl.position.set(cx, topY + 2.28, cz);
    g.add(cowl);
  }

  // 7. Living rooftop details (terracotta moss planter, weathered crate, brass pressure gauge)
  if (withLivingProps) {
    const potX = width * 0.36;
    const potZ = depth * 0.32;
    const planter = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.28, 0.36),
      mats.terracottaPot
    );
    planter.position.set(potX, topY + 0.14, potZ);
    planter.castShadow = true;
    g.add(planter);

    for (let k = -1; k <= 1; k++) {
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.16 - Math.abs(k) * 0.02, 1),
        mats.mossFoliage
      );
      bush.position.set(potX + k * 0.18, topY + 0.31, potZ);
      bush.scale.set(1.1, 0.85, 1.0);
      g.add(bush);
    }

    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.42, 0.52),
      mats.woodCatwalk
    );
    crate.position.set(-width * 0.34, topY + 0.21, depth * 0.34);
    crate.rotation.y = 0.24;
    crate.castShadow = true;
    crate.receiveShadow = true;
    g.add(crate);

    const crateBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.06, 0.54),
      mats.darkIron
    );
    crateBand.position.copy(crate.position);
    crateBand.rotation.copy(crate.rotation);
    g.add(crateBand);
  }

  // 8. Optional wrought-iron rooftop perimeter balustrade along rear edge
  if (withRailing) {
    const railLen = width * 0.72;
    const railZ = -depth * 0.46;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.045, 0.045), mats.darkIron);
    topBar.position.set(0, topY + 0.52, railZ);
    g.add(topBar);

    const postCount = 6;
    const postGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.52, 6);
    for (let i = 0; i < postCount; i++) {
      const px = -railLen * 0.5 + (i / (postCount - 1)) * railLen;
      const post = new THREE.Mesh(postGeo, mats.darkIron);
      post.position.set(px, topY + 0.26, railZ);
      g.add(post);
    }
  }

  return g;
}

export function buildLanternPost(mats: WorldMaterialSet, withPointLight = false): THREE.Group {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.24, 8), mats.darkIron);
  base.position.y = 0.12;
  base.castShadow = true;
  g.add(base);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 12), mats.brassTrim);
  collar.rotation.x = Math.PI * 0.5;
  collar.position.y = 0.25;
  g.add(collar);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.32, 10), mats.darkIron);
  pole.position.y = 0.9;
  pole.castShadow = true;
  g.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.05), mats.brassTrim);
  arm.position.set(0.14, 1.54, 0);
  g.add(arm);

  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.035), mats.darkIron);
  brace.position.set(0.1, 1.42, 0);
  brace.rotation.z = 0.65;
  g.add(brace);

  const lx = 0.28;
  const ly = 1.32;
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 2), mats.lanternGlow);
  core.position.set(lx, ly, 0);
  g.add(core);

  const ribGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
    const rib = new THREE.Mesh(ribGeo, mats.darkIron);
    rib.position.set(lx + Math.cos(a) * 0.14, ly, Math.sin(a) * 0.14);
    g.add(rib);
  }

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.2, 8), mats.darkIron);
  hood.position.set(lx, ly + 0.19, 0);
  g.add(hood);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), mats.brassTrim);
  finial.position.set(lx, ly + 0.32, 0);
  g.add(finial);

  const haloCone = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 2.1, 20, 1, true),
    mats.beamMaterial
  );
  haloCone.position.set(lx, ly - 0.92, 0);
  g.add(haloCone);

  if (withPointLight) {
    const pt = new THREE.PointLight('#F4A949', 5.2, 10.5, 1.5);
    pt.position.set(lx, ly - 0.05, 0);
    g.add(pt);
  }

  return g;
}

export function buildClockworkGear(
  radius: number,
  teethCount: number,
  thickness: number,
  mats: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();

  const outerRim = new THREE.Mesh(
    new THREE.TorusGeometry(radius, thickness * 0.38, 10, 36),
    mats.brassTrim
  );
  outerRim.castShadow = true;
  g.add(outerRim);

  const innerTrack = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.88, thickness * 0.22, 8, 32),
    mats.darkIron
  );
  g.add(innerTrack);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, thickness * 1.35, 18),
    mats.darkIron
  );
  hub.rotation.x = Math.PI * 0.5;
  hub.castShadow = true;
  g.add(hub);

  const axleCap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.11, radius * 0.11, thickness * 1.65, 12),
    mats.brassTrim
  );
  axleCap.rotation.x = Math.PI * 0.5;
  g.add(axleCap);

  const spokeGeo = new THREE.BoxGeometry(radius * 1.78, thickness * 0.34, thickness * 0.42);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(spokeGeo, mats.brassTrim);
    spoke.rotation.z = (i * Math.PI) / 3;
    spoke.castShadow = true;
    g.add(spoke);
  }

  const toothGeo = new THREE.BoxGeometry(radius * 0.15, radius * 0.21, thickness * 0.82);
  for (let i = 0; i < teethCount; i++) {
    const ang = (i / teethCount) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeo, mats.brassTrim);
    tooth.position.set(
      Math.cos(ang) * (radius + radius * 0.13),
      Math.sin(ang) * (radius + radius * 0.13),
      0
    );
    tooth.rotation.z = ang + Math.PI * 0.5;
    tooth.castShadow = true;
    g.add(tooth);
  }

  return g;
}

export function buildCopperPipeBridge(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  mats: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dy, dz) + 0.28; // slight overlap at both rooftop edges so zero seam gap

  const pipeGroup = new THREE.Group();
  pipeGroup.position.set((x1 + x2) * 0.5, (y1 + y2) * 0.5 - 0.16, (z1 + z2) * 0.5);
  pipeGroup.lookAt(x2, y2 - 0.16, z2);

  for (const offsetX of [-0.26, 0.26]) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.125, len, 12),
      mats.verdigrisRoof
    );
    pipe.rotation.x = Math.PI * 0.5;
    pipe.position.set(offsetX, -0.02, 0);
    pipe.castShadow = true;
    pipe.receiveShadow = true;
    pipeGroup.add(pipe);
  }

  // Solid wider timber plank deck (top surface sits exact y1 -> y2)
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.08, len), mats.woodCatwalk);
  plank.position.y = 0.12;
  plank.castShadow = true;
  plank.receiveShadow = true;
  pipeGroup.add(plank);

  // Low brass curb rails & wood cleats for catwalk readability
  for (const curbX of [-0.46, 0.46]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, len), mats.brassTrim);
    curb.position.set(curbX, 0.18, 0);
    pipeGroup.add(curb);
  }

  for (const zOff of [-len * 0.42, -len * 0.14, len * 0.14, len * 0.42]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.11), mats.brassTrim);
    bracket.position.set(0, 0.02, zOff);
    pipeGroup.add(bracket);
  }

  g.add(pipeGroup);
  return g;
}

export function buildHangingCable(
  start: THREE.Vector3,
  end: THREE.Vector3,
  sag: number,
  mats: WorldMaterialSet
): THREE.Mesh {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.CatmullRomCurve3([start, mid, end]);
  const geo = new THREE.TubeGeometry(curve, 16, 0.022, 6, false);
  return new THREE.Mesh(geo, mats.darkIron);
}

export function buildCanalMooringPost(x: number, z: number, height: number, mats: WorldMaterialSet): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.14, height + 1.0, 10),
    mats.woodCatwalk
  );
  post.position.y = height * 0.5 - 0.3;
  post.castShadow = true;
  g.add(post);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.16, 10), mats.brassTrim);
  cap.position.y = height + 0.25;
  g.add(cap);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 6, 12), mats.brassTrim);
  ring.rotation.x = Math.PI * 0.5;
  ring.position.y = height * 0.62;
  g.add(ring);

  return g;
}

/**
 * Venetian wooden skiff moored in the canal with brass bow lantern & thwart bench.
 */
export function buildCanalSkiff(mats: WorldMaterialSet): THREE.Group {
  const g = new THREE.Group();

  const hull = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.34, 3.1), mats.woodCatwalk);
  hull.position.y = 0.06;
  hull.castShadow = true;
  hull.receiveShadow = true;
  g.add(hull);

  // Tapered prow & stern peaks
  const prowGeo = new THREE.ConeGeometry(0.52, 1.05, 4);
  prowGeo.rotateY(Math.PI * 0.25);
  prowGeo.rotateX(Math.PI * 0.5);
  const bow = new THREE.Mesh(prowGeo, mats.woodCatwalk);
  bow.scale.set(1.0, 0.65, 1.0);
  bow.position.set(0, 0.09, 2.02);
  g.add(bow);

  const stern = bow.clone();
  stern.rotation.y = Math.PI;
  stern.position.set(0, 0.09, -2.02);
  g.add(stern);

  // Brass gunwale trim + bench seat
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.34), mats.woodCatwalk);
  bench.position.set(0, 0.24, 0.15);
  g.add(bench);

  const bowCap = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 10), mats.brassTrim);
  bowCap.position.set(0, 0.3, 2.45);
  g.add(bowCap);

  const lanternOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 1), mats.lanternGlow);
  lanternOrb.position.set(0, 0.44, 2.32);
  g.add(lanternOrb);

  return g;
}

/**
 * Distant Venetian clockwork bell-tower (Campanile) framing the misty horizon skyline.
 */
export function buildDistantCampanile(width: number, height: number, mats: WorldMaterialSet): THREE.Group {
  const g = new THREE.Group();

  const shaft = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, width),
    mats.masonryWall
  );
  shaft.position.y = height * 0.5 - 1.5;
  g.add(shaft);

  const belfry = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.12, width * 0.72, width * 1.12),
    mats.darkIron
  );
  belfry.position.y = height - 1.1;
  g.add(belfry);

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(width * 0.85, width * 1.9, 4),
    mats.verdigrisRoof
  );
  spire.rotation.y = Math.PI * 0.25;
  spire.position.y = height - 1.1 + width * 1.3;
  g.add(spire);

  // Glowing golden clock dial on tower face
  const clockRim = new THREE.Mesh(new THREE.TorusGeometry(width * 0.32, 0.08, 8, 20), mats.brassTrim);
  clockRim.position.set(0, height - 2.6, width * 0.52);
  g.add(clockRim);

  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(width * 0.28, 18), mats.windowGlass);
  clockFace.position.set(0, height - 2.6, width * 0.53);
  g.add(clockFace);

  return g;
}

/**
 * Stepped Venetian stone canal embankment / flooded cobblestone quay grounding city blocks along the waterway.
 */
export function buildCanalQuayWall(
  width: number,
  length: number,
  quayY: number,
  mats: WorldMaterialSet
): THREE.Group {
  const g = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(width, quayY + 1.4, length), mats.masonryWall);
  body.position.y = quayY - (quayY + 1.4) * 0.5;
  body.receiveShadow = true;
  g.add(body);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(width + 0.18, 0.16, length + 0.18), mats.slateRoof);
  deck.position.y = quayY - 0.06;
  deck.receiveShadow = true;
  g.add(deck);

  // Partially awash stone steps descending into the canal water
  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.18, 1.4), mats.masonryWall);
    step.position.set(width * 0.52 - s * 0.16, quayY - 0.14 - s * 0.14, length * 0.18);
    g.add(step);
  }

  // Iron dock bollards along the quay rim
  const bollardCount = Math.max(2, Math.floor(length / 7));
  for (let i = 0; i < bollardCount; i++) {
    const bz = -length * 0.4 + (i / Math.max(1, bollardCount - 1)) * (length * 0.8);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.42, 8), mats.darkIron);
    b.position.set(width * 0.42, quayY + 0.2, bz);
    g.add(b);
  }

  return g;
}

/**
 * Venetian masonry arch bridge connecting canal embankments across the flooded avenue.
 */
export function buildStoneCanalBridge(spanX: number, bridgeY: number, depth: number, mats: WorldMaterialSet): THREE.Group {
  const g = new THREE.Group();

  // Bridge deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(spanX, 0.34, depth), mats.slateRoof);
  deck.position.y = bridgeY;
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);

  // Side masonry piers dipping into canal water
  for (const sx of [-1, 1]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.1, bridgeY + 1.2, depth + 0.2), mats.masonryWall);
    pier.position.set(sx * (spanX * 0.46), bridgeY * 0.5 - 0.4, 0);
    g.add(pier);
  }

  // Twin curved masonry arch ribs tucked cleanly underneath the front & back bridge faces
  const archRadius = spanX * 0.28;
  const archGeo = new THREE.TorusGeometry(archRadius, 0.16, 8, 20, Math.PI);
  for (const sz of [-depth * 0.42, depth * 0.42]) {
    const arch = new THREE.Mesh(archGeo, mats.masonryWall);
    arch.position.set(0, bridgeY - archRadius - 0.16, sz);
    g.add(arch);
  }

  // Parapet side rails
  for (const sz of [-depth * 0.44, depth * 0.44]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(spanX, 0.36, 0.14), mats.darkIron);
    rail.position.set(0, bridgeY + 0.32, sz);
    g.add(rail);
  }

  return g;
}

/**
 * Monumental sunken clockwork aqueduct & hydro-dam wall housing the rotating waterwheels.
 */
export function buildClockworkDamWall(width: number, height: number, mats: WorldMaterialSet): THREE.Group {
  const g = new THREE.Group();

  const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, 3.6), mats.masonryWall);
  wall.position.y = height * 0.5 - 1.0;
  wall.receiveShadow = true;
  g.add(wall);

  // Coping stone crest + verdigris pediment
  const crest = new THREE.Mesh(new THREE.BoxGeometry(width + 0.5, 0.42, 4.0), mats.slateRoof);
  crest.position.y = height - 0.9;
  g.add(crest);

  // Heavy iron buttress piers supporting clockwork wheel axles
  for (const px of [-4.8, 2.3]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.4, height + 0.6, 4.2), mats.darkIron);
    pier.position.set(px, height * 0.5 - 0.7, 0.2);
    g.add(pier);

    // Tall copper boiler smokestack behind dam
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 4.6, 12), mats.brassTrim);
    stack.position.set(px + 1.6, height + 1.1, -0.4);
    g.add(stack);
  }

  // Warm recessed sluice arches at waterline
  for (let i = -2; i <= 2; i++) {
    const sx = i * 4.4;
    const archVoid = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 0.3), mats.darkIron);
    archVoid.position.set(sx, 1.1, 1.78);
    g.add(archVoid);

    const archTrim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.14, 8, 16, Math.PI), mats.brassTrim);
    archTrim.position.set(sx, 2.4, 1.84);
    g.add(archTrim);
  }

  return g;
}

/**
 * Partially submerged Venetian storefront awning & half-drowned streetlamp showing the lower city is underwater.
 */
export function buildFloodedShopAwning(mats: WorldMaterialSet): THREE.Group {
  const g = new THREE.Group();

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.25), mats.verdigrisRoof);
  canopy.position.set(0, 0.68, 0);
  canopy.rotation.x = 0.34;
  g.add(canopy);

  for (const sx of [-1.05, 1.05]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.08, 8), mats.darkIron);
    pole.position.set(sx, -0.36, 0.54);
    g.add(pole);
  }

  return g;
}

/**
 * Festive Venetian canal bunting cord with alternating triangular cloth pennants that sway in the breeze.
 */
export function buildBuntingLine(
  start: THREE.Vector3,
  end: THREE.Vector3,
  sag: number,
  mats: WorldMaterialSet
): { group: THREE.Group; flags: THREE.Mesh[]; disposedMats: THREE.Material[]; disposedGeos: THREE.BufferGeometry[] } {
  const group = new THREE.Group();
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.CatmullRomCurve3([start, mid, end]);
  const cordGeo = new THREE.TubeGeometry(curve, 14, 0.015, 5, false);
  group.add(new THREE.Mesh(cordGeo, mats.darkIron));

  const flagShape = new THREE.Shape();
  flagShape.moveTo(-0.14, 0);
  flagShape.lineTo(0.14, 0);
  flagShape.lineTo(0, -0.36);
  flagShape.closePath();
  const flagGeo = new THREE.ShapeGeometry(flagShape);

  const flagColors = ['#D46B43', '#F4A949', '#3F7D70', '#E8D8BE'];
  const flagMats = flagColors.map(
    (hex) =>
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.78,
        metalness: 0.04,
        side: THREE.DoubleSide,
      })
  );

  const flags: THREE.Mesh[] = [];
  const count = 9;
  const dir = new THREE.Vector3().subVectors(end, start).normalize();
  const yaw = Math.atan2(dir.x, dir.z) + Math.PI * 0.5;
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const pt = curve.getPoint(t);
    const mesh = new THREE.Mesh(flagGeo, flagMats[i % flagMats.length]);
    mesh.position.copy(pt);
    mesh.rotation.y = yaw;
    group.add(mesh);
    flags.push(mesh);
  }

  return { group, flags, disposedMats: flagMats, disposedGeos: [cordGeo, flagGeo] };
}

/**
 * Weathered oak harbor wine barrels banded in wrought iron.
 */
export function buildPierBarrels(mats: WorldMaterialSet): THREE.Group {
  const g = new THREE.Group();
  const barrelPositions: Array<[number, number, number]> = [
    [0, 0.34, 0],
    [0.52, 0.34, 0.18],
    [0.24, 0.34, -0.46],
  ];
  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.21, 0.68, 12);
  const hoopGeo = new THREE.TorusGeometry(0.225, 0.018, 6, 14);
  for (const [bx, by, bz] of barrelPositions) {
    const barrel = new THREE.Mesh(bodyGeo, mats.woodCatwalk);
    barrel.position.set(bx, by, bz);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    g.add(barrel);

    for (const hy of [-0.18, 0.18]) {
      const hoop = new THREE.Mesh(hoopGeo, mats.darkIron);
      hoop.rotation.x = Math.PI * 0.5;
      hoop.position.set(bx, by + hy, bz);
      g.add(hoop);
    }
  }
  return g;
}

/**
 * Venetian terracotta urn planted with lush dawn olive-green foliage.
 */
export function buildOlivePot(mats: WorldMaterialSet): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.42, 12), mats.terracottaPot);
  pot.position.y = 0.21;
  pot.castShadow = true;
  g.add(pot);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.032, 6, 14), mats.terracottaPot);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = 0.42;
  g.add(rim);

  const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), mats.mossFoliage);
  crown.position.y = 0.64;
  crown.scale.set(1.05, 1.15, 1.0);
  crown.castShadow = true;
  g.add(crown);
  return g;
}

/**
 * Subtle warm golden dawn sun-shaft beam adding atmospheric depth across canal gaps.
 */
export function buildDawnSunShaft(
  height: number,
  radius: number
): { mesh: THREE.Mesh; geo: THREE.BufferGeometry; mat: THREE.Material } {
  const geo = new THREE.ConeGeometry(radius, height, 18, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: '#FFE0AE',
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.z = -0.34;
  mesh.rotation.x = 0.18;
  return { mesh, geo, mat };
}

/**
 * Composite Venetian Harbor Lighthouse anchoring the expanded southern bay breakwater.
 */
export function buildHarborLighthouse(mats: WorldMaterialSet): THREE.Group {
  const g = new THREE.Group();

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.15, 2.4, 8), mats.darkIron);
  plinth.position.y = 1.2;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.95, 0.24, 8), mats.slateRoof);
  deck.position.y = 2.45;
  deck.receiveShadow = true;
  g.add(deck);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 2.05, 11.2, 12), mats.masonryWall);
  shaft.position.y = 8.1;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  g.add(shaft);

  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.55, 0.55, 12), mats.brassTrim);
  gallery.position.y = 13.85;
  g.add(gallery);

  const rail = new THREE.Mesh(new THREE.TorusGeometry(1.88, 0.05, 6, 16), mats.darkIron);
  rail.rotation.x = Math.PI * 0.5;
  rail.position.y = 14.42;
  g.add(rail);

  const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.65, 10), mats.lanternGlow);
  lanternGlass.position.y = 14.9;
  g.add(lanternGlass);

  const cupola = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.75, 10), mats.verdigrisRoof);
  cupola.position.y = 16.55;
  cupola.castShadow = true;
  g.add(cupola);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.2, 8), mats.brassTrim);
  spire.position.y = 17.9;
  g.add(spire);

  return g;
}

