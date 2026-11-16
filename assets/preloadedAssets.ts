/**
 * Questo file centralizza la creazione e l'esportazione di tutte le risorse grafiche (asset)
 * utilizzate nel gioco: sigilli onirici dettagliati in oro brunito e pietra incisa.
 */

const svgToDataUri = (svgString: string): string => {
  if (svgString.startsWith('data:image/')) {
    return svgString;
  }
  const encoded = btoa(unescape(encodeURIComponent(svgString.trim())));
  return `data:image/svg+xml;base64,${encoded}`;
};

type SigilTone = 'gold' | 'crimson' | 'emerald' | 'azure' | 'violet' | 'ivory' | 'amber' | 'slate';

const TONE_MAP: Record<SigilTone, { accent: string; glow: string; dark: string }> = {
  gold: { accent: '#f5d36b', glow: '#f0bd17', dark: '#6d4b12' },
  crimson: { accent: '#ff8a7a', glow: '#e04f3e', dark: '#5e1a14' },
  emerald: { accent: '#80e5a8', glow: '#2ecc71', dark: '#134e2c' },
  azure: { accent: '#8fd3ff', glow: '#4aa3df', dark: '#163f63' },
  violet: { accent: '#d2a6ff', glow: '#a569bd', dark: '#3e1e59' },
  ivory: { accent: '#fff9e6', glow: '#dcd3bd', dark: '#5e5648' },
  amber: { accent: '#ffd670', glow: '#e69d18', dark: '#66400a' },
  slate: { accent: '#b7c2cc', glow: '#7f8c8d', dark: '#27313a' },
};

/**
 * Incornicia un simbolo vettoriale centrale in un medaglione di pietra scura incisa
 * con doppio anello in oro brunito, tacche runiche cardinali e riflesso interno.
 */
const createSigilSvg = (
  innerArtwork: string,
  tone: SigilTone = 'gold',
  size = 64,
  shape: 'circle' | 'hex' | 'shield' = 'circle'
): string => {
  const pal = TONE_MAP[tone];
  const frameShape =
    shape === 'hex'
      ? `<polygon points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5" fill="url(#stoneBg)" stroke="url(#goldRim)" stroke-width="2.6"/>
         <polygon points="32,7.5 53,19.8 53,44.2 32,56.5 11,44.2 11,19.8" fill="none" stroke="url(#goldSoft)" stroke-width="1" opacity="0.68"/>`
      : shape === 'shield'
      ? `<path d="M32 4 L55 11 V31 C55 46 43 56 32 60 C21 56 9 46 9 31 V11 Z" fill="url(#stoneBg)" stroke="url(#goldRim)" stroke-width="2.5"/>
         <path d="M32 8 L51 14 V31 C51 43 41 51.5 32 55 C23 51.5 13 43 13 31 V14 Z" fill="none" stroke="url(#goldSoft)" stroke-width="1" opacity="0.65"/>`
      : `<circle cx="32" cy="32" r="29" fill="url(#stoneBg)" stroke="url(#goldRim)" stroke-width="2.6"/>
         <circle cx="32" cy="32" r="24.5" fill="none" stroke="url(#goldSoft)" stroke-width="1" stroke-dasharray="3 2.5" opacity="0.72"/>
         <circle cx="32" cy="32" r="21" fill="none" stroke="${pal.glow}" stroke-width="0.7" opacity="0.35"/>`;

  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="stoneBg" cx="42%" cy="34%" r="68%">
      <stop offset="0%" stop-color="#352822"/>
      <stop offset="58%" stop-color="#1e1512"/>
      <stop offset="100%" stop-color="#110b09"/>
    </radialGradient>
    <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe794"/>
      <stop offset="45%" stop-color="#d4a63a"/>
      <stop offset="100%" stop-color="#7c5514"/>
    </linearGradient>
    <linearGradient id="goldSoft" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9e7122"/>
      <stop offset="50%" stop-color="#f7dc88"/>
      <stop offset="100%" stop-color="#b88428"/>
    </linearGradient>
    <radialGradient id="toneAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${pal.glow}" stop-opacity="0.34"/>
      <stop offset="70%" stop-color="${pal.dark}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${frameShape}
  <circle cx="32" cy="32" r="19" fill="url(#toneAura)"/>
  <g stroke="url(#goldRim)" stroke-width="1.3" opacity="0.82">
    <line x1="32" y1="2.5" x2="32" y2="6.5"/>
    <line x1="32" y1="57.5" x2="32" y2="61.5"/>
    <line x1="2.5" y1="32" x2="6.5" y2="32"/>
    <line x1="57.5" y1="32" x2="61.5" y2="32"/>
  </g>
  ${innerArtwork}
</svg>`;
};

// ===============================================================================================
// --- SFONDI E LOGHI ---
// ===============================================================================================

const rawGameBoardBackgroundSvg = `<svg width="520" height="340" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bgGrad" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="#4e3324"/><stop offset="100%" stop-color="#1c120d"/></radialGradient></defs><rect width="520" height="340" fill="url(#bgGrad)"/></svg>`;

const rawLogoRectangleSvg = `<svg width="480" height="120" viewBox="0 0 480 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="woodPanel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2c1b13"/>
      <stop offset="50%" stop-color="#1b100b"/>
      <stop offset="100%" stop-color="#261710"/>
    </linearGradient>
    <linearGradient id="goldLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff0ad"/>
      <stop offset="40%" stop-color="#f0bd17"/>
      <stop offset="80%" stop-color="#b88418"/>
      <stop offset="100%" stop-color="#f7da74"/>
    </linearGradient>
    <radialGradient id="crestGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f0bd17" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#f0bd17" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="4" y="4" width="472" height="112" rx="18" fill="url(#woodPanel)" stroke="url(#goldLeaf)" stroke-width="3"/>
  <rect x="11" y="11" width="458" height="98" rx="12" fill="none" stroke="url(#goldLeaf)" stroke-width="1" opacity="0.55"/>
  <ellipse cx="240" cy="60" rx="180" ry="44" fill="url(#crestGlow)"/>
  <g stroke="url(#goldLeaf)" fill="none" stroke-width="1.6" opacity="0.85">
    <circle cx="52" cy="60" r="24"/>
    <circle cx="52" cy="60" r="16" stroke-dasharray="2.5 2.5"/>
    <path d="M52 31 L56 56 L81 60 L56 64 L52 89 L48 64 L23 60 L48 56 Z" fill="url(#goldLeaf)" opacity="0.9"/>
    <circle cx="428" cy="60" r="24"/>
    <circle cx="428" cy="60" r="16" stroke-dasharray="2.5 2.5"/>
    <path d="M428 31 L432 56 L457 60 L432 64 L428 89 L424 64 L399 60 L424 56 Z" fill="url(#goldLeaf)" opacity="0.9"/>
  </g>
  <text x="240" y="68" font-family="Georgia, 'Times New Roman', serif" font-size="46" font-weight="bold" letter-spacing="8" fill="url(#goldLeaf)" text-anchor="middle">COMPETO</text>
  <text x="240" y="92" font-family="Georgia, serif" font-size="11" letter-spacing="4" fill="#d9c6a3" text-anchor="middle" opacity="0.9">VIAGGIO NELL'ONIRICO</text>
</svg>`;

const rawLogoSquareSvg = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sqBg" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#352117"/>
      <stop offset="100%" stop-color="#140c08"/>
    </radialGradient>
    <linearGradient id="sqGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffefaa"/>
      <stop offset="50%" stop-color="#e5b024"/>
      <stop offset="100%" stop-color="#875d12"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="92" fill="url(#sqBg)" stroke="url(#sqGold)" stroke-width="5"/>
  <circle cx="100" cy="100" r="80" fill="none" stroke="url(#sqGold)" stroke-width="1.5" stroke-dasharray="5 3"/>
  <circle cx="100" cy="100" r="58" fill="none" stroke="url(#sqGold)" stroke-width="1.2" opacity="0.6"/>
  <path d="M100 18 L111 89 L182 100 L111 111 L100 182 L89 111 L18 100 L89 89 Z" fill="url(#sqGold)" opacity="0.92"/>
  <circle cx="100" cy="100" r="24" fill="#1e130e" stroke="url(#sqGold)" stroke-width="3"/>
  <circle cx="100" cy="100" r="10" fill="url(#sqGold)"/>
</svg>`;

const rawLogoTitleSmallSvg = `<svg width="260" height="58" viewBox="0 0 260 58" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="smGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffefaa"/>
      <stop offset="50%" stop-color="#f0bd17"/>
      <stop offset="100%" stop-color="#a87414"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="256" height="54" rx="10" fill="#1c120d" stroke="url(#smGold)" stroke-width="2"/>
  <path d="M28 14 L31 26 L43 29 L31 32 L28 44 L25 32 L13 29 L25 26 Z" fill="url(#smGold)"/>
  <path d="M232 14 L235 26 L247 29 L235 32 L232 44 L229 32 L217 29 L229 26 Z" fill="url(#smGold)"/>
  <text x="130" y="37" font-family="Georgia, 'Times New Roman', serif" font-size="25" font-weight="bold" letter-spacing="5" fill="url(#smGold)" text-anchor="middle">COMPETO</text>
</svg>`;

// ===============================================================================================
// --- AVATAR GIOCATORI (SIGILLI ARALDICI) ---
// ===============================================================================================

const rawPlayerRedAvatarSvg = createSigilSvg(
  `<circle cx="32" cy="32" r="17" fill="#7c1d16" stroke="#f5b7b1" stroke-width="1.2"/>
   <path d="M32 17 C37 24 41 29 39 37 C37 42 32 46 32 46 C32 46 27 42 25 37 C23 29 27 24 32 17 Z" fill="url(#goldRim)"/>
   <path d="M32 24 C34 28 36 32 34 37 C33 39 32 41 32 41 C32 41 31 39 30 37 C28 32 30 28 32 24 Z" fill="#ff9478"/>`,
  'crimson'
);

const rawPlayerYellowAvatarSvg = createSigilSvg(
  `<circle cx="32" cy="32" r="17" fill="#705209" stroke="#fdeaa0" stroke-width="1.2"/>
   <path d="M32 15 L35.5 26.5 L47 26.5 L37.8 33.5 L41.5 45 L32 38 L22.5 45 L26.2 33.5 L17 26.5 L28.5 26.5 Z" fill="url(#goldRim)"/>
   <circle cx="32" cy="32" r="5" fill="#fff5cc"/>`,
  'amber'
);

const rawPlayerWhiteAvatarSvg = createSigilSvg(
  `<circle cx="32" cy="32" r="17" fill="#5b636e" stroke="#ffffff" stroke-width="1.2"/>
   <path d="M35 18 A13 13 0 1 0 43 41 A10 10 0 1 1 35 18 Z" fill="#f7f5ef" stroke="url(#goldRim)" stroke-width="1.2"/>
   <circle cx="39" cy="24" r="2.2" fill="url(#goldRim)"/>`,
  'ivory'
);

const rawPlayerBlackAvatarSvg = createSigilSvg(
  `<circle cx="32" cy="32" r="17" fill="#181c26" stroke="#9aa5b8" stroke-width="1.2"/>
   <circle cx="32" cy="32" r="9.5" fill="#0d0f15" stroke="url(#goldRim)" stroke-width="2"/>
   <path d="M22 22 L42 42 M42 22 L22 42" stroke="url(#goldRim)" stroke-width="1.4" opacity="0.75"/>
   <circle cx="32" cy="32" r="3.2" fill="#d2a6ff"/>`,
  'slate'
);

// ===============================================================================================
// --- PEDINE 2D COERENTI (PER MINIATURE E LEGENDE) ---
// ===============================================================================================

const makeClassToken = (symbol: string, bg: string, stroke: string, num: number) =>
  `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="16" fill="${bg}" stroke="#d4a63a" stroke-width="2.2"/>
    <circle cx="18" cy="18" r="13" fill="none" stroke="${stroke}" stroke-width="1" opacity="0.6"/>
    ${symbol}
    <circle cx="28" cy="28" r="5" fill="#1c120d" stroke="#d4a63a" stroke-width="1"/>
    <text x="28" y="30" text-anchor="middle" font-size="6.5" fill="#ffe794" font-family="Georgia, serif" font-weight="bold">${num}</text>
  </svg>`;

const swordSym = `<path d="M18 7 L20 20 L18 22 L16 20 Z M13 20 H23 V22 H13 Z M17 22 V28 H19 V22 Z" fill="#f7dc88"/>`;
const bowSym = `<path d="M13 8 C22 12 22 24 13 28 M13 8 V28 M12 18 H25 M22 15 L25 18 L22 21" fill="none" stroke="#f7dc88" stroke-width="1.8" stroke-linecap="round"/>`;
const staffSym = `<path d="M18 11 V29" stroke="#f7dc88" stroke-width="2"/><circle cx="18" cy="9" r="3.5" fill="#d2a6ff" stroke="#f7dc88" stroke-width="1.2"/>`;

const rawPlayerPawnsDeterminato = [1, 2, 3, 4, 5, 6].map((n, i) => makeClassToken(swordSym, i < 3 ? '#7c321b' : '#5e2413', '#f5d36b', n));
const rawPlayerPawnsIntuitivo = [1, 2, 3, 4, 5, 6].map((n, i) => makeClassToken(bowSym, i < 3 ? '#3e5221' : '#2d3d17', '#d9f09e', n));
const rawPlayerPawnsPacifico = [1, 2, 3, 4, 5, 6].map((n, i) => makeClassToken(staffSym, i < 3 ? '#3b2b6b' : '#281d4a', '#d2a6ff', n));

const makeEnemyToken = (fill: string, rim: string, core: string, variant: number) =>
  `<svg viewBox="0 0 32 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 2 L29 11 L26 32 L16 35 L6 32 L3 11 Z" fill="${fill}" stroke="${rim}" stroke-width="2"/>
    <path d="M16 7 L23 14 L20 27 L16 29 L12 27 L9 14 Z" fill="none" stroke="${core}" stroke-width="1.3" opacity="0.85"/>
    <circle cx="16" cy="${14 + (variant % 3) * 2}" r="3.2" fill="${core}"/>
  </svg>`;

const rawEnemyBlack = [0, 1, 2, 3, 4, 5].map(v => makeEnemyToken('#191422', '#8f7ba8', '#c38fff', v));
const rawEnemyWhite = [0, 1, 2, 3, 4, 5].map(v => makeEnemyToken('#dcd8ce', '#8b7a5e', '#f0bd17', v));
const rawEnemyYellow = [0, 1, 2, 3, 4, 5].map(v => makeEnemyToken('#575d18', '#d4a63a', '#d8f051', v));
const rawEnemyRed = [0, 1, 2, 3, 4, 5].map(v => makeEnemyToken('#5c1714', '#d4a63a', '#ff7b54', v));

const rawMiniBossRedSvg = makeEnemyToken('#7a110e', '#f5d36b', '#ffba52', 0);
const rawMiniBossYellowSvg = makeEnemyToken('#8a6b0d', '#f5d36b', '#fff08a', 0);
const rawMiniBossWhiteSvg = makeEnemyToken('#eae6dc', '#d4a63a', '#ffffff', 0);
const rawMiniBossBlackSvg = makeEnemyToken('#120e1c', '#d4a63a', '#d2a6ff', 0);
const rawFinalBossSvg = `<svg viewBox="0 0 40 44" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 2 L37 13 L33 38 L20 42 L7 38 L3 13 Z" fill="#1d0d2b" stroke="#f0bd17" stroke-width="2.6"/>
  <path d="M20 8 L30 16 L26 33 L20 36 L14 33 L10 16 Z" fill="#461b66" stroke="#f5d36b" stroke-width="1.2"/>
  <path d="M20 12 L24 21 L20 30 L16 21 Z" fill="#f0bd17"/>
</svg>`;

const rawMerchantPawns = [0, 1, 2, 3, 4].map(i =>
  createSigilSvg(
    `<path d="M20 42 H44 L41 36 H23 Z" fill="url(#goldRim)"/>
     <path d="M23 36 C23 26 27 20 32 18 C37 20 41 26 41 36 Z" fill="#1e6f5c" stroke="url(#goldRim)" stroke-width="1.8"/>
     <circle cx="32" cy="${27 + (i % 2) * 2}" r="4.2" fill="#f5d36b"/>`,
    'emerald',
    40,
    'hex'
  )
);

const rawNpcPawns = Array.from({ length: 10 }, (_, i) =>
  createSigilSvg(
    `<circle cx="32" cy="23" r="6.5" fill="#e5d5ba" stroke="url(#goldRim)" stroke-width="1.6"/>
     <path d="M20 46 C20 35 44 35 44 46 Z" fill="${i % 2 === 0 ? '#2b5876' : '#534375'}" stroke="url(#goldRim)" stroke-width="1.6"/>
     <circle cx="32" cy="39" r="2.2" fill="#f5d36b"/>`,
    'azure',
    40,
    'circle'
  )
);

// ===============================================================================================
// --- OGGETTI DI GIOCO: TESORI, CASSE, CHIAVI, LUCCHETTI ---
// ===============================================================================================

const rawTreasureItemSvg = createSigilSvg(
  `<ellipse cx="32" cy="33" rx="14" ry="14" fill="#8b6216" stroke="url(#goldRim)" stroke-width="2.2"/>
   <ellipse cx="32" cy="33" rx="9.5" ry="9.5" fill="none" stroke="#ffefaa" stroke-width="1.2"/>
   <path d="M32 23 L34.6 30.4 L42 33 L34.6 35.6 L32 43 L29.4 35.6 L22 33 L29.4 30.4 Z" fill="#fff0ad"/>`,
  'gold'
);

const rawEmptySlotSvg = `<svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="26" fill="rgba(22,14,10,0.55)" stroke="#7a5b3a" stroke-width="1.6" stroke-dasharray="4 3"/>
  <circle cx="32" cy="32" r="18" fill="none" stroke="#5a422b" stroke-width="1" opacity="0.7"/>
  <path d="M32 22 V42 M22 32 H42" stroke="#8b6d49" stroke-width="1.4" opacity="0.45"/>
</svg>`;

const rawTreasureChestClosedSvg = createSigilSvg(
  `<path d="M18 28 C18 20 46 20 46 28 Z" fill="#704224" stroke="url(#goldRim)" stroke-width="2"/>
   <rect x="17" y="28" width="30" height="17" rx="3" fill="#522f18" stroke="url(#goldRim)" stroke-width="2"/>
   <line x1="25" y1="22" x2="25" y2="45" stroke="url(#goldRim)" stroke-width="2.2"/>
   <line x1="39" y1="22" x2="39" y2="45" stroke="url(#goldRim)" stroke-width="2.2"/>
   <rect x="28.5" y="29" width="7" height="8" rx="2" fill="url(#goldRim)" stroke="#2a170b" stroke-width="1"/>
   <circle cx="32" cy="33" r="1.4" fill="#2a170b"/>`,
  'amber',
  64,
  'hex'
);

const rawKeySvg = (gemFill: string, tone: SigilTone) =>
  createSigilSvg(
    `<g transform="rotate(-35 32 32)">
      <circle cx="21" cy="32" r="7.5" fill="${gemFill}" stroke="url(#goldRim)" stroke-width="2.6"/>
      <circle cx="21" cy="32" r="3" fill="#18100c"/>
      <line x1="28.5" y1="32" x2="49" y2="32" stroke="url(#goldRim)" stroke-width="3.4" stroke-linecap="round"/>
      <line x1="41" y1="32" x2="41" y2="39" stroke="url(#goldRim)" stroke-width="2.8" stroke-linecap="round"/>
      <line x1="47" y1="32" x2="47" y2="40" stroke="url(#goldRim)" stroke-width="2.8" stroke-linecap="round"/>
    </g>`,
    tone,
    64,
    'hex'
  );

const rawGateLockSvg = (gemFill: string, tone: SigilTone) =>
  createSigilSvg(
    `<path d="M24 28 V22 A8 8 0 0 1 40 22 V28" fill="none" stroke="url(#goldRim)" stroke-width="3.2" stroke-linecap="round"/>
     <rect x="20" y="28" width="24" height="19" rx="4" fill="${gemFill}" stroke="url(#goldRim)" stroke-width="2.2"/>
     <circle cx="32" cy="36" r="2.6" fill="#1a110d"/>
     <path d="M31 37.5 L33 37.5 L34 43 H30 Z" fill="#1a110d"/>`,
    tone,
    64,
    'shield'
  );

const rawWeaponOnMapIconSvg = createSigilSvg(
  `<path d="M21 43 L41 21 L45 17 L41 21 M24 34 L30 40 M19 45 L24 40" stroke="url(#goldRim)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
   <polygon points="46,16 38,19 43,24" fill="#ffefaa"/>`,
  'gold'
);

// ===============================================================================================
// --- CONSUMABILI ---
// ===============================================================================================

const rawPotionIcon = createSigilSvg(
  `<rect x="28" y="14" width="8" height="4" rx="1" fill="#8b5e34" stroke="url(#goldRim)" stroke-width="1.2"/>
   <path d="M29 18 V23 L20 35 C18.5 39 21 46 27 46 H37 C43 46 45.5 39 44 35 L35 23 V18 Z" fill="#7a1b24" stroke="url(#goldRim)" stroke-width="2"/>
   <path d="M22 36 C25 34 30 38 35 35 C39 33 41 35 42 37 C42 42 39 44 36 44 H28 C25 44 22 41 22 36 Z" fill="#e84a5f" opacity="0.88"/>
   <circle cx="29" cy="39" r="1.4" fill="#ffd9a0"/>
   <circle cx="35" cy="37" r="1" fill="#ffd9a0"/>`,
  'crimson'
);

const rawScrollIcon = createSigilSvg(
  `<rect x="20" y="16" width="24" height="32" rx="3" fill="#e8d6b3" stroke="url(#goldRim)" stroke-width="2"/>
   <rect x="17" y="15" width="30" height="5" rx="2.5" fill="url(#goldRim)"/>
   <rect x="17" y="44" width="30" height="5" rx="2.5" fill="url(#goldRim)"/>
   <path d="M32 23 C36 27 38 31 36 35 C34 38 32 40 32 40 C32 40 30 38 28 35 C26 31 28 27 32 23 Z" fill="#d94814" stroke="#f0bd17" stroke-width="1"/>
   <circle cx="32" cy="33" r="2.5" fill="#fff3b0"/>`,
  'amber'
);

const makeBagIcon = (tier: 1 | 2 | 3 | 4) =>
  createSigilSvg(
    `<path d="M25 22 C25 16 39 16 39 22" fill="none" stroke="url(#goldRim)" stroke-width="2.4"/>
     <rect x="${21 - tier}" y="${23 - (tier > 2 ? 1 : 0)}" width="${22 + tier * 2}" height="${22 + tier}" rx="5" fill="#6b3e22" stroke="url(#goldRim)" stroke-width="2"/>
     <path d="M${21 - tier} 28 Q32 ${32 + tier} ${43 + tier} 28" fill="none" stroke="url(#goldRim)" stroke-width="1.8"/>
     <circle cx="32" cy="32" r="${2.2 + tier * 0.4}" fill="#f5d36b"/>
     ${tier >= 3 ? `<circle cx="25" cy="39" r="1.8" fill="url(#goldRim)"/><circle cx="39" cy="39" r="1.8" fill="url(#goldRim)"/>` : ''}`,
    tier >= 3 ? 'gold' : 'amber'
  );

// ===============================================================================================
// --- CRISTALLI DIALOGO & FACCE DADO ---
// ===============================================================================================

const rawDialogueCrystalOff = createSigilSvg(
  `<polygon points="32,14 45,25 41,45 32,50 23,45 19,25" fill="#46525c" stroke="#9aa7b2" stroke-width="2"/>
   <polyline points="32,14 32,50 M19,25 32,32 45,25" fill="none" stroke="#85929e" stroke-width="1.2"/>`,
  'slate',
  64,
  'hex'
);

const rawDialogueCrystalOn = createSigilSvg(
  `<polygon points="32,13 46,25 42,46 32,51 22,46 18,25" fill="#3a8fd9" stroke="#bfe6ff" stroke-width="2"/>
   <polygon points="32,17 40,26 37,43 32,46 27,43 24,26" fill="#7fd0ff" opacity="0.6"/>
   <circle cx="32" cy="30" r="3" fill="#ffffff"/>`,
  'azure',
  64,
  'hex'
);

const rawDialogueCrystalIrritated = createSigilSvg(
  `<polygon points="32,13 46,25 42,46 32,51 22,46 18,25" fill="#a82420" stroke="#ffb3a7" stroke-width="2"/>
   <polyline points="25,21 34,31 28,39 36,47" fill="none" stroke="#ffe082" stroke-width="1.8" stroke-linecap="round"/>`,
  'crimson',
  64,
  'hex'
);

const rawMissDiceFaceSvg = createSigilSvg(
  `<circle cx="32" cy="32" r="14" fill="none" stroke="#8f8274" stroke-width="2.4"/>
   <path d="M23 41 L41 23 M23 23 L41 41" stroke="#b39f89" stroke-width="2.6" stroke-linecap="round"/>`,
  'slate'
);

const rawHitIconString = createSigilSvg(
  `<path d="M32 16 L36 28 L48 32 L36 36 L32 48 L28 36 L16 32 L28 28 Z" fill="url(#goldRim)" stroke="#fff3c4" stroke-width="1.2"/>
   <circle cx="32" cy="32" r="4.5" fill="#fff8dc"/>`,
  'gold'
);

const rawCritIconString = createSigilSvg(
  `<polygon points="32,12 37,24 50,24 40,33 44,46 32,38 20,46 24,33 14,24 27,24" fill="url(#goldRim)" stroke="#fff6cf" stroke-width="1.5"/>
   <circle cx="32" cy="30" r="5" fill="#ffffff" opacity="0.9"/>`,
  'amber'
);

// ===============================================================================================
// --- DESIDERI (ARMI) ---
// ===============================================================================================

const rawGenericWeaponSvg = createSigilSvg(
  `<path d="M21 44 L43 20" stroke="url(#goldRim)" stroke-width="3" stroke-linecap="round"/>
   <path d="M23 35 L29 41" stroke="#ffefaa" stroke-width="2.6" stroke-linecap="round"/>
   <polygon points="46,16 37,19 43,25" fill="#ffefaa"/>`,
  'gold',
  64,
  'shield'
);

const rawWeaponIcons: Record<string, string> = {
  generic: rawGenericWeaponSvg,
  'Desiderio di Calma': createSigilSvg(
    `<path d="M18 35 Q25 30 32 35 T46 35" fill="none" stroke="#8fd3ff" stroke-width="2.2" stroke-linecap="round"/>
     <path d="M21 41 Q26.5 38 32 41 T43 41" fill="none" stroke="url(#goldRim)" stroke-width="1.8" stroke-linecap="round"/>
     <path d="M32 18 C36 23 36 28 32 31 C28 28 28 23 32 18 Z" fill="url(#goldRim)"/>`,
    'azure', 64, 'shield'
  ),
  'Desiderio di Accoglienza': createSigilSvg(
    `<path d="M21 24 H43 C43 35 37 39 32 40 C27 39 21 35 21 24 Z" fill="none" stroke="url(#goldRim)" stroke-width="2.4"/>
     <line x1="32" y1="40" x2="32" y2="47" stroke="url(#goldRim)" stroke-width="2.4"/>
     <line x1="25" y1="47" x2="39" y2="47" stroke="url(#goldRim)" stroke-width="2.4" stroke-linecap="round"/>
     <circle cx="32" cy="20" r="3" fill="#ffd670"/>`,
    'amber', 64, 'shield'
  ),
  'Desiderio di Equilibrio': createSigilSvg(
    `<line x1="32" y1="17" x2="32" y2="46" stroke="url(#goldRim)" stroke-width="2.2"/>
     <line x1="19" y1="24" x2="45" y2="24" stroke="url(#goldRim)" stroke-width="2.2" stroke-linecap="round"/>
     <path d="M19 24 L15 34 H23 Z M45 24 L41 34 H49 Z" fill="none" stroke="#f5d36b" stroke-width="1.6"/>
     <circle cx="32" cy="17" r="2.6" fill="#fff0ad"/>`,
    'gold', 64, 'shield'
  ),
  'Desiderio di Coraggio': createSigilSvg(
    `<path d="M32 14 L36 37 L32 41 L28 37 Z" fill="#ffdf80" stroke="url(#goldRim)" stroke-width="1.4"/>
     <line x1="23" y1="37" x2="41" y2="37" stroke="url(#goldRim)" stroke-width="2.8" stroke-linecap="round"/>
     <line x1="32" y1="41" x2="32" y2="48" stroke="url(#goldRim)" stroke-width="2.6" stroke-linecap="round"/>`,
    'crimson', 64, 'shield'
  ),
  'Desiderio di Presenza': createSigilSvg(
    `<circle cx="32" cy="32" r="13" fill="none" stroke="url(#goldRim)" stroke-width="2"/>
     <path d="M32 16 V48 M16 32 H48" stroke="url(#goldRim)" stroke-width="1.5" opacity="0.7"/>
     <circle cx="32" cy="32" r="5" fill="#f5d36b"/>
     <circle cx="32" cy="32" r="2" fill="#1a110d"/>`,
    'emerald', 64, 'shield'
  ),
  'Desiderio di Memoria': createSigilSvg(
    `<path d="M22 18 H42 L32 32 L42 46 H22 L32 32 Z" fill="none" stroke="url(#goldRim)" stroke-width="2.2" stroke-linejoin="round"/>
     <path d="M26 43 H38 L32 35 Z" fill="#f5d36b"/>
     <circle cx="32" cy="24" r="1.8" fill="#8fd3ff"/>`,
    'azure', 64, 'shield'
  ),
  'Desiderio di Perdono': createSigilSvg(
    `<path d="M21 44 C24 30 31 20 43 17 C41 28 34 36 21 44 Z" fill="none" stroke="url(#goldRim)" stroke-width="2.2"/>
     <path d="M20 45 L41 20" stroke="#fff0ad" stroke-width="1.6" stroke-linecap="round"/>`,
    'ivory', 64, 'shield'
  ),
  'Desiderio di Silenzio': createSigilSvg(
    `<path d="M36 18 A13 13 0 1 0 44 41 A10 10 0 1 1 36 18 Z" fill="url(#goldRim)"/>
     <circle cx="22" cy="25" r="1.5" fill="#d2a6ff"/>
     <circle cx="42" cy="23" r="1.8" fill="#fff0ad"/>`,
    'violet', 64, 'shield'
  ),
  'Desiderio di Connessione': createSigilSvg(
    `<circle cx="26" cy="32" r="9.5" fill="none" stroke="url(#goldRim)" stroke-width="2.4"/>
     <circle cx="38" cy="32" r="9.5" fill="none" stroke="#ffe794" stroke-width="2.4"/>
     <circle cx="32" cy="32" r="2.3" fill="#ffffff"/>`,
    'gold', 64, 'shield'
  ),
  'Desiderio di Gioia': createSigilSvg(
    `<circle cx="32" cy="32" r="7.5" fill="url(#goldRim)"/>
     <g stroke="#ffe794" stroke-width="2.2" stroke-linecap="round">
       <line x1="32" y1="15" x2="32" y2="21"/>
       <line x1="32" y1="43" x2="32" y2="49"/>
       <line x1="15" y1="32" x2="21" y2="32"/>
       <line x1="43" y1="32" x2="49" y2="32"/>
       <line x1="20" y1="20" x2="24" y2="24"/>
       <line x1="40" y1="40" x2="44" y2="44"/>
       <line x1="44" y1="20" x2="40" y2="24"/>
       <line x1="24" y1="40" x2="20" y2="44"/>
     </g>`,
    'amber', 64, 'shield'
  ),
};

// ===============================================================================================
// --- OGGETTI MISSIONE (13 RELIQUIE UNICHE) ---
// ===============================================================================================

const rawQuestItemIcons: Record<string, string> = {
  'Treno per Lisa': createSigilSvg(
    `<rect x="19" y="25" width="23" height="12" rx="2" fill="url(#goldRim)"/>
     <rect x="21" y="20" width="9" height="6" fill="#ffe794"/>
     <rect x="35" y="18" width="4" height="7" fill="url(#goldRim)"/>
     <circle cx="24" cy="40" r="3.2" fill="#1b120d" stroke="#ffe794" stroke-width="1.6"/>
     <circle cx="33" cy="40" r="3.2" fill="#1b120d" stroke="#ffe794" stroke-width="1.6"/>
     <circle cx="40" cy="40" r="2.5" fill="#1b120d" stroke="#ffe794" stroke-width="1.4"/>`,
    'amber'
  ),
  'Mappa di Casa': createSigilSvg(
    `<polygon points="18,22 28,19 36,23 46,20 46,42 36,45 28,41 18,44" fill="#d9c39e" stroke="url(#goldRim)" stroke-width="2"/>
     <path d="M27 33 L32 28 L37 33 V39 H27 Z" fill="#6b3b21"/>
     <line x1="23" y1="27" x2="29" y2="25" stroke="#6b3b21" stroke-width="1.5" stroke-dasharray="2 2"/>`,
    'gold'
  ),
  'Specchio Integro': createSigilSvg(
    `<ellipse cx="32" cy="27" rx="10" ry="12" fill="#8fd3ff" opacity="0.72" stroke="url(#goldRim)" stroke-width="2.6"/>
     <line x1="32" y1="39" x2="32" y2="49" stroke="url(#goldRim)" stroke-width="3" stroke-linecap="round"/>
     <line x1="27" y1="22" x2="35" y2="30" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>`,
    'azure'
  ),
  'Chitarra Autentica': createSigilSvg(
    `<g transform="rotate(-30 32 32)">
      <ellipse cx="27" cy="36" rx="7" ry="8" fill="#8b4d24" stroke="url(#goldRim)" stroke-width="1.8"/>
      <ellipse cx="33" cy="29" rx="5" ry="5.5" fill="#8b4d24" stroke="url(#goldRim)" stroke-width="1.8"/>
      <circle cx="30" cy="33" r="2.3" fill="#1b120d" stroke="#ffe794" stroke-width="0.9"/>
      <line x1="35" y1="24" x2="43" y2="14" stroke="url(#goldRim)" stroke-width="2.6" stroke-linecap="round"/>
    </g>`,
    'amber'
  ),
  'Cuore di Pietra': createSigilSvg(
    `<path d="M32 46 C22 39 17 32 17 25 A7.5 7.5 0 0 1 32 23 A7.5 7.5 0 0 1 47 25 C47 32 42 39 32 46 Z" fill="#636b73" stroke="url(#goldRim)" stroke-width="2.2"/>
     <polyline points="32,23 30,31 35,36 32,45" fill="none" stroke="#ffd670" stroke-width="1.8" stroke-linecap="round"/>`,
    'slate'
  ),
  'Firmamento di Enrico': createSigilSvg(
    `<path d="M18 40 A14 14 0 0 1 46 40 Z" fill="#1c2c4c" stroke="url(#goldRim)" stroke-width="2"/>
     <circle cx="25" cy="31" r="1.8" fill="#fff0ad"/>
     <circle cx="33" cy="24" r="2.4" fill="#ffe794"/>
     <circle cx="39" cy="32" r="1.6" fill="#fff0ad"/>
     <polyline points="25,31 33,24 39,32" fill="none" stroke="#f5d36b" stroke-width="1" opacity="0.8"/>`,
    'azure'
  ),
  'Veste di Sofia': createSigilSvg(
    `<path d="M25 18 L32 22 L39 18 L43 26 L38 28 L42 46 H22 L26 28 L21 26 Z" fill="#a84352" stroke="url(#goldRim)" stroke-width="2" stroke-linejoin="round"/>
     <line x1="32" y1="22" x2="32" y2="46" stroke="#ffdf80" stroke-width="1.2" opacity="0.7"/>`,
    'crimson'
  ),
  'Spensieratezza di Marco': createSigilSvg(
    `<path d="M32 32 C24 20 17 23 20 31 C22 36 28 34 32 32 Z M32 32 C40 20 47 23 44 31 C42 36 36 34 32 32 Z" fill="url(#goldRim)" opacity="0.9"/>
     <path d="M32 32 C25 35 22 42 27 44 C30 45 31 38 32 32 Z M32 32 C39 35 42 42 37 44 C34 45 33 38 32 32 Z" fill="#80e5a8"/>
     <line x1="32" y1="24" x2="32" y2="43" stroke="#fff8dc" stroke-width="1.6"/>`,
    'emerald'
  ),
  'Pagina Bianca di Giulia': createSigilSvg(
    `<path d="M18 20 H31 V44 H18 Z M33 20 H46 V44 H33 Z" fill="#f3ead8" stroke="url(#goldRim)" stroke-width="2"/>
     <path d="M39 16 C43 17 44 24 38 33 L35 37 L36 32 C37 26 37 20 39 16 Z" fill="url(#goldRim)"/>`,
    'ivory'
  ),
  'Punto d\'Appoggio': createSigilSvg(
    `<rect x="21" y="18" width="22" height="4" rx="1" fill="url(#goldRim)"/>
     <rect x="25" y="22" width="14" height="20" fill="#c7b89c" stroke="url(#goldRim)" stroke-width="1.8"/>
     <line x1="29" y1="22" x2="29" y2="42" stroke="#6c5a44" stroke-width="1.4"/>
     <line x1="35" y1="22" x2="35" y2="42" stroke="#6c5a44" stroke-width="1.4"/>
     <rect x="20" y="42" width="24" height="4" rx="1" fill="url(#goldRim)"/>`,
    'gold'
  ),
  'Nastro Srotolato': createSigilSvg(
    `<circle cx="25" cy="27" r="7" fill="none" stroke="url(#goldRim)" stroke-width="2.4"/>
     <circle cx="25" cy="27" r="2.2" fill="#f5d36b"/>
     <path d="M27 34 C33 38 37 32 42 38 C45 41 40 46 32 45" fill="none" stroke="#ffdf80" stroke-width="2.2" stroke-linecap="round"/>`,
    'amber'
  ),
  'Risata di Elena': createSigilSvg(
    `<circle cx="27" cy="39" r="4.5" fill="url(#goldRim)"/>
     <circle cx="40" cy="35" r="4.5" fill="url(#goldRim)"/>
     <path d="M31 39 V22 L44 19 V35" fill="none" stroke="url(#goldRim)" stroke-width="2.6" stroke-linejoin="round"/>
     <path d="M20 22 L22 25 L25 26 L22 27 L20 30 L18 27 L15 26 L18 25 Z" fill="#fff0ad"/>`,
    'gold'
  ),
  'Desiderio Dimenticato': createSigilSvg(
    `<circle cx="32" cy="34" r="11" fill="#3a2138" stroke="url(#goldRim)" stroke-width="2.4"/>
     <path d="M29 23 A3 3 0 0 1 35 23" fill="none" stroke="url(#goldRim)" stroke-width="2"/>
     <circle cx="32" cy="34" r="4" fill="#ffd670"/>`,
    'violet'
  ),
};

// ===============================================================================================
// --- INTENZIONI (20 SIGILLI MAGICI UNICI) ---
// ===============================================================================================

const makeAttackSpell = (tone: SigilTone, motif: string) =>
  createSigilSvg(motif, tone, 64, 'hex');

const makeShieldSpell = (tone: SigilTone, emblem: string) =>
  createSigilSvg(
    `<path d="M32 16 L46 21 V32 C46 41 39 47 32 49 C25 47 18 41 18 32 V21 Z" fill="rgba(255,255,255,0.06)" stroke="url(#goldRim)" stroke-width="2.2"/>
     ${emblem}`,
    tone,
    64,
    'shield'
  );

const rawMagicSpellIcons: Record<string, string> = {
  // Categoria 1: Risonanza
  'Raggio di Chiarezza': makeAttackSpell('violet',
    `<line x1="18" y1="45" x2="44" y2="19" stroke="#e4c2ff" stroke-width="3" stroke-linecap="round"/>
     <path d="M44 19 L34 21 M44 19 L42 29" stroke="url(#goldRim)" stroke-width="2.4" stroke-linecap="round"/>
     <circle cx="23" cy="40" r="4" fill="url(#goldRim)"/>`
  ),
  'Barriera Vitale': makeShieldSpell('violet',
    `<circle cx="32" cy="32" r="5" fill="#d2a6ff"/><circle cx="32" cy="32" r="9" fill="none" stroke="#d2a6ff" stroke-width="1.3"/>`
  ),
  'Specchio dell\'Anima': makeAttackSpell('ivory',
    `<polygon points="32,16 44,32 32,48 20,32" fill="rgba(255,255,255,0.18)" stroke="url(#goldRim)" stroke-width="2.2"/>
     <line x1="25" y1="27" x2="38" y2="36" stroke="#ffffff" stroke-width="2"/>`
  ),
  'Aura d\'Integrità': makeShieldSpell('ivory',
    `<path d="M32 22 L35 30 L43 32 L35 34 L32 42 L29 34 L21 32 L29 30 Z" fill="#fff9e6"/>`
  ),
  'Onda di Liberazione': makeAttackSpell('emerald',
    `<path d="M18 38 Q25 22 32 34 T46 26" fill="none" stroke="#80e5a8" stroke-width="2.6" stroke-linecap="round"/>
     <path d="M18 44 Q25 32 32 40 T46 34" fill="none" stroke="url(#goldRim)" stroke-width="1.8" stroke-linecap="round"/>`
  ),
  'Manto del Flusso': makeShieldSpell('emerald',
    `<path d="M24 33 Q28 26 32 33 T40 33" fill="none" stroke="#80e5a8" stroke-width="2.4" stroke-linecap="round"/>`
  ),
  'Sussurro di Pace': makeAttackSpell('crimson',
    `<path d="M32 17 C38 24 41 30 38 38 C36 42 32 46 32 46 C32 46 28 42 26 38 C23 30 26 24 32 17 Z" fill="#ff8a7a" stroke="url(#goldRim)" stroke-width="1.8"/>
     <circle cx="32" cy="34" r="3.5" fill="#fff3b0"/>`
  ),
  'Baluardo di Calma': makeShieldSpell('crimson',
    `<path d="M25 29 H39 M32 23 V41" stroke="#ff9c8a" stroke-width="2.6" stroke-linecap="round"/>`
  ),

  // Categoria 2: Utilità e Strategia
  'Passo Onirico': createSigilSvg(
    `<path d="M22 45 V29 A10 10 0 0 1 42 29 V45" fill="none" stroke="url(#goldRim)" stroke-width="2.4"/>
     <circle cx="32" cy="31" r="4.5" fill="#8fd3ff"/>
     <path d="M32 15 L34 21 L40 22 L34 23 L32 29 L30 23 L24 22 L30 21 Z" fill="#fff0ad" opacity="0.85"/>`,
    'azure', 64, 'hex'
  ),
  'Sesto Senso': createSigilSvg(
    `<path d="M16 32 C22 22 42 22 48 32 C42 42 22 42 16 32 Z" fill="none" stroke="url(#goldRim)" stroke-width="2.2"/>
     <circle cx="32" cy="32" r="5.5" fill="#f5d36b"/>
     <circle cx="32" cy="32" r="2.2" fill="#1a110d"/>`,
    'gold', 64, 'hex'
  ),
  'Percezione Acuita': createSigilSvg(
    `<circle cx="30" cy="30" r="10" fill="rgba(143,211,255,0.16)" stroke="url(#goldRim)" stroke-width="2.4"/>
     <line x1="37" y1="37" x2="47" y2="47" stroke="url(#goldRim)" stroke-width="3.2" stroke-linecap="round"/>
     <circle cx="30" cy="30" r="3" fill="#ffd670"/>`,
    'azure', 64, 'hex'
  ),
  'Sorgente di Volontà': createSigilSvg(
    `<path d="M32 16 C38 25 42 32 42 37 A10 10 0 0 1 22 37 C22 32 26 25 32 16 Z" fill="#e04f3e" stroke="url(#goldRim)" stroke-width="2"/>
     <path d="M32 29 V39 M27 34 H37" stroke="#fff3c4" stroke-width="2.2" stroke-linecap="round"/>`,
    'crimson', 64, 'hex'
  ),
  'Eco Ristoratore': createSigilSvg(
    `<circle cx="32" cy="32" r="5" fill="#80e5a8"/>
     <circle cx="32" cy="32" r="11" fill="none" stroke="url(#goldRim)" stroke-width="1.8"/>
     <circle cx="32" cy="32" r="16.5" fill="none" stroke="#80e5a8" stroke-width="1.4" stroke-dasharray="4 3"/>`,
    'emerald', 64, 'hex'
  ),
  'Pelle di Pietra': createSigilSvg(
    `<polygon points="32,15 44,23 41,44 32,49 23,44 20,23" fill="#5e6873" stroke="url(#goldRim)" stroke-width="2.2"/>
     <polyline points="20,23 32,31 44,23 M32,31 32,49" fill="none" stroke="#d5dde5" stroke-width="1.4"/>`,
    'slate', 64, 'shield'
  ),
  'Fascino del Sognatore': createSigilSvg(
    `<circle cx="32" cy="32" r="11" fill="#8a6213" stroke="url(#goldRim)" stroke-width="2.2"/>
     <path d="M32 24 V40 M27 28 H37 M27 36 H37" stroke="#ffefaa" stroke-width="2" stroke-linecap="round"/>`,
    'amber', 64, 'circle'
  ),
  'Evocazione Instabile': createSigilSvg(
    `<path d="M21 40 H43 L38 46 H26 Z" fill="url(#goldRim)"/>
     <path d="M23 40 C20 33 27 29 33 29 C40 29 44 34 41 40 Z" fill="#1e7d63" stroke="url(#goldRim)" stroke-width="1.8"/>
     <path d="M33 28 C33 22 27 22 30 16" fill="none" stroke="#80e5a8" stroke-width="2" stroke-linecap="round"/>`,
    'emerald', 64, 'hex'
  ),
  'Riflesso Inatteso': createSigilSvg(
    `<polygon points="24,19 31,32 24,45 17,32" fill="#8fd3ff" opacity="0.7" stroke="url(#goldRim)" stroke-width="1.8"/>
     <polygon points="40,19 47,32 40,45 33,32" fill="#ffd670" opacity="0.82" stroke="url(#goldRim)" stroke-width="1.8"/>`,
    'gold', 64, 'hex'
  ),
  'Letargia Improvvisa': createSigilSvg(
    `<path d="M25 22 H39 L25 42 H39" fill="none" stroke="#d2a6ff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
     <circle cx="43" cy="21" r="2.2" fill="url(#goldRim)"/>`,
    'violet', 64, 'hex'
  ),
  'Trasmutazione Volontaria': createSigilSvg(
    `<path d="M22 28 C22 21 31 20 32 26 C33 20 42 21 42 28 C42 35 32 42 32 42 C32 42 22 35 22 28 Z" fill="#c0392b" stroke="url(#goldRim)" stroke-width="1.8"/>
     <circle cx="41" cy="40" r="6" fill="#f0bd17" stroke="#2c190c" stroke-width="1.4"/>`,
    'crimson', 64, 'hex'
  ),
  'Intuito Mimetico': createSigilSvg(
    `<rect x="19" y="21" width="14" height="19" rx="3" fill="none" stroke="#d2a6ff" stroke-width="2"/>
     <rect x="31" y="24" width="14" height="19" rx="3" fill="rgba(240,189,23,0.18)" stroke="url(#goldRim)" stroke-width="2"/>`,
    'violet', 64, 'hex'
  ),
};

// ===============================================================================================
// --- CASELLE SPECIALI & CARTE ---
// ===============================================================================================

const rawMisfortuneSpecialSvg = createSigilSvg(
  `<polygon points="32,16 48,44 16,44" fill="#681814" stroke="url(#goldRim)" stroke-width="2.2" stroke-linejoin="round"/>
   <line x1="32" y1="25" x2="32" y2="35" stroke="#ffdf80" stroke-width="2.6" stroke-linecap="round"/>
   <circle cx="32" cy="40" r="1.8" fill="#ffdf80"/>`,
  'crimson', 64, 'hex'
);

const rawBlessingSpecialSvg = createSigilSvg(
  `<path d="M32 14 L36 27 L49 32 L36 37 L32 50 L28 37 L15 32 L28 27 Z" fill="url(#goldRim)" stroke="#fff6cf" stroke-width="1.4"/>
   <circle cx="32" cy="32" r="4.5" fill="#fffdf2"/>`,
  'gold', 64, 'hex'
);

const rawRandomEncounterSvg = createSigilSvg(
  `<path d="M25 25 A7 7 0 1 1 36 31 C33 33 32 35 32 38" fill="none" stroke="url(#goldRim)" stroke-width="3.2" stroke-linecap="round"/>
   <circle cx="32" cy="44" r="2.2" fill="#d2a6ff"/>`,
  'violet', 64, 'hex'
);

const rawBlessingCardImageSvg = createSigilSvg(
  `<circle cx="32" cy="32" r="12" fill="url(#goldRim)"/>
   <circle cx="32" cy="32" r="17" fill="none" stroke="#ffefaa" stroke-width="1.3" stroke-dasharray="3 3"/>
   <path d="M32 11 L34.5 23 L46 25.5 L34.5 28 L32 40 L29.5 28 L18 25.5 L29.5 23 Z" fill="#fff9e2" transform="translate(0 6.5)"/>`,
  'gold', 96, 'circle'
);

const rawMisfortuneCardImageSvg = createSigilSvg(
  `<path d="M22 22 L42 42 M42 22 L22 42" stroke="#ff8a7a" stroke-width="3.4" stroke-linecap="round"/>
   <polygon points="32,14 48,24 48,40 32,50 16,40 16,24" fill="none" stroke="url(#goldRim)" stroke-width="1.6"/>`,
  'crimson', 96, 'hex'
);

// ===============================================================================================
// --- OGGETTO ASSET PRECARICATI ---
// ===============================================================================================

export const preloadedAssets = {
  logos: {
    logoRectangle: svgToDataUri(rawLogoRectangleSvg),
    logoSquare: svgToDataUri(rawLogoSquareSvg),
    titleSmall: svgToDataUri(rawLogoTitleSmallSvg),
  },
  backgrounds: {
    gameBoard: svgToDataUri(rawGameBoardBackgroundSvg),
  },
  players: {
    determinato: rawPlayerPawnsDeterminato.map(svgToDataUri),
    intuitivo: rawPlayerPawnsIntuitivo.map(svgToDataUri),
    pacifico: rawPlayerPawnsPacifico.map(svgToDataUri),
  },
  avatars: {
    red: svgToDataUri(rawPlayerRedAvatarSvg),
    yellow: svgToDataUri(rawPlayerYellowAvatarSvg),
    white: svgToDataUri(rawPlayerWhiteAvatarSvg),
    black: svgToDataUri(rawPlayerBlackAvatarSvg),
  },
  enemies: {
    black: rawEnemyBlack.map(svgToDataUri),
    white: rawEnemyWhite.map(svgToDataUri),
    yellow: rawEnemyYellow.map(svgToDataUri),
    red: rawEnemyRed.map(svgToDataUri),
    miniBossRed: svgToDataUri(rawMiniBossRedSvg),
    miniBossYellow: svgToDataUri(rawMiniBossYellowSvg),
    miniBossWhite: svgToDataUri(rawMiniBossWhiteSvg),
    miniBossBlack: svgToDataUri(rawMiniBossBlackSvg),
    finalBoss: svgToDataUri(rawFinalBossSvg),
  },
  merchants: {
    defaults: rawMerchantPawns.map(svgToDataUri),
  },
  npcs: {
    defaults: rawNpcPawns.map(svgToDataUri),
  },
  items: {
    treasure: svgToDataUri(rawTreasureItemSvg),
    emptySlot: svgToDataUri(rawEmptySlotSvg),
    treasureChestClosed: svgToDataUri(rawTreasureChestClosedSvg),
    weaponOnMap: svgToDataUri(rawWeaponOnMapIconSvg),
    weapons: Object.fromEntries(Object.entries(rawWeaponIcons).map(([key, svg]) => [key, svgToDataUri(svg)])),
    questItems: Object.fromEntries(Object.entries(rawQuestItemIcons).map(([key, svg]) => [key, svgToDataUri(svg)])),
    consumables: {
      'Pozione di Cura Minore': svgToDataUri(rawPotionIcon),
      'Pergamena Palla di Fuoco': svgToDataUri(rawScrollIcon),
      'Zaino Piccolo': svgToDataUri(makeBagIcon(1)),
      'Borsa Media': svgToDataUri(makeBagIcon(2)),
      'Zaino Grande': svgToDataUri(makeBagIcon(3)),
      'Sacca da Viaggio': svgToDataUri(makeBagIcon(4)),
    },
    redKey: svgToDataUri(rawKeySvg('#c0392b', 'crimson')),
    yellowKey: svgToDataUri(rawKeySvg('#f1c40f', 'amber')),
    whiteKey: svgToDataUri(rawKeySvg('#ecf0f1', 'ivory')),
    blackKey: svgToDataUri(rawKeySvg('#2c3e50', 'slate')),
    gateLock: {
      red: svgToDataUri(rawGateLockSvg('#a8261d', 'crimson')),
      yellow: svgToDataUri(rawGateLockSvg('#b88b12', 'amber')),
      white: svgToDataUri(rawGateLockSvg('#a8b2bd', 'ivory')),
      black: svgToDataUri(rawGateLockSvg('#232b36', 'slate')),
    },
  },
  magicSpells: Object.fromEntries(Object.entries(rawMagicSpellIcons).map(([key, svg]) => [key, svgToDataUri(svg)])),
  diceFaces: {
    miss: svgToDataUri(rawMissDiceFaceSvg),
    hit: svgToDataUri(rawHitIconString),
    crit: svgToDataUri(rawCritIconString),
  },
  dialogueCrystal: {
    off: svgToDataUri(rawDialogueCrystalOff),
    on: svgToDataUri(rawDialogueCrystalOn),
    irritated: svgToDataUri(rawDialogueCrystalIrritated),
  },
  specials: {
    misfortune: svgToDataUri(rawMisfortuneSpecialSvg),
    blessing: svgToDataUri(rawBlessingSpecialSvg),
    randomEncounter: svgToDataUri(rawRandomEncounterSvg),
    cardImages: {
      blessing: svgToDataUri(rawBlessingCardImageSvg),
      misfortune: svgToDataUri(rawMisfortuneCardImageSvg),
    },
  },
};