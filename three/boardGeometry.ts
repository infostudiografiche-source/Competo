import * as THREE from 'three';
import type { Cell, GameState, KeyColor } from '../gameLogic';
import { GATE_CELLS, PLAYER_START_POSITIONS } from '../game/constants';
import {
    createCellTopTexture,
    createStoneBoardSurfaceTexture,
    createWoodTextures,
} from './textures';

export const BOARD_SCALE = 0.042;
export const CELL_TOP_Y = 0.16;
export const CORNER_TOP_Y = 0.2;
export const CENTER_TOP_Y = 0.26;

export interface Cell3DRecord {
    id: number;
    center: THREE.Vector3;
    topY: number;
    width: number;
    depth: number;
    tileMesh: THREE.Mesh;
    hitMesh: THREE.Mesh;
    highlightMesh: THREE.Mesh;
    highlightMaterial: THREE.MeshBasicMaterial;
}

export interface GatePortal3D {
    color: KeyColor;
    cellId: number;
    group: THREE.Group;
    barrierMesh: THREE.Mesh;
    lockCrystal: THREE.Mesh;
    openProgress: number; // 0 = closed, 1 = open
}

export interface BuiltBoard3D {
    root: THREE.Group;
    cellsById: Map<number, Cell3DRecord>;
    hitMeshes: THREE.Mesh[];
    gates: GatePortal3D[];
    disposables: { geometries: THREE.BufferGeometry[]; materials: THREE.Material[]; textures: THREE.Texture[] };
    getCellWorldCenter: (cellId: number) => THREE.Vector3 | null;
    updateHighlights: (
        reachableSet: Set<number>,
        hoveredCellId: number | null,
        inspectionMode: boolean,
        elapsed: number
    ) => void;
    updateGates: (gatesState: GameState['gates'], elapsed: number, dt: number) => void;
}

const GATE_COLORS_HEX: Record<KeyColor, number> = {
    red: 0xc0392b,
    yellow: 0xf1c40f,
    white: 0xe5e7eb,
    black: 0x3b2d4a,
};

const GATE_COLORS_CSS: Record<KeyColor, string> = {
    red: '#c0392b',
    yellow: '#f1c40f',
    white: '#f4f6f8',
    black: '#2c3e50',
};

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
    const x = -width / 2;
    const y = -height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
}

export function buildBoard3D(
    allCells: Cell[],
    maxAnisotropy: number
): BuiltBoard3D {
    const root = new THREE.Group();
    const cellsById = new Map<number, Cell3DRecord>();
    const hitMeshes: THREE.Mesh[] = [];
    const gates: GatePortal3D[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
        geometries.push(g);
        return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
        materials.push(m);
        return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
        textures.push(t);
        return t;
    };

    // Compute exact 2D bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of allCells) {
        if (c.x < minX) minX = c.x;
        if (c.x + c.width > maxX) maxX = c.x + c.width;
        if (c.y < minY) minY = c.y;
        if (c.y + c.height > maxY) maxY = c.y + c.height;
    }
    const center2DX = (minX + maxX) / 2;
    const center2DY = (minY + maxY) / 2;
    const boardSpanW = (maxX - minX) * BOARD_SCALE;
    const boardSpanD = (maxY - minY) * BOARD_SCALE;

    const toWorld = (cell: Cell) => ({
        x: (cell.x + cell.width / 2 - center2DX) * BOARD_SCALE,
        z: (cell.y + cell.height / 2 - center2DY) * BOARD_SCALE,
        w: cell.width * BOARD_SCALE,
        d: cell.height * BOARD_SCALE,
    });

    // 1. Wood & Stone Materials
    const woodTex = createWoodTextures(maxAnisotropy);
    trackTex(woodTex.map);
    trackTex(woodTex.roughnessMap);

    const stoneSurfaceTex = trackTex(createStoneBoardSurfaceTexture(maxAnisotropy));

    const walnutMat = trackMat(
        new THREE.MeshStandardMaterial({
            map: woodTex.map,
            roughnessMap: woodTex.roughnessMap,
            roughness: 0.58,
            metalness: 0.08,
        })
    );

    const darkWalnutMat = trackMat(
        new THREE.MeshStandardMaterial({
            color: 0x241610,
            roughness: 0.72,
            metalness: 0.05,
        })
    );

    const brassMat = trackMat(
        new THREE.MeshStandardMaterial({
            color: 0xd4a63a,
            roughness: 0.28,
            metalness: 0.85,
        })
    );

    const boardBedMat = trackMat(
        new THREE.MeshStandardMaterial({
            map: stoneSurfaceTex,
            roughness: 0.75,
            metalness: 0.12,
        })
    );

    // 2. Expansive Dream Table Pedestal (no floating void!)
    const ambientTableGeo = trackGeo(new THREE.CylinderGeometry(28, 30, 1.2, 48));
    const ambientTableMat = trackMat(
        new THREE.MeshStandardMaterial({
            color: 0x161117,
            roughness: 0.9,
            metalness: 0.05,
        })
    );
    const ambientTable = new THREE.Mesh(ambientTableGeo, ambientTableMat);
    ambientTable.position.y = -1.15;
    ambientTable.receiveShadow = true;
    root.add(ambientTable);

    // Outer Carved Walnut Plinth
    const frameW = boardSpanW + 2.1;
    const frameD = boardSpanD + 2.1;
    const frameShape = createRoundedRectShape(frameW, frameD, 0.75);
    const frameGeo = trackGeo(
        new THREE.ExtrudeGeometry(frameShape, {
            depth: 0.52,
            bevelEnabled: true,
            bevelThickness: 0.12,
            bevelSize: 0.12,
            bevelSegments: 3,
        })
    );
    frameGeo.rotateX(-Math.PI / 2);
    const frameMesh = new THREE.Mesh(frameGeo, walnutMat);
    frameMesh.position.y = -0.54;
    frameMesh.receiveShadow = true;
    frameMesh.castShadow = true;
    root.add(frameMesh);

    // Lower Dark Wood Skirt
    const skirtShape = createRoundedRectShape(frameW + 0.55, frameD + 0.55, 0.9);
    const skirtGeo = trackGeo(
        new THREE.ExtrudeGeometry(skirtShape, {
            depth: 0.35,
            bevelEnabled: true,
            bevelThickness: 0.08,
            bevelSize: 0.08,
            bevelSegments: 2,
        })
    );
    skirtGeo.rotateX(-Math.PI / 2);
    const skirtMesh = new THREE.Mesh(skirtGeo, darkWalnutMat);
    skirtMesh.position.y = -0.82;
    skirtMesh.receiveShadow = true;
    root.add(skirtMesh);

    // Recessed Stone/Mandala Board Bed
    const bedGeo = trackGeo(new THREE.BoxGeometry(boardSpanW + 0.6, 0.08, boardSpanD + 0.6));
    const bedMesh = new THREE.Mesh(bedGeo, boardBedMat);
    bedMesh.position.y = 0.01;
    bedMesh.receiveShadow = true;
    root.add(bedMesh);

    // Brass Corner Filigree Brackets
    const bracketGeo = trackGeo(new THREE.BoxGeometry(0.95, 0.14, 0.24));
    const cornerOffsets = [
        [-frameW / 2 + 0.38, -frameD / 2 + 0.38, 0],
        [frameW / 2 - 0.38, -frameD / 2 + 0.38, Math.PI / 2],
        [frameW / 2 - 0.38, frameD / 2 - 0.38, Math.PI],
        [-frameW / 2 + 0.38, frameD / 2 - 0.38, -Math.PI / 2],
    ];
    cornerOffsets.forEach(([cx, cz, rot]) => {
        const bGroup = new THREE.Group();
        const b1 = new THREE.Mesh(bracketGeo, brassMat);
        b1.position.set(0.32, 0, 0);
        const b2 = new THREE.Mesh(bracketGeo, brassMat);
        b2.rotation.y = Math.PI / 2;
        b2.position.set(0, 0, 0.32);
        bGroup.add(b1, b2);
        bGroup.position.set(cx, 0.03, cz);
        bGroup.rotation.y = rot;
        root.add(bGroup);
    });

    // 3. Build all 69 Cells
    const cornerIds = new Set(Object.values(PLAYER_START_POSITIONS));
    const gateEntryById = new Map<number, KeyColor>();
    (Object.keys(GATE_CELLS) as KeyColor[]).forEach(k => gateEntryById.set(GATE_CELLS[k], k));

    const startColorPalette: Record<number, { base: string; border: string; text: string; side: number }> = {
        1: { base: '#2c2f38', border: '#9aa5b4', text: '#f4f1ea', side: 0x1e2026 },      // Black start
        16: { base: '#ece8df', border: '#8c7a5b', text: '#2b241d', side: 0xd0c9ba },     // White start
        25: { base: '#d9b541', border: '#6b4e16', text: '#261a08', side: 0xa68524 },     // Yellow start
        40: { base: '#9e3329', border: '#f0bd17', text: '#fdf2e9', side: 0x6e211b },     // Red start
    };

    const innerPathColorMap = new Map<number, KeyColor>();
    [68, 65, 62, 59].forEach(id => innerPathColorMap.set(id, 'red'));
    [58, 51, 52, 53, 54].forEach(id => innerPathColorMap.set(id, 'yellow'));
    [67, 56, 60, 61, 63, 64].forEach(id => innerPathColorMap.set(id, 'white'));
    [49, 50, 55, 57, 66].forEach(id => innerPathColorMap.set(id, 'black'));

    for (const cell of allCells) {
        if (!cell.id) continue;
        const { x, z, w, d } = toWorld(cell);
        const isCenter = cell.id === 69;
        const isCorner = cornerIds.has(cell.id);
        const gateColor = gateEntryById.get(cell.id);
        const innerColor = innerPathColorMap.get(cell.id);

        const tileHeight = isCenter ? CENTER_TOP_Y - 0.04 : isCorner ? CORNER_TOP_Y - 0.04 : CELL_TOP_Y - 0.04;
        const topY = 0.04 + tileHeight;

        let baseColorCss = '#cbb896';
        let borderColorCss = '#6f523b';
        let textColorCss = '#2d1f14';
        let sideColorHex = 0x8f7758;

        if (isCenter) {
            baseColorCss = '#332538';
            borderColorCss = '#f0bd17';
            textColorCss = '#f8e3a3';
            sideColorHex = 0x4b3626;
        } else if (startColorPalette[cell.id]) {
            const p = startColorPalette[cell.id];
            baseColorCss = p.base;
            borderColorCss = p.border;
            textColorCss = p.text;
            sideColorHex = p.side;
        } else if (innerColor) {
            const innerPalettes: Record<KeyColor, { base: string; border: string; text: string; side: number }> = {
                red: { base: '#b9887f', border: '#992d22', text: '#2c1310', side: 0x7d4c45 },
                yellow: { base: '#d9ca8c', border: '#9a7d0a', text: '#2e2408', side: 0x99884f },
                white: { base: '#dedad2', border: '#858c94', text: '#24292e', side: 0xa6a29a },
                black: { base: '#76707f', border: '#2e243a', text: '#f4effa', side: 0x443f4d },
            };
            const p = innerPalettes[innerColor];
            baseColorCss = p.base;
            borderColorCss = p.border;
            textColorCss = p.text;
            sideColorHex = p.side;
        }

        const topTexture = trackTex(
            createCellTopTexture(
                cell.id,
                {
                    baseColor: baseColorCss,
                    borderColor: borderColorCss,
                    textColor: textColorCss,
                    isCenter,
                    isCorner,
                    isGate: !!gateColor,
                    gateColor: gateColor ? GATE_COLORS_CSS[gateColor] : undefined,
                },
                maxAnisotropy
            )
        );

        const sideMat = trackMat(
            new THREE.MeshStandardMaterial({
                color: sideColorHex,
                roughness: 0.78,
                metalness: 0.08,
            })
        );
        const topMat = trackMat(
            new THREE.MeshStandardMaterial({
                map: topTexture,
                roughness: isCenter ? 0.45 : 0.68,
                metalness: isCenter ? 0.25 : 0.05,
            })
        );

        const tileGeo = trackGeo(new THREE.BoxGeometry(w * 0.92, tileHeight, d * 0.92));
        const tileMesh = new THREE.Mesh(
            tileGeo,
            [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
        );
        tileMesh.position.set(x, 0.04 + tileHeight / 2, z);
        tileMesh.castShadow = true;
        tileMesh.receiveShadow = true;
        root.add(tileMesh);

        // Golden Awakening rim around cell 69
        if (isCenter) {
            const centerRimGeo = trackGeo(new THREE.BoxGeometry(w * 0.97, tileHeight * 0.6, d * 0.97));
            const centerRim = new THREE.Mesh(centerRimGeo, brassMat);
            centerRim.position.set(x, 0.04 + tileHeight * 0.3, z);
            centerRim.receiveShadow = true;
            root.add(centerRim);
        }

        // Highlight border frame for reachable / hovered cell
        const hlGeo = trackGeo(new THREE.PlaneGeometry(w * 0.98, d * 0.98));
        hlGeo.rotateX(-Math.PI / 2);
        const hlMat = trackMat(
            new THREE.MeshBasicMaterial({
                color: 0xf0bd17,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2,
            })
        );
        const highlightMesh = new THREE.Mesh(hlGeo, hlMat);
        highlightMesh.position.set(x, topY + 0.008, z);
        highlightMesh.visible = false;
        root.add(highlightMesh);

        // Invisible Raycast Hit Box on Layer 1
        const hitGeo = trackGeo(new THREE.BoxGeometry(w, tileHeight + 0.25, d));
        const hitMat = trackMat(new THREE.MeshBasicMaterial({ visible: false }));
        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.position.set(x, 0.04 + (tileHeight + 0.25) / 2, z);
        hitMesh.layers.set(1);
        hitMesh.userData.cellId = cell.id;
        root.add(hitMesh);
        hitMeshes.push(hitMesh);

        cellsById.set(cell.id, {
            id: cell.id,
            center: new THREE.Vector3(x, topY, z),
            topY,
            width: w,
            depth: d,
            tileMesh,
            hitMesh,
            highlightMesh,
            highlightMaterial: hlMat,
        });
    }

    // 4. Glowing Runic Inner-Path Channels connecting inner sequences to cell 69
    const innerBranches: { color: number; ids: number[] }[] = [
        { color: 0xe74c3c, ids: [40, 68, 65, 62, 59, 69] },
        { color: 0xf1c40f, ids: [16, 58, 51, 52, 53, 54, 69] },
        { color: 0xe5e7eb, ids: [25, 67, 56, 60, 61, 63, 64, 69] },
        { color: 0x8e6bbf, ids: [1, 49, 50, 55, 57, 66, 69] },
    ];

    for (const branch of innerBranches) {
        const pts: THREE.Vector3[] = [];
        for (const id of branch.ids) {
            const rec = cellsById.get(id);
            if (rec) pts.push(new THREE.Vector3(rec.center.x, 0.055, rec.center.z));
        }
        if (pts.length >= 2) {
            const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.15);
            const tubeGeo = trackGeo(new THREE.TubeGeometry(curve, 36, 0.045, 6, false));
            const tubeMat = trackMat(
                new THREE.MeshStandardMaterial({
                    color: branch.color,
                    emissive: branch.color,
                    emissiveIntensity: 0.7,
                    roughness: 0.35,
                    metalness: 0.2,
                })
            );
            const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
            root.add(tubeMesh);
        }
    }

    // 5. Four Physical Gate Portals on cells 49, 58, 67, 68
    const center69 = cellsById.get(69)?.center || new THREE.Vector3(0, 0, 0);
    (Object.keys(GATE_CELLS) as KeyColor[]).forEach(color => {
        const cellId = GATE_CELLS[color];
        const cellRec = cellsById.get(cellId);
        if (!cellRec) return;

        const gateGroup = new THREE.Group();
        gateGroup.position.set(cellRec.center.x, cellRec.topY, cellRec.center.z);

        // Orient portal perpendicular to vector toward center cell 69
        const dx = center69.x - cellRec.center.x;
        const dz = center69.z - cellRec.center.z;
        gateGroup.rotation.y = Math.atan2(dx, dz);

        const stoneMat = trackMat(
            new THREE.MeshStandardMaterial({
                color: 0x3b3538,
                roughness: 0.65,
                metalness: 0.18,
            })
        );
        const accentColor = GATE_COLORS_HEX[color];
        const runeMat = trackMat(
            new THREE.MeshStandardMaterial({
                color: accentColor,
                emissive: accentColor,
                emissiveIntensity: 0.9,
                roughness: 0.25,
                metalness: 0.6,
            })
        );

        const pillarGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.95, 0.16));
        const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
        leftPillar.position.set(-0.46, 0.475, 0);
        leftPillar.castShadow = true;

        const rightPillar = new THREE.Mesh(pillarGeo, stoneMat);
        rightPillar.position.set(0.46, 0.475, 0);
        rightPillar.castShadow = true;

        const lintelGeo = trackGeo(new THREE.BoxGeometry(1.12, 0.14, 0.2));
        const lintel = new THREE.Mesh(lintelGeo, stoneMat);
        lintel.position.set(0, 0.98, 0);
        lintel.castShadow = true;

        const capGeo = trackGeo(new THREE.ConeGeometry(0.11, 0.2, 4));
        const capL = new THREE.Mesh(capGeo, runeMat);
        capL.position.set(-0.46, 1.12, 0);
        const capR = new THREE.Mesh(capGeo, runeMat);
        capR.position.set(0.46, 1.12, 0);

        // Energy barrier between pillars
        const barrierGeo = trackGeo(new THREE.PlaneGeometry(0.78, 0.86));
        const barrierMat = trackMat(
            new THREE.MeshBasicMaterial({
                color: accentColor,
                transparent: true,
                opacity: 0.42,
                side: THREE.DoubleSide,
                depthWrite: false,
            })
        );
        const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
        barrierMesh.position.set(0, 0.45, 0);

        // Floating Lock Prism
        const lockGeo = trackGeo(new THREE.OctahedronGeometry(0.17, 0));
        const lockCrystal = new THREE.Mesh(lockGeo, runeMat);
        lockCrystal.position.set(0, 0.56, 0);
        lockCrystal.castShadow = true;

        gateGroup.add(leftPillar, rightPillar, lintel, capL, capR, barrierMesh, lockCrystal);
        root.add(gateGroup);

        gates.push({
            color,
            cellId,
            group: gateGroup,
            barrierMesh,
            lockCrystal,
            openProgress: 0,
        });
    });

    const getCellWorldCenter = (cellId: number): THREE.Vector3 | null => {
        const rec = cellsById.get(cellId);
        return rec ? rec.center.clone() : null;
    };

    const updateHighlights = (
        reachableSet: Set<number>,
        hoveredCellId: number | null,
        inspectionMode: boolean,
        elapsed: number
    ) => {
        const pulse = 0.32 + Math.sin(elapsed * 4.2) * 0.12;
        cellsById.forEach((rec, id) => {
            const isReachable = reachableSet.has(id);
            const isHovered = hoveredCellId === id;

            if (isHovered && (isReachable || inspectionMode)) {
                rec.highlightMesh.visible = true;
                rec.highlightMaterial.color.setHex(inspectionMode ? 0x38bdf8 : 0xffe066);
                rec.highlightMaterial.opacity = 0.72;
            } else if (isReachable) {
                rec.highlightMesh.visible = true;
                rec.highlightMaterial.color.setHex(0x2ecc71);
                rec.highlightMaterial.opacity = pulse;
            } else if (inspectionMode) {
                rec.highlightMesh.visible = true;
                rec.highlightMaterial.color.setHex(0x60a5fa);
                rec.highlightMaterial.opacity = 0.18;
            } else {
                rec.highlightMesh.visible = false;
            }
        });
    };

    const updateGates = (gatesState: GameState['gates'], elapsed: number, dt: number) => {
        for (const gate of gates) {
            const isOpen = gatesState[`${gate.color}Open`];
            const target = isOpen ? 1 : 0;
            gate.openProgress = THREE.MathUtils.damp(gate.openProgress, target, 4.5, dt);

            const closedFactor = 1 - gate.openProgress;
            const barrierMat = gate.barrierMesh.material as THREE.MeshBasicMaterial;
            barrierMat.opacity = closedFactor * (0.35 + Math.sin(elapsed * 3.5) * 0.08);
            gate.barrierMesh.visible = closedFactor > 0.02;

            gate.lockCrystal.visible = closedFactor > 0.02;
            gate.lockCrystal.position.y = 0.56 + Math.sin(elapsed * 2.4) * 0.05 + gate.openProgress * 0.85;
            gate.lockCrystal.rotation.y += dt * (1.2 + gate.openProgress * 6);
            gate.lockCrystal.scale.setScalar(Math.max(0.01, closedFactor));
        }
    };

    return {
        root,
        cellsById,
        hitMeshes,
        gates,
        disposables: { geometries, materials, textures },
        getCellWorldCenter,
        updateHighlights,
        updateGates,
    };
}
