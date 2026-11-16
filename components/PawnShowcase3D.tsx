import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Enemy, KeyColor, Player, PlayerClass } from '../gameLogic';
import { createEnemyPawn, createPlayerPawn, disposeGroupResources } from '../three/pawnFactory';
import { createContactShadowTexture, createRuneHaloTexture } from '../three/textures';

export type ShowcaseMode = 'splash_diorama' | 'selection_spotlight' | 'customizer_preview';

export interface ShowcaseHeroSpec {
    playerClass: PlayerClass;
    color: KeyColor;
    label?: string;
}

interface PawnShowcase3DProps {
    mode: ShowcaseMode;
    hero?: ShowcaseHeroSpec;
    heroes?: ShowcaseHeroSpec[];
    className?: string;
    interactive?: boolean;
    onTap?: () => void;
}

function detectSoftwareWebGL(): boolean {
    try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2') || probe.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param) || '');
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
        return false;
    }
}

function createSoftParticleTexture(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 224, 138, 1)');
    grad.addColorStop(0.4, 'rgba(240, 189, 23, 0.55)');
    grad.addColorStop(1, 'rgba(240, 189, 23, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function makeDummyPlayer(spec: ShowcaseHeroSpec, id: number): Player {
    return {
        id,
        name: spec.label || `Eroe ${id}`,
        color: spec.color,
        class: spec.playerClass,
        controller: 'human',
        position: 1,
        level: 1,
        hp: 20,
        maxHp: 20,
        toughness: 1,
        isDead: false,
        pawnImage: '',
        avatar: '',
        equippedWeapon: null,
        inventory: [],
        inventorySize: 4,
        spells: [],
        coins: 0,
        enemiesDefeatedCount: 0,
        keyQuestProgress: 0,
        hasSpawnedMiniBoss: false,
        activeQuestId: null,
        activeQuestHint: null,
        farthestCellReached: 1,
        pendingUpgrades: 0,
        attackDice: [],
        defenseDice: [],
        psychologicalProfile: null,
    };
}

const DEFAULT_HERO_TRIO: ShowcaseHeroSpec[] = [
    { playerClass: 'determinato', color: 'red', label: 'Determinato' },
    { playerClass: 'intuitivo', color: 'yellow', label: 'Intuitivo' },
    { playerClass: 'pacifico', color: 'white', label: 'Pacifico' },
];

const SPLASH_FOUR_HEROES: ShowcaseHeroSpec[] = [
    { playerClass: 'determinato', color: 'red', label: 'Sognatore Rosso' },
    { playerClass: 'intuitivo', color: 'yellow', label: 'Sognatore Giallo' },
    { playerClass: 'pacifico', color: 'white', label: 'Sognatore Bianco' },
    { playerClass: 'intuitivo', color: 'black', label: 'Sognatore Nero' },
];

function makeGoalCenterPawn(): Enemy {
    return {
        id: 999,
        name: 'Risveglio Centrale',
        position: 69,
        isVisible: true,
        pawnImage: '',
        avatar: '',
        hp: 100,
        maxHp: 100,
        level: 10,
        toughness: 3,
        bootyValue: 'high',
        hasBeenAttacked: false,
        enemyType: 'black',
        isFinalBoss: true,
        ownerId: null,
    };
}

export const PawnShowcase3D: React.FC<PawnShowcase3DProps> = ({
    mode,
    hero,
    heroes,
    className = '',
    interactive = true,
    onTap,
}) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [contextLost, setContextLost] = useState(false);

    const onTapRef = useRef(onTap);
    onTapRef.current = onTap;

    const rebuildContentRef = useRef<(() => void) | null>(null);
    const specRef = useRef({ mode, hero, heroes });
    specRef.current = { mode, hero, heroes };

    useEffect(() => {
        rebuildContentRef.current?.();
    }, [mode, hero?.playerClass, hero?.color, JSON.stringify(heroes || [])]);

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        const isSoftwareGl = detectSoftwareWebGL();
        const prefersReducedMotion =
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const width = Math.max(container.clientWidth, 220);
        const height = Math.max(container.clientHeight, 200);

        const scene = new THREE.Scene();
        scene.background = null;

        const camera = new THREE.PerspectiveCamera(
            mode === 'customizer_preview' ? 35 : mode === 'selection_spotlight' ? 37 : 36,
            width / height,
            0.1,
            60
        );

        const applyResponsiveCamera = (activeMode: ShowcaseMode, aspect: number) => {
            const narrowFactor = aspect < 1.05 ? Math.min(1.45, 1.05 / Math.max(0.55, aspect)) : 1;
            if (activeMode === 'customizer_preview') {
                camera.position.set(0, 1.85, 3.95 * narrowFactor);
            } else if (activeMode === 'selection_spotlight') {
                camera.position.set(0, 1.95, 4.75 * narrowFactor);
            } else {
                camera.position.set(0, 2.55, 6.2 * narrowFactor);
            }
        };
        applyResponsiveCamera(mode, width / height);

        const renderer = new THREE.WebGLRenderer({
            antialias: !isSoftwareGl,
            alpha: true,
            powerPreference: 'high-performance',
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = !isSoftwareGl;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        const onContextLost = (e: Event) => {
            e.preventDefault();
            setContextLost(true);
        };
        const onContextRestored = () => {
            setContextLost(false);
        };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);
        renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTex;
        pmrem.dispose();

        // Dreamlike studio lighting (warm gold key + cool moonlit fill + amber rim)
        const hemi = new THREE.HemisphereLight(0xcbd7f6, 0x3a2417, 0.72);
        scene.add(hemi);

        const keyLight = new THREE.DirectionalLight(0xffe7bd, 1.95);
        keyLight.position.set(3.2, 5.4, 3.8);
        keyLight.castShadow = !isSoftwareGl;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 16;
        keyLight.shadow.camera.left = -3.2;
        keyLight.shadow.camera.right = 3.2;
        keyLight.shadow.camera.top = 3.2;
        keyLight.shadow.camera.bottom = -3.2;
        keyLight.shadow.bias = -0.0005;
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x95b4ff, 0.85);
        rimLight.position.set(-3.6, 3.1, -3.5);
        scene.add(rimLight);

        const underGlow = new THREE.PointLight(0xf0bd17, 1.1, 6, 1.6);
        underGlow.position.set(0, 1.25, 0.25);
        scene.add(underGlow);

        const contactShadowTex = createContactShadowTexture();
        const runeHaloTex = createRuneHaloTexture('#f0bd17');
        const particleTex = createSoftParticleTexture();

        // Permanent Carved Walnut & Brass Plinth
        const plinthGroup = new THREE.Group();
        scene.add(plinthGroup);

        const plinthRadius =
            mode === 'customizer_preview'
                ? 0.86
                : mode === 'splash_diorama'
                ? 2.02
                : 1.72;
        const plinthProfile = [
            new THREE.Vector2(0, -0.26),
            new THREE.Vector2(plinthRadius * 1.06, -0.26),
            new THREE.Vector2(plinthRadius * 1.06, -0.18),
            new THREE.Vector2(plinthRadius * 0.98, -0.12),
            new THREE.Vector2(plinthRadius * 0.93, -0.05),
            new THREE.Vector2(plinthRadius, 0.0),
            new THREE.Vector2(0, 0.0),
        ];
        const plinthGeo = new THREE.LatheGeometry(plinthProfile, 48);
        const walnutMat = new THREE.MeshStandardMaterial({
            color: 0x3b2316,
            roughness: 0.52,
            metalness: 0.14,
        });
        const plinthMesh = new THREE.Mesh(plinthGeo, walnutMat);
        plinthMesh.receiveShadow = true;
        plinthGroup.add(plinthMesh);

        const brassMat = new THREE.MeshStandardMaterial({
            color: 0xd4a63a,
            roughness: 0.26,
            metalness: 0.86,
        });
        const brassTrimGeo = new THREE.TorusGeometry(plinthRadius * 0.99, 0.024, 12, 56);
        brassTrimGeo.rotateX(Math.PI / 2);
        const brassTrim = new THREE.Mesh(brassTrimGeo, brassMat);
        brassTrim.position.y = -0.005;
        plinthGroup.add(brassTrim);

        const innerTrimGeo = new THREE.TorusGeometry(plinthRadius * 0.72, 0.012, 10, 48);
        innerTrimGeo.rotateX(Math.PI / 2);
        const innerTrim = new THREE.Mesh(innerTrimGeo, brassMat);
        innerTrim.position.y = 0.003;
        plinthGroup.add(innerTrim);

        const haloPlaneGeo = new THREE.PlaneGeometry(plinthRadius * 1.9, plinthRadius * 1.9);
        haloPlaneGeo.rotateX(-Math.PI / 2);
        const haloPlaneMat = new THREE.MeshBasicMaterial({
            map: runeHaloTex,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const haloPlane = new THREE.Mesh(haloPlaneGeo, haloPlaneMat);
        haloPlane.position.y = 0.006;
        plinthGroup.add(haloPlane);

        // Floating Golden Dream Motes
        const moteCount = isSoftwareGl
            ? 20
            : mode === 'splash_diorama'
            ? 72
            : 40;
        const motePositions = new Float32Array(moteCount * 3);
        const moteSpeeds = new Float32Array(moteCount);
        const moteSpread = mode === 'splash_diorama' ? plinthRadius * 2.1 : plinthRadius * 1.15;
        const moteMaxHeight = mode === 'splash_diorama' ? 3.1 : 2.1;
        for (let i = 0; i < moteCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 0.35 + Math.random() * moteSpread;
            motePositions[i * 3] = Math.cos(angle) * r;
            motePositions[i * 3 + 1] = 0.1 + Math.random() * (moteMaxHeight - 0.2);
            motePositions[i * 3 + 2] = Math.sin(angle) * r;
            moteSpeeds[i] = 0.12 + Math.random() * 0.22;
        }
        const moteGeo = new THREE.BufferGeometry();
        moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
        const moteMat = new THREE.PointsMaterial({
            map: particleTex,
            size: 0.13,
            transparent: true,
            opacity: 0.78,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const motes = new THREE.Points(moteGeo, moteMat);
        scene.add(motes);

        // Dynamic Showcase Content Group
        const stageGroup = new THREE.Group();
        scene.add(stageGroup);

        let splashOrbitGroup: THREE.Group | null = null;

        const populateStage = () => {
            splashOrbitGroup = null;
            while (stageGroup.children.length > 0) {
                const child = stageGroup.children[0];
                stageGroup.remove(child);
                disposeGroupResources(child);
            }

            const { mode: curMode, hero: curHero, heroes: curHeroes } = specRef.current;

            if (curMode === 'customizer_preview') {
                const targetHero = curHero || { playerClass: 'determinato', color: 'black' };
                const pawn = createPlayerPawn(makeDummyPlayer(targetHero, 1), contactShadowTex);
                pawn.scale.setScalar(1.24);
                pawn.position.set(0, 0.01, 0);
                stageGroup.add(pawn);
            } else if (curMode === 'selection_spotlight') {
                const list = curHeroes && curHeroes.length > 0 ? curHeroes : DEFAULT_HERO_TRIO;
                const count = list.length;
                const radius = count === 1 ? 0 : count === 2 ? 0.72 : 0.88;
                list.forEach((h, idx) => {
                    const angle = (idx / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
                    const pawn = createPlayerPawn(makeDummyPlayer(h, idx + 1), contactShadowTex);
                    pawn.scale.setScalar(1.1);
                    pawn.position.set(
                        Math.cos(angle) * radius,
                        0.01,
                        Math.sin(angle) * radius * 0.88
                    );
                    pawn.rotation.y = Math.atan2(-pawn.position.x, -pawn.position.z) + Math.PI;
                    stageGroup.add(pawn);
                });
            } else {
                // splash_diorama: Central Goal (Risveglio / Boss Finale) pawn + 4 Hero Pawns orbiting smoothly around it
                const goalPawn = createEnemyPawn(makeGoalCenterPawn(), contactShadowTex);
                goalPawn.scale.setScalar(1.06);
                goalPawn.position.set(0, 0.01, 0);
                stageGroup.add(goalPawn);

                const orbitRing = new THREE.Group();
                const orbitRadius = 1.26;
                SPLASH_FOUR_HEROES.forEach((h, idx) => {
                    const angle = (idx / SPLASH_FOUR_HEROES.length) * Math.PI * 2;
                    const pawn = createPlayerPawn(makeDummyPlayer(h, idx + 1), contactShadowTex);
                    pawn.scale.setScalar(1.14);
                    const px = Math.cos(angle) * orbitRadius;
                    const pz = Math.sin(angle) * orbitRadius;
                    pawn.position.set(px, 0.01, pz);
                    // Face tangentially along the orbit with a subtle outward hero stance
                    pawn.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle)) + 0.3;
                    orbitRing.add(pawn);
                });
                splashOrbitGroup = orbitRing;
                stageGroup.add(orbitRing);
            }
        };

        populateStage();
        rebuildContentRef.current = populateStage;

        // OrbitControls: horizontal spin only, no zoom hijack
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enabled = interactive;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableDamping = !isSoftwareGl;
        controls.dampingFactor = 0.08;
        controls.rotateSpeed = 0.78;
        controls.minPolarAngle = mode === 'customizer_preview' ? 0.85 : 0.78;
        controls.maxPolarAngle = mode === 'customizer_preview' ? 1.42 : 1.34;
        controls.target.set(
            0,
            mode === 'customizer_preview'
                ? 0.56
                : mode === 'selection_spotlight'
                ? 0.36
                : 0.54,
            0
        );
        controls.autoRotate = !prefersReducedMotion && !isSoftwareGl && mode !== 'splash_diorama';
        controls.autoRotateSpeed = mode === 'customizer_preview' ? 1.25 : 0.75;
        controls.update();

        // Distinguish drag from tap on interactive stage
        let pointerDownPos: { x: number; y: number } | null = null;
        const onPointerDown = (e: PointerEvent) => {
            pointerDownPos = { x: e.clientX, y: e.clientY };
        };
        const onPointerUp = (e: PointerEvent) => {
            if (!pointerDownPos) return;
            const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            pointerDownPos = null;
            if (dist < 6 && onTapRef.current) {
                onTapRef.current();
            }
        };
        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointerup', onPointerUp);

        const resizeObserver = new ResizeObserver(() => {
            if (!container) return;
            const w = Math.max(container.clientWidth, 180);
            const h = Math.max(container.clientHeight, 160);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });
        resizeObserver.observe(container);

        let disposed = false;
        let frameId = 0;
        let lastTime = performance.now();
        let elapsed = 0;

        const afterDraw = (cb: () => void) => {
            frameId = window.setTimeout(() => {
                if (!disposed) requestAnimationFrame(cb);
            }, 34) as unknown as number;
        };

        const tick = () => {
            if (disposed) return;
            const now = performance.now();
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;
            elapsed += dt;

            if (!prefersReducedMotion) {
                haloPlane.rotation.y = elapsed * 0.25;

                // Drift motes upward gently
                const posAttr = moteGeo.getAttribute('position') as THREE.BufferAttribute;
                for (let i = 0; i < moteCount; i++) {
                    let y = posAttr.getY(i) + moteSpeeds[i] * dt;
                    if (y > moteMaxHeight) y = 0.12;
                    posAttr.setY(i, y);
                }
                posAttr.needsUpdate = true;

                // Orbit the 4 hero pawns smoothly around the central Goal pawn in splash diorama
                if (splashOrbitGroup) {
                    splashOrbitGroup.rotation.y = elapsed * 0.42;
                }

                // Subtle idle motion on stage children
                stageGroup.traverse(child => {
                    if (child.userData.spinAnim) {
                        child.rotation.y += dt * 1.25;
                    }
                    if (child.userData.floatAnim) {
                        if (child.userData.baseY === undefined) {
                            child.userData.baseY = child.position.y;
                        }
                        child.position.y = child.userData.baseY + Math.sin(elapsed * 2.2) * 0.03;
                    }
                    if (child.userData.floatSentinel) {
                        child.position.y = 0.14 + Math.sin(elapsed * 1.6) * 0.045;
                    }
                });

                if (isSoftwareGl && !splashOrbitGroup) {
                    stageGroup.rotation.y += dt * 0.28;
                }
            }

            controls.update();
            renderer.render(scene, camera);

            if (isSoftwareGl) {
                afterDraw(tick);
            } else {
                frameId = requestAnimationFrame(tick);
            }
        };

        tick();

        return () => {
            disposed = true;
            cancelAnimationFrame(frameId);
            clearTimeout(frameId);
            resizeObserver.disconnect();
            controls.dispose();
            renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            renderer.domElement.removeEventListener('pointerup', onPointerUp);
            renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
            renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

            while (stageGroup.children.length > 0) {
                const child = stageGroup.children[0];
                stageGroup.remove(child);
                disposeGroupResources(child);
            }

            plinthGeo.dispose();
            walnutMat.dispose();
            brassTrimGeo.dispose();
            innerTrimGeo.dispose();
            brassMat.dispose();
            haloPlaneGeo.dispose();
            haloPlaneMat.dispose();
            moteGeo.dispose();
            moteMat.dispose();
            contactShadowTex.dispose();
            runeHaloTex.dispose();
            particleTex.dispose();
            envTex.dispose();
            renderer.dispose();
        };
    }, [mode, interactive]);

    return (
        <div
            ref={mountRef}
            className={`pawn-showcase-3d ${className}`}
            aria-label="Palcoscenico 3D interattivo delle pedine"
        >
            {contextLost && (
                <div className="showcase-context-fallback">
                    <span>Ripristino scena 3D in corso...</span>
                </div>
            )}
        </div>
    );
};
