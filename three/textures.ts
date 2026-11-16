import * as THREE from 'three';

function hash2D(x: number, y: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return n - Math.floor(n);
}

export function createWoodTextures(maxAnisotropy: number): {
    map: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
} {
    const size = 512;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = size;
    colorCanvas.height = size;
    const ctx = colorCanvas.getContext('2d')!;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rCtx = roughCanvas.getContext('2d')!;

    ctx.fillStyle = '#3b261a';
    ctx.fillRect(0, 0, size, size);

    rCtx.fillStyle = '#a8a8a8';
    rCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
        const grainWave = Math.sin(y * 0.08) * 8 + Math.sin(y * 0.023) * 14;
        for (let i = 0; i < 6; i++) {
            const band = Math.sin((y + grainWave + i * 19) * 0.14);
            const alpha = 0.06 + Math.abs(band) * 0.09;
            ctx.fillStyle = band > 0 ? `rgba(88, 56, 36, ${alpha})` : `rgba(28, 16, 10, ${alpha})`;
            ctx.fillRect(0, y, size, 1);

            const rVal = Math.round(135 + band * 28);
            rCtx.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
            rCtx.fillRect(0, y, size, 1);
        }
    }

    // Subtle carved knots & longitudinal pores
    for (let i = 0; i < 160; i++) {
        const x = hash2D(i, 1) * size;
        const y = hash2D(i, 2) * size;
        const w = 18 + hash2D(i, 3) * 70;
        const h = 1 + hash2D(i, 4) * 2;
        ctx.fillStyle = 'rgba(20, 11, 7, 0.25)';
        ctx.fillRect(x, y, w, h);
    }

    const map = new THREE.CanvasTexture(colorCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 2);
    map.anisotropy = maxAnisotropy;

    const roughnessMap = new THREE.CanvasTexture(roughCanvas);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(3, 2);
    roughnessMap.anisotropy = maxAnisotropy;

    return { map, roughnessMap };
}

export function createStoneBoardSurfaceTexture(maxAnisotropy: number): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Warm dark slate & aged bronze parchment under-plate
    const grad = ctx.createRadialGradient(size / 2, size / 2, 30, size / 2, size / 2, size * 0.72);
    grad.addColorStop(0, '#3a2c24');
    grad.addColorStop(0.65, '#2b201b');
    grad.addColorStop(1, '#1d1512');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle dream-mandala etched lines in the middle
    ctx.strokeStyle = 'rgba(240, 189, 23, 0.18)';
    ctx.lineWidth = 2;
    const cx = size / 2;
    const cy = size / 2;
    [70, 120, 175, 225].forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.setLineDash(idx % 2 === 0 ? [] : [8, 8]);
        ctx.stroke();
    });
    ctx.setLineDash([]);

    // 8-point compass rays
    for (let a = 0; a < 8; a++) {
        const angle = (a * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * 45, cy + Math.sin(angle) * 45);
        ctx.lineTo(cx + Math.cos(angle) * 230, cy + Math.sin(angle) * 230);
        ctx.strokeStyle = 'rgba(240, 189, 23, 0.10)';
        ctx.stroke();
    }

    // Subtle stone speckles
    for (let i = 0; i < 1200; i++) {
        const x = hash2D(i, 11) * size;
        const y = hash2D(i, 17) * size;
        const light = hash2D(i, 23) > 0.5;
        ctx.fillStyle = light ? 'rgba(255,240,210,0.035)' : 'rgba(0,0,0,0.07)';
        ctx.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    return texture;
}

export function createCellTopTexture(
    cellId: number,
    options: {
        baseColor: string;
        borderColor: string;
        textColor: string;
        isCenter?: boolean;
        isCorner?: boolean;
        isGate?: boolean;
        gateColor?: string;
    },
    maxAnisotropy: number
): THREE.CanvasTexture {
    const size = options.isCenter ? 256 : 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base stone/parchment fill
    ctx.fillStyle = options.baseColor;
    ctx.fillRect(0, 0, size, size);

    // Subtle inner stone grain
    for (let i = 0; i < 140; i++) {
        const x = hash2D(cellId * 31 + i, 5) * size;
        const y = hash2D(cellId * 31 + i, 9) * size;
        ctx.fillStyle = hash2D(i, cellId) > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
        ctx.fillRect(x, y, 2, 2);
    }

    // Carved inner border
    const pad = options.isCenter ? 14 : 8;
    ctx.strokeStyle = options.borderColor;
    ctx.lineWidth = options.isCenter ? 4 : 3;
    ctx.strokeRect(pad, pad, size - pad * 2, size - pad * 2);

    if (options.isCenter) {
        // Awakening mandala on cell 69
        const c = size / 2;
        ctx.strokeStyle = 'rgba(240, 189, 23, 0.72)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c, c, size * 0.34, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(c, c, size * 0.24, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 12; i++) {
            const ang = (i * Math.PI) / 6;
            ctx.beginPath();
            ctx.moveTo(c + Math.cos(ang) * size * 0.24, c + Math.sin(ang) * size * 0.24);
            ctx.lineTo(c + Math.cos(ang) * size * 0.34, c + Math.sin(ang) * size * 0.34);
            ctx.stroke();
        }
    }

    if (options.isCorner) {
        // Corner compass rune
        const c = size / 2;
        ctx.strokeStyle = options.borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c, c, size * 0.26, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (options.isGate && options.gateColor) {
        ctx.strokeStyle = options.gateColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(pad + 5, pad + 5, size - (pad + 5) * 2, size - (pad + 5) * 2);
    }

    // Engraved cell number
    ctx.fillStyle = options.textColor;
    ctx.font = options.isCenter ? '700 44px "Cinzel", Georgia, serif' : '700 26px "Cinzel", Georgia, serif';
    ctx.textAlign = options.isCenter ? 'center' : 'right';
    ctx.textBaseline = options.isCenter ? 'middle' : 'bottom';
    if (options.isCenter) {
        ctx.fillText(String(cellId), size / 2, size / 2 + 2);
    } else {
        ctx.fillText(String(cellId), size - 13, size - 10);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export function createRuneHaloTexture(colorHex: string): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const c = size / 2;

    ctx.clearRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(c, c, size * 0.22, c, c, size * 0.48);
    glow.addColorStop(0, 'rgba(255,255,255,0)');
    glow.addColorStop(0.65, `${colorHex}55`);
    glow.addColorStop(0.82, `${colorHex}cc`);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(c, c, size * 0.39, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(c, c, size * 0.33, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export function createEnemyHpTexture(hp: number, maxHp: number, name: string): THREE.CanvasTexture {
    const w = 256;
    const h = 64;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(20, 14, 24, 0.88)';
    ctx.strokeStyle = 'rgba(240, 189, 23, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f7efe2';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name.slice(0, 18), w / 2, 26);

    const barX = 22;
    const barY = 34;
    const barW = w - 44;
    const barH = 14;

    ctx.fillStyle = '#2d1e2f';
    ctx.fillRect(barX, barY, barW, barH);

    const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(barX, barY, barW * pct, barH);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
