import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Enemy, KeyColor, Player, SpecialSquare } from '../gameLogic';

const gltfLoader = new GLTFLoader();
const gltfCache = new Map<string, THREE.Group>();

const PLAYER_GLB_URLS: Record<string, string> = {
    determinato: 'https://raw.githubusercontent.com/infostudiografiche-source/asset-modelli-3D-competo/main/determinato.glb',
};

const PLAYER_PALETTE: Record<KeyColor, { primary: number; trim: number; accent: number; emissive: number }> = {
    red: { primary: 0xb02e26, trim: 0xd4a63a, accent: 0xf5b7b1, emissive: 0x450b07 },
    yellow: { primary: 0xd4a017, trim: 0x6b4c1e, accent: 0xfdf2b8, emissive: 0x3b2c04 },
    white: { primary: 0xe6e4de, trim: 0x9aa5b4, accent: 0xffffff, emissive: 0x262b33 },
    black: { primary: 0x262933, trim: 0x8f9ba8, accent: 0x7e8c9e, emissive: 0x0b0c12 },
};

const ENEMY_PALETTE: Record<KeyColor, { body: number; shard: number; core: number }> = {
    black: { body: 0x1b1624, shard: 0x38284d, core: 0x9b59b6 },
    white: { body: 0xd8d6d0, shard: 0xf4f1ea, core: 0xffeaa7 },
    yellow: { body: 0x4a5221, shard: 0xa3c928, core: 0xd4e157 },
    red: { body: 0x2c1614, shard: 0xc0392b, core: 0xff7043 },
};

function addContactShadow(group: THREE.Group, shadowTexture: THREE.Texture, radius = 0.42) {
    const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
    });
    const shadow = new THREE.Mesh(geo, mat);
    shadow.position.y = 0.004;
    shadow.userData.isContactShadow = true;
    group.add(shadow);
}

function createTurnedBase(baseColor: number, trimColor: number, radius = 0.34): THREE.Group {
    const baseGroup = new THREE.Group();

    const profile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(radius, 0),
        new THREE.Vector2(radius, 0.045),
        new THREE.Vector2(radius * 0.86, 0.08),
        new THREE.Vector2(radius * 0.72, 0.095),
        new THREE.Vector2(radius * 0.76, 0.13),
        new THREE.Vector2(0, 0.13),
    ];
    const plinthGeo = new THREE.LatheGeometry(profile, 24);
    const plinthMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.65,
        metalness: 0.15,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    baseGroup.add(plinth);

    const ringGeo = new THREE.TorusGeometry(radius * 0.93, 0.024, 10, 28);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
        color: trimColor,
        roughness: 0.25,
        metalness: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.055;
    baseGroup.add(ring);

    return baseGroup;
}

export function createPlayerPawn(
    player: Player,
    shadowTexture: THREE.Texture,
    isGhost = false
): THREE.Group {
    const group = new THREE.Group();
    const pal = PLAYER_PALETTE[player.color];
    addContactShadow(group, shadowTexture, 0.46);

    const base = createTurnedBase(0x2a1d17, pal.primary, 0.35);
    group.add(base);

    const armorMat = new THREE.MeshStandardMaterial({
        color: pal.primary,
        roughness: 0.38,
        metalness: 0.55,
    });
    const trimMat = new THREE.MeshStandardMaterial({
        color: pal.trim,
        roughness: 0.24,
        metalness: 0.88,
    });
    const clothMat = new THREE.MeshStandardMaterial({
        color: pal.primary,
        roughness: 0.82,
        metalness: 0.05,
    });
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xd9c2a7,
        roughness: 0.65,
        metalness: 0.05,
    });

    if (PLAYER_GLB_URLS[player.class]) {
        const glbUrl = PLAYER_GLB_URLS[player.class];
        const innerModelGroup = new THREE.Group();
        group.add(innerModelGroup);

        if (gltfCache.has(glbUrl)) {
            const cachedScene = gltfCache.get(glbUrl)!.clone(true);
            innerModelGroup.add(cachedScene);
        } else {
            const placeholder = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 12), armorMat);
            placeholder.position.y = 0.35;
            innerModelGroup.add(placeholder);

            gltfLoader.loadAsync(glbUrl).then((gltf) => {
                const scene = gltf.scene;
                setupLoadedGLB(scene);
                gltfCache.set(glbUrl, scene);

                innerModelGroup.clear();
                innerModelGroup.add(scene.clone(true));
            }).catch(err => {
                console.warn(`Errore caricamento GLB per ${player.class}:`, err);
            });
        }
    } else if (player.class === 'determinato') {
        // --- DETERMINATO (Left figurine in reference): Faceted geometric body + geometric crown + polyhedral staff ---
        const bodyPts = [
            new THREE.Vector2(0.01, 0.13),
            new THREE.Vector2(0.24, 0.13),
            new THREE.Vector2(0.18, 0.42),
            new THREE.Vector2(0.14, 0.72),
            new THREE.Vector2(0.01, 0.72),
        ];
        const body = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 6), armorMat); // 6-sided faceted low-poly look
        body.castShadow = true;
        group.add(body);

        // Gold trim bands
        const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 6, 12), trimMat);
        band1.rotation.x = Math.PI / 2;
        band1.position.y = 0.28;
        const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 12), trimMat);
        band2.rotation.x = Math.PI / 2;
        band2.position.y = 0.52;
        group.add(band1, band2);

        // Angular faceted hood / headpiece
        const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.22, 6), armorMat);
        hood.position.set(0, 0.83, 0);
        hood.castShadow = true;
        const hoodCap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.12, 6), trimMat);
        hoodCap.position.set(0, 0.98, 0);
        group.add(hood, hoodCap);

        // Geometric Staff on right with polyhedral cage
        const staffRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), trimMat);
        staffRod.position.set(0.26, 0.52, 0.04);
        staffRod.castShadow = true;
        
        const cageMat = new THREE.MeshStandardMaterial({
            color: pal.trim,
            roughness: 0.2,
            metalness: 0.9,
            wireframe: true,
        });
        const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), cageMat);
        cage.position.set(0.26, 1.04, 0.04);
        cage.userData.spinAnim = true;

        const orbMat = new THREE.MeshStandardMaterial({
            color: pal.accent,
            emissive: pal.trim,
            emissiveIntensity: 0.9,
            roughness: 0.1,
            metalness: 0.2,
        });
        const cageOrb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), orbMat);
        cageOrb.position.set(0.26, 1.04, 0.04);

        group.add(staffRod, cage, cageOrb);

    } else if (player.class === 'intuitivo') {
        // --- INTUITIVO (Middle figurine in reference): Smooth tapered column + golden spiral vine + celestial crescent top ---
        const colPts = [
            new THREE.Vector2(0.01, 0.13),
            new THREE.Vector2(0.22, 0.13),
            new THREE.Vector2(0.14, 0.45),
            new THREE.Vector2(0.12, 0.72),
            new THREE.Vector2(0.01, 0.72),
        ];
        const column = new THREE.Mesh(new THREE.LatheGeometry(colPts, 24), clothMat);
        column.castShadow = true;
        group.add(column);

        // Helical golden spiral vine winding around the column
        const spiralCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.16, 0.15, 0),
            new THREE.Vector3(0, 0.28, 0.16),
            new THREE.Vector3(-0.16, 0.42, 0),
            new THREE.Vector3(0, 0.56, -0.16),
            new THREE.Vector3(0.14, 0.70, 0),
        ]);
        const spiralTube = new THREE.Mesh(new THREE.TubeGeometry(spiralCurve, 32, 0.022, 10, false), trimMat);
        group.add(spiralTube);

        // Flat disc and crescent moon at the summit
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.025, 24), armorMat);
        disc.position.y = 0.74;
        const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 10, 24, Math.PI * 1.5), trimMat);
        crescent.position.set(0, 0.88, 0);
        crescent.rotation.x = Math.PI / 2;
        group.add(disc, crescent);

        // Organic celestial staff on right holding a luminous orb
        const staffCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.25, 0.13, 0.05),
            new THREE.Vector3(0.27, 0.5, 0.03),
            new THREE.Vector3(0.22, 0.85, 0.08),
            new THREE.Vector3(0.28, 1.05, 0.02),
        ]);
        const staffMesh = new THREE.Mesh(new THREE.TubeGeometry(staffCurve, 20, 0.018, 8, false), trimMat);
        staffMesh.castShadow = true;

        const orbMat = new THREE.MeshStandardMaterial({
            color: pal.accent,
            emissive: pal.trim,
            emissiveIntensity: 1.0,
            roughness: 0.1,
            metalness: 0.1,
        });
        const staffOrb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), orbMat);
        staffOrb.position.set(0.28, 1.05, 0.02);
        staffOrb.userData.floatAnim = true;
        group.add(staffMesh, staffOrb);

    } else {
        // --- PACIFICO (Right figurine in reference): Flowing bell-shaped draped robe + spherical head + floating halo + orbiting atomic ring ---
        const robePts = [
            new THREE.Vector2(0.01, 0.13),
            new THREE.Vector2(0.26, 0.13),
            new THREE.Vector2(0.16, 0.42),
            new THREE.Vector2(0.12, 0.65),
            new THREE.Vector2(0.08, 0.74),
            new THREE.Vector2(0.01, 0.74),
        ];
        const robe = new THREE.Mesh(new THREE.LatheGeometry(robePts, 24), clothMat);
        robe.castShadow = true;
        group.add(robe);

        // Base golden ring under robe
        const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 10, 24), trimMat);
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.y = 0.15;
        group.add(baseRing);

        // Smooth spherical head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 18), skinMat);
        head.position.set(0, 0.84, 0);
        head.castShadow = true;
        group.add(head);

        // Floating golden halo ring above head
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 10, 24), trimMat);
        halo.position.set(0, 1.04, 0);
        halo.rotation.x = Math.PI / 2.5;
        halo.userData.spinAnim = true;
        group.add(halo);

        // Floating atomic/orbital ring structure beside the figure
        const atomRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 8, 20), trimMat);
        atomRing.position.set(-0.25, 0.65, 0.08);
        atomRing.rotation.set(0.6, 0.4, 0.8);
        atomRing.userData.spinAnim = true;

        const atomCoreMat = new THREE.MeshStandardMaterial({
            color: pal.accent,
            emissive: pal.trim,
            emissiveIntensity: 0.8,
            roughness: 0.1,
            metalness: 0.2,
        });
        const atomCore = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), atomCoreMat);
        atomCore.position.set(-0.25, 0.65, 0.08);

        group.add(atomRing, atomCore);
    }

    if (isGhost || player.isDead) {
        applyGhostMaterial(group, pal.accent);
    }

    return group;
}

export function createEnemyPawn(
    enemy: Enemy,
    shadowTexture: THREE.Texture
): THREE.Group {
    const group = new THREE.Group();
    const pal = ENEMY_PALETTE[enemy.enemyType];
    const scale = enemy.isFinalBoss ? 1.42 : enemy.isWanderingTitan ? 1.32 : 1.0;

    addContactShadow(group, shadowTexture, 0.48 * scale);

    const innerGroup = new THREE.Group();
    const base = createTurnedBase(0x1e1326, pal.core, 0.36);
    innerGroup.add(base);

    const bodyMat = new THREE.MeshStandardMaterial({
        color: pal.body,
        roughness: 0.48,
        metalness: 0.35,
        flatShading: true,
    });
    const shardMat = new THREE.MeshStandardMaterial({
        color: pal.shard,
        roughness: 0.25,
        metalness: 0.65,
        flatShading: true,
    });
    const coreMat = new THREE.MeshStandardMaterial({
        color: pal.core,
        emissive: pal.core,
        emissiveIntensity: 1.0,
        roughness: 0.15,
        metalness: 0.1,
    });

    if (enemy.isFinalBoss) {
        // L'Ombra Ancestrale: Towering crown of obsidian spires + pulsing heart + tilted ring
        const monolith = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.05, 6), bodyMat);
        monolith.position.y = 0.66;
        monolith.castShadow = true;
        innerGroup.add(monolith);

        for (let i = 0; i < 6; i++) {
            const ang = (i * Math.PI * 2) / 6;
            const spire = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 5), shardMat);
            spire.position.set(Math.cos(ang) * 0.22, 0.42, Math.sin(ang) * 0.22);
            spire.rotation.z = -Math.cos(ang) * 0.28;
            spire.rotation.x = Math.sin(ang) * 0.28;
            spire.castShadow = true;
            innerGroup.add(spire);
        }

        const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), coreMat);
        heart.position.y = 0.85;
        heart.userData.floatAnim = true;

        const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.022, 8, 28), coreMat);
        crownRing.position.y = 0.85;
        crownRing.rotation.x = Math.PI / 2.6;
        crownRing.userData.spinAnim = true;
        innerGroup.add(heart, crownRing);
    } else if (enemy.isWanderingTitan) {
        // Titano Errante: Massive armored stone torso + counter-rotating rings + glowing eye
        const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), bodyMat);
        torso.position.y = 0.45;
        torso.scale.set(1, 1.35, 0.85);
        torso.castShadow = true;
        innerGroup.add(torso);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), shardMat);
        head.position.y = 0.86;
        head.castShadow = true;
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), coreMat);
        eye.position.set(0, 0.86, 0.11);

        const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 24), shardMat);
        ringA.position.y = 0.58;
        ringA.rotation.x = 0.9;
        ringA.userData.spinAnim = true;
        innerGroup.add(head, eye, ringA);
    } else if (enemy.enemyType === 'black') {
        // Oscuro: Jagged obsidian shards circling a dark-violet core
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), coreMat);
        core.position.y = 0.56;
        core.userData.floatAnim = true;
        innerGroup.add(core);

        for (let i = 0; i < 5; i++) {
            const ang = (i * Math.PI * 2) / 5;
            const shard = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.62 + (i % 2) * 0.15, 4), bodyMat);
            shard.position.set(Math.cos(ang) * 0.15, 0.46, Math.sin(ang) * 0.15);
            shard.rotation.z = Math.cos(ang) * 0.18;
            shard.rotation.x = -Math.sin(ang) * 0.18;
            shard.castShadow = true;
            innerGroup.add(shard);
        }
    } else if (enemy.enemyType === 'white') {
        // Luminoso: Sharp crystalline obelisk + broken tilted halo rings
        const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.18, 0.78, 6), shardMat);
        obelisk.position.y = 0.52;
        obelisk.castShadow = true;
        innerGroup.add(obelisk);

        const halo1 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 8, 24), coreMat);
        halo1.position.y = 0.78;
        halo1.rotation.set(0.7, 0.2, 0.4);
        halo1.userData.spinAnim = true;

        const halo2 = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 8, 20), bodyMat);
        halo2.position.y = 0.62;
        halo2.rotation.set(-0.6, 0.4, 0);
        innerGroup.add(halo1, halo2);
    } else if (enemy.enemyType === 'yellow') {
        // Acido: Twisted caustic totem + jagged amber crystals + floating acid spheres
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.19, 0.68, 7), bodyMat);
        stalk.position.y = 0.47;
        stalk.rotation.z = 0.08;
        stalk.castShadow = true;
        innerGroup.add(stalk);

        for (let i = 0; i < 4; i++) {
            const ang = (i * Math.PI) / 2 + 0.3;
            const spike = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), shardMat);
            spike.scale.set(0.7, 1.8, 0.7);
            spike.position.set(Math.cos(ang) * 0.16, 0.42 + i * 0.08, Math.sin(ang) * 0.16);
            spike.rotation.z = -Math.cos(ang) * 0.55;
            spike.rotation.x = Math.sin(ang) * 0.55;
            spike.castShadow = true;
            innerGroup.add(spike);
        }

        const acidOrb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), coreMat);
        acidOrb.position.set(0.03, 0.88, 0);
        acidOrb.userData.floatAnim = true;
        innerGroup.add(acidOrb);
    } else {
        // Ardente: Brazier base + layered flame blades + twin obsidian horns
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.48, 8), bodyMat);
        torso.position.y = 0.37;
        torso.castShadow = true;
        innerGroup.add(torso);

        const flameShape = new THREE.Shape();
        flameShape.moveTo(0, 0);
        flameShape.quadraticCurveTo(0.16, 0.22, 0.05, 0.48);
        flameShape.lineTo(0, 0.62);
        flameShape.lineTo(-0.07, 0.44);
        flameShape.quadraticCurveTo(-0.16, 0.2, 0, 0);
        const flameGeo = new THREE.ExtrudeGeometry(flameShape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008 });
        flameGeo.center();

        const flameA = new THREE.Mesh(flameGeo, coreMat);
        flameA.position.y = 0.72;
        const flameB = new THREE.Mesh(flameGeo, shardMat);
        flameB.position.y = 0.68;
        flameB.rotation.y = Math.PI / 2;
        flameB.scale.setScalar(0.85);
        innerGroup.add(flameA, flameB);

        // Twin curved horns
        const hornGeo = new THREE.ConeGeometry(0.045, 0.34, 8);
        const hornL = new THREE.Mesh(hornGeo, bodyMat);
        hornL.position.set(-0.15, 0.72, 0);
        hornL.rotation.z = 0.48;
        const hornR = new THREE.Mesh(hornGeo, bodyMat);
        hornR.position.set(0.15, 0.72, 0);
        hornR.rotation.z = -0.48;
        innerGroup.add(hornL, hornR);
    }

    innerGroup.scale.setScalar(scale);
    group.add(innerGroup);
    return group;
}

export function createNpcPawn(shadowTexture: THREE.Texture): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, shadowTexture, 0.4);
    group.add(createTurnedBase(0x3a2e25, 0x7fb3d5, 0.32));

    const cloakMat = new THREE.MeshStandardMaterial({
        color: 0x3b596e,
        roughness: 0.85,
        metalness: 0.05,
    });
    const brassMat = new THREE.MeshStandardMaterial({
        color: 0xd4a63a,
        roughness: 0.28,
        metalness: 0.85,
    });
    const lanternMat = new THREE.MeshStandardMaterial({
        color: 0xfff3b0,
        emissive: 0xffb703,
        emissiveIntensity: 1.1,
        roughness: 0.2,
    });

    const robePts = [
        new THREE.Vector2(0.01, 0.13),
        new THREE.Vector2(0.2, 0.13),
        new THREE.Vector2(0.15, 0.42),
        new THREE.Vector2(0.14, 0.62),
        new THREE.Vector2(0.01, 0.65),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(robePts, 16), cloakMat);
    body.castShadow = true;

    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), cloakMat);
    hood.position.set(0, 0.73, 0.02);
    hood.scale.set(1, 1.15, 1.1);
    hood.castShadow = true;

    // Staff & Hanging Lantern
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.86, 8), brassMat);
    staff.position.set(0.21, 0.56, 0.05);
    staff.rotation.z = -0.08;
    staff.castShadow = true;

    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), lanternMat);
    lantern.position.set(0.25, 0.86, 0.08);
    lantern.userData.floatAnim = true;

    group.add(body, hood, staff, lantern);
    return group;
}

export function createMerchantPawn(shadowTexture: THREE.Texture): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, shadowTexture, 0.44);
    group.add(createTurnedBase(0x2b1d38, 0xf0bd17, 0.34));

    const cloudMat = new THREE.MeshStandardMaterial({
        color: 0x9b8ec4,
        roughness: 0.55,
        metalness: 0.1,
    });
    const tunicMat = new THREE.MeshStandardMaterial({
        color: 0x1e6b7b,
        roughness: 0.5,
        metalness: 0.2,
    });
    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xf0bd17,
        roughness: 0.22,
        metalness: 0.9,
    });
    const gemMat = new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        emissive: 0x922b21,
        emissiveIntensity: 0.8,
        roughness: 0.12,
        metalness: 0.2,
    });

    // Swirling genie smoke spiral
    const spiralPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const ang = t * Math.PI * 2.5;
        const r = THREE.MathUtils.lerp(0.04, 0.18, t);
        spiralPts.push(new THREE.Vector3(Math.cos(ang) * r, 0.13 + t * 0.38, Math.sin(ang) * r));
    }
    const swirl = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 24, 0.055, 8, false),
        cloudMat
    );
    swirl.castShadow = true;

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.11, 0.32, 14), tunicMat);
    torso.position.y = 0.62;
    torso.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 14), tunicMat);
    head.position.y = 0.86;

    const turban = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.055, 10, 20), goldMat);
    turban.rotation.x = Math.PI / 2;
    turban.position.y = 0.92;

    const ruby = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), gemMat);
    ruby.position.set(0, 0.94, 0.14);

    // Floating magic lamp
    const lamp = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.08, 0.02),
        new THREE.Vector2(0.09, 0.06),
        new THREE.Vector2(0.04, 0.1),
        new THREE.Vector2(0, 0.11),
    ], 14), goldMat);
    lamp.position.set(-0.23, 0.56, 0.1);
    lamp.userData.floatAnim = true;

    group.add(swirl, torso, head, turban, ruby, lamp);
    return group;
}

export function createTreasureProp(shadowTexture: THREE.Texture): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, shadowTexture, 0.32);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.68, metalness: 0.08 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf0bd17, roughness: 0.25, metalness: 0.88 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.28), woodMat);
    box.position.y = 0.11;
    box.castShadow = true;

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 14, 1, false, 0, Math.PI), woodMat);
    lid.rotation.z = Math.PI / 2;
    lid.position.y = 0.22;
    lid.castShadow = true;

    const bandL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.3), brassMat);
    bandL.position.set(-0.13, 0.14, 0);
    const bandR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.3), brassMat);
    bandR.position.set(0.13, 0.14, 0);

    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.04), brassMat);
    clasp.position.set(0, 0.2, 0.15);

    group.add(box, lid, bandL, bandR, clasp);
    return group;
}

export function createWorldItemProp(shadowTexture: THREE.Texture): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, shadowTexture, 0.28);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5c534a, roughness: 0.75, metalness: 0.1 });
    const relicMat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0284c7,
        emissiveIntensity: 0.8,
        roughness: 0.18,
        metalness: 0.75,
    });
    const hiltMat = new THREE.MeshStandardMaterial({ color: 0xd4a63a, roughness: 0.28, metalness: 0.85 });

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.1, 8), stoneMat);
    pedestal.position.y = 0.05;
    pedestal.castShadow = true;

    const relicGroup = new THREE.Group();
    relicGroup.position.y = 0.34;
    relicGroup.userData.floatAnim = true;
    relicGroup.userData.spinAnim = true;

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.34, 0.015), relicMat);
    blade.position.y = 0.08;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.028, 0.03), hiltMat);
    guard.position.y = -0.08;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 8), hiltMat);
    grip.position.y = -0.14;
    relicGroup.add(blade, guard, grip);

    group.add(pedestal, relicGroup);
    return group;
}

export function createSpecialSquareProp(
    type: SpecialSquare['type'],
    shadowTexture: THREE.Texture
): THREE.Group {
    const group = new THREE.Group();
    addContactShadow(group, shadowTexture, 0.28);

    const palette: Record<SpecialSquare['type'], { color: number; emissive: number }> = {
        blessing: { color: 0xfde047, emissive: 0xca8a04 },
        misfortune: { color: 0xf87171, emissive: 0x991b1b },
        randomEncounter: { color: 0xc084fc, emissive: 0x6b21a8 },
    };
    const p = palette[type];

    const mat = new THREE.MeshStandardMaterial({
        color: p.color,
        emissive: p.emissive,
        emissiveIntensity: 0.85,
        roughness: 0.22,
        metalness: 0.65,
    });
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0xd4a63a,
        roughness: 0.3,
        metalness: 0.85,
    });

    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), mat);
    jewel.position.y = 0.32;
    jewel.castShadow = true;
    jewel.userData.floatAnim = true;
    jewel.userData.spinAnim = true;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 24), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.18;
    ring.userData.spinAnim = true;

    group.add(jewel, ring);
    return group;
}

export function applyGhostMaterial(group: THREE.Group, tintHex: number) {
    group.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.userData.isContactShadow) {
                mesh.visible = false;
                return;
            }
            const ghostMat = new THREE.MeshStandardMaterial({
                color: tintHex,
                emissive: tintHex,
                emissiveIntensity: 0.35,
                transparent: true,
                opacity: 0.42,
                depthWrite: false,
                roughness: 0.3,
                metalness: 0.2,
            });
            mesh.material = ghostMat;
            mesh.castShadow = false;
        }
    });
}

function setupLoadedGLB(scene: THREE.Group) {
    scene.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
                if (!Array.isArray(mesh.material)) {
                    const mat = mesh.material as THREE.MeshStandardMaterial;
                    mat.roughness = Math.min(Math.max(mat.roughness ?? 0.5, 0.1), 0.9);
                    mat.needsUpdate = true;
                }
            }
        }
    });

    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    scene.position.x -= center.x;
    scene.position.y -= box.min.y;
    scene.position.z -= center.z;
    scene.position.y += 0.13;

    const maxDim = Math.max(size.x, size.y, size.z);
    const targetHeight = 0.65;
    if (maxDim > 0) {
        const scale = targetHeight / maxDim;
        scene.scale.setScalar(scale);
    }
}

export function disposeGroupResources(group: THREE.Object3D) {
    group.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => {
                    (m as THREE.MeshStandardMaterial).map?.dispose();
                    m.dispose();
                });
            } else if (mesh.material) {
                (mesh.material as THREE.MeshStandardMaterial).map?.dispose();
                mesh.material.dispose();
            }
        }
    });
}
