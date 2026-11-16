import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Eye, Compass, Crosshair, RotateCcw, RotateCw, ChevronDown, ChevronUp, ArrowUp } from 'lucide-react';
import type { Enemy, GameState, Player, SpecialSquare } from '../gameLogic';
import * as gameEngine from '../game/engine';
import { PLAYER_START_POSITIONS } from '../game/constants';
import { buildBoard3D, BuiltBoard3D } from '../three/boardGeometry';
import {
    createEnemyPawn,
    createMerchantPawn,
    createNpcPawn,
    createPlayerPawn,
    createSpecialSquareProp,
    createTreasureProp,
    createWorldItemProp,
    disposeGroupResources,
} from '../three/pawnFactory';
import {
    createContactShadowTexture,
    createEnemyHpTexture,
    createRuneHaloTexture,
} from '../three/textures';

export interface ActivePawnMove {
    pawnKey: string;
    path: number[];
    targetCellId: number;
}

interface Board3DProps {
    gameState: GameState;
    activeMove: ActivePawnMove | null;
    onMoveAnimationComplete: (targetCellId: number) => void;
    onCellClick: (cellId: number) => void;
    isAnimating: boolean;
}

interface PawnRecord {
    key: string;
    group: THREE.Group;
    cellId: number;
    targetPos: THREE.Vector3;
    targetScale: number;
    hpSprite?: THREE.Sprite;
    lastHp?: number;
    lastMaxHp?: number;
    lastIsDead?: boolean;
}

interface CameraPreset {
    position: THREE.Vector3;
    target: THREE.Vector3;
}

const _tmpVec = new THREE.Vector3();
const _tmpTarget = new THREE.Vector3();

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

export const Board3D: React.FC<Board3DProps> = ({
    gameState,
    activeMove,
    onMoveAnimationComplete,
    onCellClick,
    isAnimating,
}) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [dockCollapsed, setDockCollapsed] = useState(false);
    const [hoveredCell, setHoveredCell] = useState<number | null>(null);
    const [contextLost, setContextLost] = useState(false);

    // Keep fresh React state & callbacks in refs so WebGL scene never tears down
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;

    const isAnimatingRef = useRef(isAnimating);
    isAnimatingRef.current = isAnimating;

    const onCellClickRef = useRef(onCellClick);
    onCellClickRef.current = onCellClick;

    const onMoveCompleteRef = useRef(onMoveAnimationComplete);
    onMoveCompleteRef.current = onMoveAnimationComplete;

    const activeMoveRef = useRef<ActivePawnMove | null>(activeMove);
    const moveProgressRef = useRef<{ move: ActivePawnMove; stepIndex: number; stepElapsed: number; completed: boolean } | null>(null);

    useEffect(() => {
        activeMoveRef.current = activeMove;
        if (activeMove && activeMove.path.length > 0) {
            moveProgressRef.current = {
                move: activeMove,
                stepIndex: 0,
                stepElapsed: 0,
                completed: false,
            };
        } else {
            moveProgressRef.current = null;
        }
    }, [activeMove]);

    // Camera transition target ref
    const cameraTransitionRef = useRef<CameraPreset | null>(null);
    const boardRef = useRef<BuiltBoard3D | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);

    // Sync-trigger ref so state updates re-evaluate pawns/highlights
    const syncSceneEntitiesRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        syncSceneEntitiesRef.current?.();
    }, [gameState]);

    // Camera preset helpers
    const setCameraPreset = (preset: 'overview' | 'top' | 'center' | 'player') => {
        const board = boardRef.current;
        const gs = gameStateRef.current;
        if (preset === 'overview') {
            cameraTransitionRef.current = {
                position: new THREE.Vector3(0, 14.5, 14.2),
                target: new THREE.Vector3(0, 0, 0),
            };
        } else if (preset === 'top') {
            cameraTransitionRef.current = {
                position: new THREE.Vector3(0, 21.8, 2.2),
                target: new THREE.Vector3(0, 0, 0),
            };
        } else if (preset === 'center') {
            const c69 = board?.getCellWorldCenter(69) || new THREE.Vector3(0, 0.26, 0);
            cameraTransitionRef.current = {
                position: new THREE.Vector3(c69.x, 8.6, c69.z + 7.2),
                target: c69.clone(),
            };
        } else if (preset === 'player') {
            const player = gs.players[gs.currentPlayerIndex];
            const pCenter = (player && board?.getCellWorldCenter(player.position)) || new THREE.Vector3(0, 0, 0);
            cameraTransitionRef.current = {
                position: new THREE.Vector3(pCenter.x, 9.5, pCenter.z + 8.4),
                target: pCenter.clone(),
            };
        }
    };

    const rotateBoardQuarterTurn = (direction: 1 | -1) => {
        const cam = cameraRef.current;
        const controls = controlsRef.current;
        if (!cam || !controls) return;
        const target = cameraTransitionRef.current?.target.clone() || controls.target.clone();
        const currentPos = cameraTransitionRef.current?.position.clone() || cam.position.clone();
        const offset = currentPos.sub(target);
        offset.applyAxisAngle(_tmpVec.set(0, 1, 0), (Math.PI / 2) * direction);
        cameraTransitionRef.current = {
            position: target.clone().add(offset),
            target,
        };
    };

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        const isSoftwareGl = detectSoftwareWebGL();
        const width = Math.max(container.clientWidth, 320);
        const height = Math.max(container.clientHeight, 240);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x141016);
        scene.fog = new THREE.FogExp2(0x141016, 0.015);

        const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 120);
        camera.position.set(0, 14.5, 14.2);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
            antialias: !isSoftwareGl,
            powerPreference: 'high-performance',
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;
        renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = !isSoftwareGl;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        // WebGL context loss safety
        const onContextLost = (e: Event) => {
            e.preventDefault();
            setContextLost(true);
        };
        const onContextRestored = () => {
            setContextLost(false);
        };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);
        renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

        // Studio Environment Reflections
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environment = envTexture;
        pmremGenerator.dispose();

        // 3-Point Warm/Cool Studio Lighting
        const hemiLight = new THREE.HemisphereLight(0xb8c9e8, 0x3b2618, 0.65);
        scene.add(hemiLight);

        const keyLight = new THREE.DirectionalLight(0xffe8c2, 1.85);
        keyLight.position.set(10, 18, 11);
        keyLight.castShadow = !isSoftwareGl;
        keyLight.shadow.mapSize.set(2048, 2048);
        keyLight.shadow.camera.near = 2;
        keyLight.shadow.camera.far = 45;
        const d = 15;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.bias = -0.0005;
        keyLight.shadow.normalBias = 0.02;
        scene.add(keyLight);

        const rimLight = new THREE.DirectionalLight(0x9bb8ff, 0.72);
        rimLight.position.set(-12, 10, -13);
        scene.add(rimLight);

        // Soft warm glow over central cell 69
        const centerGlow = new THREE.PointLight(0xf0bd17, 1.4, 10, 1.6);
        centerGlow.position.set(0, 1.8, 0);
        scene.add(centerGlow);

        // OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = !isSoftwareGl;
        controls.dampingFactor = 0.07;
        controls.minPolarAngle = 0.14;
        controls.maxPolarAngle = Math.PI / 2 - 0.14;
        controls.minDistance = 8;
        controls.maxDistance = 32;
        controls.enablePan = true;
        controls.panSpeed = 0.75;
        controls.rotateSpeed = 0.85;
        controls.target.set(0, 0, 0);
        controls.update();
        controlsRef.current = controls;

        const cancelTransition = () => {
            cameraTransitionRef.current = null;
        };
        controls.addEventListener('start', cancelTransition);

        // Build 3D Board
        const maxAniso = renderer.capabilities.getMaxAnisotropy();
        const board = buildBoard3D(gameEngine.boardLayout.allCells, maxAniso);
        boardRef.current = board;
        scene.add(board.root);

        // Shared textures for pawns & halos
        const contactShadowTex = createContactShadowTexture();
        const activeHaloTex = createRuneHaloTexture('#f0bd17');

        // Active player turn halo ring
        const turnHaloGeo = new THREE.PlaneGeometry(1.18, 1.18);
        turnHaloGeo.rotateX(-Math.PI / 2);
        const turnHaloMat = new THREE.MeshBasicMaterial({
            map: activeHaloTex,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
        });
        const turnHaloMesh = new THREE.Mesh(turnHaloGeo, turnHaloMat);
        turnHaloMesh.visible = false;
        scene.add(turnHaloMesh);

        // Path Preview Group & Ghost Pawn
        const pathPreviewGroup = new THREE.Group();
        scene.add(pathPreviewGroup);
        let previewTubeMesh: THREE.Mesh | null = null;
        let ghostPawnGroup: THREE.Group | null = null;
        let ghostPlayerSignature = '';

        const clearPathPreview = () => {
            if (previewTubeMesh) {
                previewTubeMesh.geometry.dispose();
                (previewTubeMesh.material as THREE.Material).dispose();
                pathPreviewGroup.remove(previewTubeMesh);
                previewTubeMesh = null;
            }
            while (pathPreviewGroup.children.length > 0) {
                const c = pathPreviewGroup.children[0] as THREE.Mesh;
                c.geometry?.dispose();
                (c.material as THREE.Material)?.dispose();
                pathPreviewGroup.remove(c);
            }
        };

        const updatePathPreview = (targetCellId: number | null) => {
            clearPathPreview();
            if (ghostPawnGroup) ghostPawnGroup.visible = false;
            if (!targetCellId) return;

            const gs = gameStateRef.current;
            const currentPlayer = gs.players[gs.currentPlayerIndex];
            if (!currentPlayer) return;

            const isInspection = gs.gameStatePhase === 'cell_inspection';
            const isValid = gameEngine.isMoveValid(gs, targetCellId);

            if (!isValid && !isInspection) return;

            // Ghost pawn on hovered cell
            const targetCenter = board.getCellWorldCenter(targetCellId);
            if (targetCenter) {
                const sig = `${currentPlayer.id}_${currentPlayer.class}_${currentPlayer.color}`;
                if (!ghostPawnGroup || ghostPlayerSignature !== sig) {
                    if (ghostPawnGroup) {
                        scene.remove(ghostPawnGroup);
                        disposeGroupResources(ghostPawnGroup);
                    }
                    ghostPawnGroup = createPlayerPawn(currentPlayer, contactShadowTex, true);
                    ghostPlayerSignature = sig;
                    scene.add(ghostPawnGroup);
                }
                ghostPawnGroup.position.set(targetCenter.x, targetCenter.y + 0.02, targetCenter.z);
                ghostPawnGroup.visible = true;
            }

            if (isValid && !isInspection) {
                const path = gameEngine.findShortestPath(currentPlayer.position, targetCellId, gs.gates);
                if (path && path.length >= 2) {
                    const pts: THREE.Vector3[] = [];
                    for (const cid of path) {
                        const c = board.getCellWorldCenter(cid);
                        if (c) pts.push(new THREE.Vector3(c.x, c.y + 0.08, c.z));
                    }
                    if (pts.length >= 2) {
                        const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
                        const tubeGeo = new THREE.TubeGeometry(curve, Math.max(16, pts.length * 8), 0.055, 8, false);
                        const tubeMat = new THREE.MeshBasicMaterial({
                            color: 0xffe066,
                            transparent: true,
                            opacity: 0.85,
                        });
                        previewTubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
                        pathPreviewGroup.add(previewTubeMesh);

                        // Waypoint beads
                        const beadGeo = new THREE.SphereGeometry(0.08, 10, 10);
                        const beadMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
                        for (let i = 1; i < pts.length; i++) {
                            const bead = new THREE.Mesh(beadGeo, beadMat);
                            bead.position.copy(pts[i]);
                            pathPreviewGroup.add(bead);
                        }
                    }
                }
            }
        };

        // Pawn Management
        const pawnRecords = new Map<string, PawnRecord>();
        const pawnsContainer = new THREE.Group();
        scene.add(pawnsContainer);

        const getEntityKey = (kind: string, id: string | number) => `${kind}_${id}`;

        const syncSceneEntities = () => {
            const gs = gameStateRef.current;
            const activeKeys = new Set<string>();

            // Group miniatures (players, enemies, merchants, npcs) by cellId for slot layout
            type MiniItem =
                | { kind: 'player'; key: string; cellId: number; data: Player }
                | { kind: 'enemy'; key: string; cellId: number; data: Enemy }
                | { kind: 'merchant'; key: string; cellId: number; data: any }
                | { kind: 'npc'; key: string; cellId: number; data: any };

            const minisByCell = new Map<number, MiniItem[]>();
            const pushMini = (item: MiniItem) => {
                if (!minisByCell.has(item.cellId)) minisByCell.set(item.cellId, []);
                minisByCell.get(item.cellId)!.push(item);
            };

            gs.players.forEach(p => pushMini({ kind: 'player', key: getEntityKey('player', p.id), cellId: p.position, data: p }));
            gs.enemies.filter(e => e.isVisible).forEach(e => pushMini({ kind: 'enemy', key: getEntityKey('enemy', e.id), cellId: e.position, data: e }));
            gs.merchants.filter(m => m.isVisible).forEach(m => pushMini({ kind: 'merchant', key: getEntityKey('merchant', m.id), cellId: m.position, data: m }));
            gs.npcs.filter(n => n.isVisible).forEach(n => pushMini({ kind: 'npc', key: getEntityKey('npc', n.id), cellId: n.position, data: n }));

            const quadrantOffsets = [
                [-0.26, -0.24],
                [0.26, -0.24],
                [-0.26, 0.24],
                [0.26, 0.24],
            ];

            minisByCell.forEach((items, cellId) => {
                const cellRec = board.cellsById.get(cellId);
                if (!cellRec) return;

                const isCrowded = items.length > 1;
                const scaleFactor = isCrowded ? 0.78 : 1.0;

                items.forEach((item, idx) => {
                    activeKeys.add(item.key);
                    const offset = isCrowded ? quadrantOffsets[idx % 4] : [0, 0];
                    const tx = cellRec.center.x + offset[0] * (cellRec.width * 0.85);
                    const tz = cellRec.center.z + offset[1] * (cellRec.depth * 0.85);
                    const ty = cellRec.topY;

                    let record = pawnRecords.get(item.key);

                    // Rebuild player pawn if dead status changed
                    if (record && item.kind === 'player' && record.lastIsDead !== item.data.isDead) {
                        pawnsContainer.remove(record.group);
                        disposeGroupResources(record.group);
                        pawnRecords.delete(item.key);
                        record = undefined;
                    }

                    if (!record) {
                        let meshGroup: THREE.Group;
                        if (item.kind === 'player') {
                            meshGroup = createPlayerPawn(item.data, contactShadowTex, false);
                        } else if (item.kind === 'enemy') {
                            meshGroup = createEnemyPawn(item.data, contactShadowTex);
                        } else if (item.kind === 'merchant') {
                            meshGroup = createMerchantPawn(contactShadowTex);
                        } else {
                            meshGroup = createNpcPawn(contactShadowTex);
                        }

                        meshGroup.position.set(tx, ty, tz);
                        meshGroup.scale.setScalar(scaleFactor);
                        pawnsContainer.add(meshGroup);

                        record = {
                            key: item.key,
                            group: meshGroup,
                            cellId,
                            targetPos: new THREE.Vector3(tx, ty, tz),
                            targetScale: scaleFactor,
                            lastIsDead: item.kind === 'player' ? item.data.isDead : undefined,
                        };
                        pawnRecords.set(item.key, record);
                    } else {
                        record.cellId = cellId;
                        record.targetPos.set(tx, ty, tz);
                        record.targetScale = scaleFactor;
                    }

                    // Enemy floating HP bar when attacked
                    if (item.kind === 'enemy') {
                        const enemy = item.data;
                        if (enemy.hasBeenAttacked) {
                            if (!record.hpSprite || record.lastHp !== enemy.hp || record.lastMaxHp !== enemy.maxHp) {
                                if (record.hpSprite) {
                                    record.hpSprite.material.map?.dispose();
                                    record.hpSprite.material.dispose();
                                    record.group.remove(record.hpSprite);
                                }
                                const hpTex = createEnemyHpTexture(enemy.hp, enemy.maxHp, enemy.name);
                                const spMat = new THREE.SpriteMaterial({ map: hpTex, transparent: true, depthTest: false });
                                const sprite = new THREE.Sprite(spMat);
                                sprite.scale.set(1.05, 0.27, 1);
                                sprite.position.set(0, enemy.isFinalBoss ? 1.65 : 1.32, 0);
                                sprite.renderOrder = 20;
                                record.group.add(sprite);
                                record.hpSprite = sprite;
                                record.lastHp = enemy.hp;
                                record.lastMaxHp = enemy.maxHp;
                            }
                        } else if (record.hpSprite) {
                            record.hpSprite.material.map?.dispose();
                            record.hpSprite.material.dispose();
                            record.group.remove(record.hpSprite);
                            record.hpSprite = undefined;
                        }
                    }
                });
            });

            // Sync Map Props (Treasures, WorldItems, SpecialSquares)
            const syncProp = (key: string, cellId: number, createFn: () => THREE.Group, offsetX: number, offsetZ: number) => {
                activeKeys.add(key);
                const cellRec = board.cellsById.get(cellId);
                if (!cellRec) return;
                const tx = cellRec.center.x + offsetX;
                const tz = cellRec.center.z + offsetZ;
                const ty = cellRec.topY;

                let record = pawnRecords.get(key);
                if (!record) {
                    const group = createFn();
                    group.position.set(tx, ty, tz);
                    pawnsContainer.add(group);
                    record = {
                        key,
                        group,
                        cellId,
                        targetPos: new THREE.Vector3(tx, ty, tz),
                        targetScale: 1,
                    };
                    pawnRecords.set(key, record);
                } else {
                    record.cellId = cellId;
                    record.targetPos.set(tx, ty, tz);
                }
            };

            gs.treasures.filter(t => t.isVisible).forEach(t => {
                const hasMini = minisByCell.has(t.position);
                syncProp(getEntityKey('treasure', t.id), t.position, () => createTreasureProp(contactShadowTex), hasMini ? 0.3 : 0, hasMini ? -0.3 : 0);
            });
            gs.worldItems.filter(w => w.isVisible).forEach(w => {
                const hasMini = minisByCell.has(w.position);
                syncProp(getEntityKey('worldItem', w.id), w.position, () => createWorldItemProp(contactShadowTex), hasMini ? -0.3 : 0, hasMini ? 0.3 : 0);
            });
            gs.specialSquares.filter(s => s.isVisible).forEach(s => {
                const hasMini = minisByCell.has(s.position);
                syncProp(getEntityKey('special', s.id), s.position, () => createSpecialSquareProp(s.type as SpecialSquare['type'], contactShadowTex), hasMini ? 0.3 : 0, hasMini ? 0.3 : 0);
            });

            // Remove despawned entities
            for (const [key, rec] of pawnRecords.entries()) {
                if (!activeKeys.has(key)) {
                    pawnsContainer.remove(rec.group);
                    disposeGroupResources(rec.group);
                    pawnRecords.delete(key);
                }
            }
        };

        syncSceneEntitiesRef.current = syncSceneEntities;
        syncSceneEntities();

        // Pre-warm shaders when hardware WebGL is available
        if (!isSoftwareGl) {
            renderer.compile(scene, camera);
        }

        // Raycasting & Pointer Input
        const raycaster = new THREE.Raycaster();
        raycaster.layers.set(1);
        const mouseNdc = new THREE.Vector2();
        let lastHoverCheck = 0;
        let currentHoveredCellId: number | null = null;
        let pointerDownX = 0;
        let pointerDownY = 0;

        const updateNdc = (clientX: number, clientY: number) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        };

        const pickCellAt = (clientX: number, clientY: number): number | null => {
            updateNdc(clientX, clientY);
            raycaster.setFromCamera(mouseNdc, camera);
            const hits = raycaster.intersectObjects(board.hitMeshes, false);
            if (hits.length > 0) {
                return (hits[0].object.userData.cellId as number) ?? null;
            }
            return null;
        };

        const onPointerDown = (e: PointerEvent) => {
            pointerDownX = e.clientX;
            pointerDownY = e.clientY;
        };

        const onPointerMove = (e: PointerEvent) => {
            const now = performance.now();
            if (now - lastHoverCheck < 35) return;
            lastHoverCheck = now;

            if (isAnimatingRef.current) {
                if (currentHoveredCellId !== null) {
                    currentHoveredCellId = null;
                    setHoveredCell(null);
                    updatePathPreview(null);
                    renderer.domElement.style.cursor = 'grab';
                }
                return;
            }

            const picked = pickCellAt(e.clientX, e.clientY);
            if (picked !== currentHoveredCellId) {
                currentHoveredCellId = picked;
                setHoveredCell(picked);
                updatePathPreview(picked);
            }

            const gs = gameStateRef.current;
            const isInteractive =
                picked !== null &&
                (gameEngine.isMoveValid(gs, picked) ||
                    gs.gameStatePhase === 'cell_inspection' ||
                    Object.values(PLAYER_START_POSITIONS).includes(picked));
            renderer.domElement.style.cursor = isInteractive ? 'pointer' : 'grab';
        };

        const onPointerUp = (e: PointerEvent) => {
            const movedDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
            if (movedDist > 7) return; // Was an orbit drag, not a cell click

            const picked = pickCellAt(e.clientX, e.clientY);
            if (picked && !isAnimatingRef.current) {
                clearPathPreview();
                if (ghostPawnGroup) ghostPawnGroup.visible = false;
                onCellClickRef.current(picked);
            }
        };

        renderer.domElement.addEventListener('pointerdown', onPointerDown);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerup', onPointerUp);

        // Resize Handling
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const w = Math.max(entry.contentRect.width, 1);
                const h = Math.max(entry.contentRect.height, 1);
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            }
        });
        resizeObserver.observe(container);

        // Main Animation Loop (paced safely on software WebGL)
        const clock = new THREE.Clock();
        let frameId = 0;
        let disposed = false;

        const afterDraw = (cb: () => void) => {
            const gl = renderer.getContext() as WebGL2RenderingContext;
            if (!gl || typeof gl.fenceSync !== 'function') {
                frameId = window.setTimeout(cb, 80);
                return;
            }
            const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
            gl.flush();
            const poll = () => {
                if (disposed) {
                    if (sync) gl.deleteSync(sync);
                    return;
                }
                const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
                if (status === gl.UNSIGNALED) {
                    frameId = window.setTimeout(poll, 5);
                } else {
                    if (sync) gl.deleteSync(sync);
                    frameId = window.setTimeout(cb, 80);
                }
            };
            frameId = window.setTimeout(poll, 5);
        };

        const HOP_DURATION = 0.21;

        const tick = () => {
            if (disposed) return;
            const dt = Math.min(clock.getDelta(), 0.08);
            const elapsed = clock.getElapsedTime();
            const gs = gameStateRef.current;

            // Smooth camera preset damping
            if (cameraTransitionRef.current) {
                const preset = cameraTransitionRef.current;
                camera.position.lerp(preset.position, 1 - Math.exp(-5.5 * dt));
                controls.target.lerp(preset.target, 1 - Math.exp(-6.5 * dt));
                if (
                    camera.position.distanceTo(preset.position) < 0.04 &&
                    controls.target.distanceTo(preset.target) < 0.04
                ) {
                    camera.position.copy(preset.position);
                    controls.target.copy(preset.target);
                    cameraTransitionRef.current = null;
                }
            }

            controls.update();

            // Board cell highlights & gates
            const reachableSet = new Set<number>(gs.reachableCells || []);
            const inspectionMode = gs.gameStatePhase === 'cell_inspection';
            board.updateHighlights(reachableSet, currentHoveredCellId, inspectionMode, elapsed);
            board.updateGates(gs.gates, elapsed, dt);

            // Active turn rune halo
            const currentPlayer = gs.players[gs.currentPlayerIndex];
            if (currentPlayer) {
                const activeRec = pawnRecords.get(`player_${currentPlayer.id}`);
                if (activeRec) {
                    turnHaloMesh.visible = true;
                    turnHaloMesh.position.set(activeRec.group.position.x, activeRec.group.position.y + 0.012, activeRec.group.position.z);
                    turnHaloMesh.rotation.y = elapsed * 0.9;
                } else {
                    turnHaloMesh.visible = false;
                }
            }

            // Active parabolic hop-by-hop movement animation
            const activeAnim = moveProgressRef.current;
            let animatedKey: string | null = null;
            if (activeAnim && !activeAnim.completed) {
                animatedKey = activeAnim.move.pawnKey;
                const rec = pawnRecords.get(animatedKey);
                const path = activeAnim.move.path;

                if (rec && path.length >= 2) {
                    activeAnim.stepElapsed += dt;
                    while (activeAnim.stepElapsed >= HOP_DURATION && activeAnim.stepIndex < path.length - 2) {
                        activeAnim.stepElapsed -= HOP_DURATION;
                        activeAnim.stepIndex++;
                    }

                    const fromId = path[activeAnim.stepIndex];
                    const toId = path[Math.min(activeAnim.stepIndex + 1, path.length - 1)];
                    const fromCenter = board.getCellWorldCenter(fromId);
                    const toCenter = board.getCellWorldCenter(toId);

                    if (fromCenter && toCenter) {
                        const t = Math.min(1, activeAnim.stepElapsed / HOP_DURATION);
                        const smoothT = t * t * (3 - 2 * t);
                        const x = THREE.MathUtils.lerp(fromCenter.x, toCenter.x, smoothT);
                        const z = THREE.MathUtils.lerp(fromCenter.z, toCenter.z, smoothT);
                        const baseY = THREE.MathUtils.lerp(fromCenter.y, toCenter.y, smoothT);
                        const arcY = Math.sin(t * Math.PI) * 0.62;
                        rec.group.position.set(x, baseY + arcY, z);

                        // Face travel direction smoothly
                        const dx = toCenter.x - fromCenter.x;
                        const dz = toCenter.z - fromCenter.z;
                        if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                            const targetYaw = Math.atan2(dx, dz);
                            rec.group.rotation.y = targetYaw;
                        }
                    }

                    if (activeAnim.stepIndex >= path.length - 2 && activeAnim.stepElapsed >= HOP_DURATION) {
                        activeAnim.completed = true;
                        const finalId = activeAnim.move.targetCellId;
                        onMoveCompleteRef.current(finalId);
                    }
                } else {
                    activeAnim.completed = true;
                    onMoveCompleteRef.current(activeAnim.move.targetCellId);
                }
            }

            // Smooth resting position & sub-part ambient motion
            pawnRecords.forEach(rec => {
                if (rec.key !== animatedKey) {
                    rec.group.position.x = THREE.MathUtils.damp(rec.group.position.x, rec.targetPos.x, 10, dt);
                    rec.group.position.y = THREE.MathUtils.damp(rec.group.position.y, rec.targetPos.y, 10, dt);
                    rec.group.position.z = THREE.MathUtils.damp(rec.group.position.z, rec.targetPos.z, 10, dt);
                    const s = THREE.MathUtils.damp(rec.group.scale.x, rec.targetScale, 10, dt);
                    rec.group.scale.setScalar(s);
                }

                rec.group.traverse(child => {
                    if (child.userData.spinAnim) {
                        child.rotation.y += dt * 1.4;
                    }
                    if (child.userData.floatAnim) {
                        if (child.userData.baseY === undefined) {
                            child.userData.baseY = child.position.y;
                        }
                        child.position.y = child.userData.baseY + Math.sin(elapsed * 2.6 + rec.cellId) * 0.04;
                    }
                });
            });

            // Subtle hover float on ghost pawn
            if (ghostPawnGroup && ghostPawnGroup.visible) {
                ghostPawnGroup.rotation.y = elapsed * 0.8;
            }

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
            controls.removeEventListener('start', cancelTransition);
            controls.dispose();
            renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            renderer.domElement.removeEventListener('pointermove', onPointerMove);
            renderer.domElement.removeEventListener('pointerup', onPointerUp);
            renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
            renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

            clearPathPreview();
            if (ghostPawnGroup) disposeGroupResources(ghostPawnGroup);
            pawnRecords.forEach(rec => disposeGroupResources(rec.group));
            pawnRecords.clear();

            board.disposables.geometries.forEach(g => g.dispose());
            board.disposables.materials.forEach(m => m.dispose());
            board.disposables.textures.forEach(t => t.dispose());
            contactShadowTex.dispose();
            activeHaloTex.dispose();
            turnHaloGeo.dispose();
            turnHaloMat.dispose();
            envTexture.dispose();

            renderer.dispose();
        };
    }, []);

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const hasReachableHint =
        hoveredCell !== null &&
        (gameEngine.isMoveValid(gameState, hoveredCell) || gameState.gameStatePhase === 'cell_inspection');

    return (
        <div className="board-3d-wrapper">
            <div ref={mountRef} className="board-3d-canvas-host" />

            {contextLost && (
                <div className="board-3d-fallback">
                    <p>Ripristino della scena 3D in corso...</p>
                </div>
            )}

            {hasReachableHint && (
                <div className="board-3d-cell-badge">
                    Casella {hoveredCell} · Click per {gameState.gameStatePhase === 'cell_inspection' ? 'ispezionare' : 'spostarti'}
                </div>
            )}

            {/* Collapsible Bottom Camera Dock */}
            <div className={`camera-dock-container ${dockCollapsed ? 'collapsed' : ''}`}>
                <button
                    type="button"
                    className="camera-dock-toggle"
                    onClick={() => setDockCollapsed(v => !v)}
                    title={dockCollapsed ? 'Mostra controlli vista' : 'Nascondi controlli vista'}
                >
                    {dockCollapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    <span>{dockCollapsed ? 'Viste 3D' : 'Nascondi Viste'}</span>
                </button>

                {!dockCollapsed && (
                    <div className="camera-dock-bar">
                        <button type="button" className="camera-dock-btn" onClick={() => rotateBoardQuarterTurn(-1)} title="Ruota tabellone a sinistra">
                            <RotateCcw size={15} />
                            <span>-90°</span>
                        </button>
                        <button type="button" className="camera-dock-btn" onClick={() => setCameraPreset('overview')} title="Vista panoramica">
                            <Compass size={15} />
                            <span>Panoramica</span>
                        </button>
                        <button type="button" className="camera-dock-btn" onClick={() => setCameraPreset('top')} title="Vista dall'alto">
                            <ArrowUp size={15} />
                            <span>Dall'alto</span>
                        </button>
                        <button type="button" className="camera-dock-btn" onClick={() => setCameraPreset('center')} title="Inquadra il Centro Risveglio (69)">
                            <Eye size={15} />
                            <span>Centro 69</span>
                        </button>
                        {currentPlayer && (
                            <button type="button" className="camera-dock-btn" onClick={() => setCameraPreset('player')} title="Inquadra il giocatore di turno">
                                <Crosshair size={15} />
                                <span>Turno</span>
                            </button>
                        )}
                        <button type="button" className="camera-dock-btn" onClick={() => rotateBoardQuarterTurn(1)} title="Ruota tabellone a destra">
                            <span>+90°</span>
                            <RotateCw size={15} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
