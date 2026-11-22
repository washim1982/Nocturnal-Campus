import * as THREE from 'three';

export interface ProceduralTextureSet {
  corridorFloor: THREE.CanvasTexture;
  classroomFloor: THREE.CanvasTexture;
  labFloor: THREE.CanvasTexture;
  libraryCarpet: THREE.CanvasTexture;
  concreteWall: THREE.CanvasTexture;
  ceilingGrid: THREE.CanvasTexture;
  lockerFront: THREE.CanvasTexture;
  whiteboardLecture: THREE.CanvasTexture;
  whiteboardLab: THREE.CanvasTexture;
  periodicChart: THREE.CanvasTexture;
  exitSign: THREE.CanvasTexture;
  clockFace: THREE.CanvasTexture;
  bookSpines: THREE.CanvasTexture;
  asphaltNight: THREE.CanvasTexture;
  dustParticle: THREE.CanvasTexture;
  notePaper: THREE.CanvasTexture;
  barricadeWood: THREE.CanvasTexture;
  ventGrate: THREE.CanvasTexture;
  basementFloor: THREE.CanvasTexture;
  basementWall: THREE.CanvasTexture;
  hazardStripe: THREE.CanvasTexture;
  breakerPanelFace: THREE.CanvasTexture;
  crateWood: THREE.CanvasTexture;
  cardboardBox: THREE.CanvasTexture;
  chainLink: THREE.CanvasTexture;
  gymFloor: THREE.CanvasTexture;
  cafeteriaTile: THREE.CanvasTexture;
  carpetTheater: THREE.CanvasTexture;
  chalkboardDark: THREE.CanvasTexture;
  curseSigil: THREE.CanvasTexture;
  entranceBanner: THREE.CanvasTexture;
  createRoomPlaque: (code: string, subtitle: string) => THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const allTextures: THREE.Texture[] = [];
  const track = <T extends THREE.Texture>(t: T): T => {
    allTextures.push(t);
    return t;
  };

  // 1. Modern pale terrazzo / linoleum corridor tile
  const corridorFloor = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#8b939c';
    ctx.fillRect(0, 0, 512, 512);

    const tile = 128;
    for (let y = 0; y < 512; y += tile) {
      for (let x = 0; x < 512; x += tile) {
        const shade = ((x / tile + y / tile) % 2 === 0 ? 4 : -4) + (Math.random() - 0.5) * 4;
        const v = Math.round(136 + shade);
        ctx.fillStyle = `rgb(${v - 4}, ${v}, ${v + 5})`;
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      }
    }
    // Mineral flecks
    for (let i = 0; i < 1600; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const r = 0.8 + Math.random() * 1.8;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(220,228,235,0.28)' : 'rgba(55,62,72,0.28)';
      ctx.fillRect(rx, ry, r, r);
    }
    // Subtle dark scuff streaks
    ctx.strokeStyle = 'rgba(28, 33, 40, 0.16)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const sx = Math.random() * 480;
      const sy = Math.random() * 480;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + 18, sy + (Math.random() - 0.5) * 14, sx + 36, sy + (Math.random() - 0.5) * 18);
      ctx.stroke();
    }
    // Grout lines
    ctx.strokeStyle = 'rgba(42, 48, 56, 0.55)';
    ctx.lineWidth = 3;
    for (let p = 0; p <= 512; p += tile) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(512, p);
      ctx.stroke();
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 12, 2.5));
  })();

  // 2. Classroom muted cool-gray VCT flooring
  const classroomFloor = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#5c646f';
    ctx.fillRect(0, 0, 512, 512);
    const tile = 128;
    for (let y = 0; y < 512; y += tile) {
      for (let x = 0; x < 512; x += tile) {
        const delta = ((x / tile + y / tile) % 2 === 0 ? 5 : -5) + (Math.random() - 0.5) * 5;
        const base = Math.round(92 + delta);
        ctx.fillStyle = `rgb(${base - 3}, ${base}, ${base + 6})`;
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      }
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(200,210,220,0.14)' : 'rgba(30,35,42,0.18)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    ctx.strokeStyle = 'rgba(28, 32, 38, 0.55)';
    ctx.lineWidth = 2;
    for (let p = 0; p <= 512; p += tile) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(512, p);
      ctx.stroke();
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 4, 4));
  })();

  // 3. Science Lab dark epoxy grid floor
  const labFloor = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#333b45';
    ctx.fillRect(0, 0, 512, 512);
    const tile = 64;
    for (let y = 0; y < 512; y += tile) {
      for (let x = 0; x < 512; x += tile) {
        const v = Math.round(52 + (Math.random() - 0.5) * 6);
        ctx.fillStyle = `rgb(${v - 2}, ${v + 2}, ${v + 8})`;
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      }
    }
    ctx.strokeStyle = 'rgba(18, 22, 28, 0.65)';
    ctx.lineWidth = 2;
    for (let p = 0; p <= 512; p += tile) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(512, p);
      ctx.stroke();
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 6, 4));
  })();

  // 4. Library dark architectural carpet tiles
  const libraryCarpet = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#252c38';
    ctx.fillRect(0, 0, 512, 512);
    const tile = 128;
    for (let y = 0; y < 512; y += tile) {
      for (let x = 0; x < 512; x += tile) {
        const odd = (x / tile + y / tile) % 2 === 1;
        ctx.fillStyle = odd ? '#29313f' : '#232a36';
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
        // Subtle weave lines
        ctx.strokeStyle = odd ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        for (let k = 0; k < tile; k += 6) {
          ctx.beginPath();
          if (odd) {
            ctx.moveTo(x + k, y);
            ctx.lineTo(x + k, y + tile);
          } else {
            ctx.moveTo(x, y + k);
            ctx.lineTo(x + tile, y + k);
          }
          ctx.stroke();
        }
      }
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 6, 4));
  })();

  // 5. Modern poured architectural concrete / sterile institutional wall
  const concreteWall = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#9ba3ad');
    grad.addColorStop(0.75, '#9199a3');
    grad.addColorStop(1, '#7a828c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle concrete mottling
    for (let i = 0; i < 2400; i++) {
      const a = 0.025 + Math.random() * 0.04;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(235,242,250,${a})` : `rgba(30,36,44,${a})`;
      const s = 2 + Math.random() * 8;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
    }

    // Architectural panel seams & tie holes
    ctx.strokeStyle = 'rgba(42, 48, 58, 0.25)';
    ctx.lineWidth = 2;
    for (const sx of [128, 384]) {
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, 512);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();

    ctx.fillStyle = 'rgba(35, 40, 48, 0.35)';
    for (const sx of [64, 192, 320, 448]) {
      for (const sy of [128, 384]) {
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 2, 1));
  })();

  // 6. Acoustic drop ceiling grid
  const ceilingGrid = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#aeb6bf';
    ctx.fillRect(0, 0, 512, 512);
    const cell = 128;
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(60,65,75,0.16)' : 'rgba(230,235,240,0.12)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }
    ctx.strokeStyle = '#6f7782';
    ctx.lineWidth = 4;
    for (let p = 0; p <= 512; p += cell) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(512, p);
      ctx.stroke();
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 10, 4));
  })();

  // 7. Modern brushed steel locker doors (4 doors across)
  const lockerFront = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#5c6673';
    ctx.fillRect(0, 0, 512, 512);

    const doors = 4;
    const w = 512 / doors;
    for (let d = 0; d < doors; d++) {
      const x = d * w;
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#4f5864');
      g.addColorStop(0.5, '#687382');
      g.addColorStop(1, '#4b535f');
      ctx.fillStyle = g;
      ctx.fillRect(x + 4, 12, w - 8, 488);

      // Door border
      ctx.strokeStyle = '#2a3038';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 4, 12, w - 8, 488);

      // Top & bottom louver vents
      ctx.fillStyle = '#1e232a';
      for (let v = 0; v < 5; v++) {
        ctx.fillRect(x + 22, 46 + v * 11, w - 44, 5);
        ctx.fillRect(x + 22, 412 + v * 11, w - 44, 5);
      }

      // Recessed latch handle
      ctx.fillStyle = '#252b34';
      ctx.fillRect(x + w - 28, 224, 14, 56);
      ctx.fillStyle = '#9aa5b4';
      ctx.fillRect(x + w - 24, 232, 6, 20);

      // Small number plate
      ctx.fillStyle = '#1f242c';
      ctx.fillRect(x + w / 2 - 16, 130, 32, 16);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(101 + d), x + w / 2, 142);
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 8. Lecture whiteboard with faint erased math
  const whiteboardLecture = (() => {
    const [c, ctx] = makeCanvas(512, 256);
    ctx.fillStyle = '#dfe5ec';
    ctx.fillRect(0, 0, 512, 256);

    // Subtle dry-erase smudge clouds
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = 'rgba(130, 145, 165, 0.14)';
      ctx.beginPath();
      ctx.ellipse(
        60 + Math.random() * 390,
        40 + Math.random() * 170,
        24 + Math.random() * 45,
        10 + Math.random() * 18,
        Math.random() * 0.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(42, 54, 72, 0.52)';
    ctx.font = '600 18px sans-serif';
    ctx.fillText('f(x) = lim  (1 + x/n)^n', 38, 66);
    ctx.font = '15px monospace';
    ctx.fillText('n -> inf', 78, 86);
    ctx.fillStyle = 'rgba(145, 45, 45, 0.45)';
    ctx.fillText('CHAPTER 7  ·  DO NOT ERASE', 38, 210);

    // Drawn axis diagram
    ctx.strokeStyle = 'rgba(45, 68, 95, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(310, 170);
    ctx.lineTo(460, 170);
    ctx.moveTo(340, 50);
    ctx.lineTo(340, 195);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(318, 162);
    ctx.bezierCurveTo(360, 155, 395, 95, 452, 62);
    ctx.stroke();

    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 9. Science lab whiteboard
  const whiteboardLab = (() => {
    const [c, ctx] = makeCanvas(512, 256);
    ctx.fillStyle = '#d7e0e8';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = 'rgba(30, 58, 84, 0.55)';
    ctx.font = '600 18px sans-serif';
    ctx.fillText('TITRATION LAB  —  SOLUTIONS LOCKED', 28, 52);
    ctx.font = '14px monospace';
    ctx.fillText('2 H2O2 (aq)  ->  2 H2O (l) + O2 (g)', 28, 98);
    ctx.fillText('pH = -log10[H3O+]   |   293.15 K', 28, 130);
    ctx.fillStyle = 'rgba(165, 38, 38, 0.52)';
    ctx.fillText('GAS VALVES SHUT OFF AT 18:00', 28, 196);
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 10. Periodic table wall chart
  const periodicChart = (() => {
    const [c, ctx] = makeCanvas(512, 256);
    ctx.fillStyle = '#18202c';
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 15px sans-serif';
    ctx.fillText('PERIODIC TABLE OF ELEMENTS', 26, 36);

    const cols = 18;
    const rows = 7;
    const cellW = 24;
    const cellH = 22;
    const startX = 28;
    const startY = 56;
    const palette = ['#3b82f6', '#0ea5e9', '#14b8a6', '#64748b', '#8b5cf6', '#f59e0b'];
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        if (r === 0 && col > 0 && col < 17) continue;
        if ((r === 1 || r === 2) && col > 1 && col < 12) continue;
        ctx.fillStyle = palette[(col + r) % palette.length];
        ctx.globalAlpha = 0.72;
        ctx.fillRect(startX + col * (cellW + 1), startY + r * (cellH + 2), cellW, cellH);
      }
    }
    ctx.globalAlpha = 1;
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 11. Glowing crimson EXIT sign
  const exitSign = (() => {
    const [c, ctx] = makeCanvas(256, 128);
    ctx.fillStyle = '#1a0608';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 244, 116);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', 128, 66);
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 12. Analog clock frozen at 02:47
  const clockFace = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8;
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.save();
      ctx.translate(128, 128);
      ctx.rotate(a);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-3, -108, 6, i % 3 === 0 ? 18 : 10);
      ctx.restore();
    }

    // Hour hand (near 2:47)
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate(((2 + 47 / 60) / 12) * Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, -64, 8, 72);
    ctx.restore();

    // Minute hand (at 47 min)
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate((47 / 60) * Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2.5, -92, 5, 100);
    ctx.restore();

    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(128, 128, 6, 0, Math.PI * 2);
    ctx.fill();

    const tex = track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  })();

  // 13. Library book spines row
  const bookSpines = (() => {
    const [c, ctx] = makeCanvas(512, 256);
    ctx.fillStyle = '#12161f';
    ctx.fillRect(0, 0, 512, 256);
    const spineColors = [
      '#334155', '#475569', '#1e3a5f', '#3f2e2e', '#2d4739',
      '#4a3f55', '#524632', '#263238', '#3c4856', '#5b3a29',
    ];
    let x = 2;
    while (x < 508) {
      const w = 10 + Math.floor(Math.random() * 14);
      const h = 178 + Math.floor(Math.random() * 68);
      const color = spineColors[Math.floor(Math.random() * spineColors.length)];
      ctx.fillStyle = color;
      ctx.fillRect(x, 256 - h, w - 1, h);
      // Spine highlight & label band
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 1, 256 - h, 2, h);
      if (Math.random() > 0.35) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.32)';
        ctx.fillRect(x + 2, 256 - h + 26, w - 5, 10);
      }
      x += w;
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 14. Exterior wet dark asphalt
  const asphaltNight = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) {
      const v = 10 + Math.floor(Math.random() * 18);
      ctx.fillStyle = `rgb(${v}, ${v + 2}, ${v + 6})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 16, 16));
  })();

  // 15. Soft radial dust particle sprite
  const dustParticle = (() => {
    const [c, ctx] = makeCanvas(64, 64);
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(220, 232, 255, 0.95)');
    grad.addColorStop(0.4, 'rgba(180, 200, 235, 0.4)');
    grad.addColorStop(1, 'rgba(180, 200, 235, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = track(finalizeColorTexture(c, 1, 1, 1));
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  })();

  const createRoomPlaque = (code: string, subtitle: string): THREE.CanvasTexture => {
    const [c, ctx] = makeCanvas(256, 128);
    ctx.fillStyle = '#141922';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(code, 22, 62);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 18px sans-serif';
    ctx.fillText(subtitle, 22, 98);
    const tex = track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  };

  // 16. Abandoned lined notebook paper texture
  const notePaper = (() => {
    const [c, ctx] = makeCanvas(256, 320);
    ctx.fillStyle = '#e8e2d2';
    ctx.fillRect(0, 0, 256, 320);

    // Subtle paper grain
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(90,82,70,0.08)';
      ctx.fillRect(Math.random() * 256, Math.random() * 320, 2, 2);
    }

    // Blue horizontal ruled lines
    ctx.strokeStyle = 'rgba(71, 118, 178, 0.38)';
    ctx.lineWidth = 1;
    for (let y = 44; y < 305; y += 16) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(246, y);
      ctx.stroke();
    }

    // Vertical red margin line
    ctx.strokeStyle = 'rgba(185, 58, 58, 0.42)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 8);
    ctx.lineTo(40, 312);
    ctx.stroke();

    // Cryptic scribbled ink lines
    ctx.strokeStyle = 'rgba(22, 28, 38, 0.72)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 9; row++) {
      const y = 54 + row * 16;
      const lineLen = row === 4 ? 95 : 130 + ((row * 37) % 55);
      ctx.beginPath();
      ctx.moveTo(48, y);
      for (let x = 56; x < 48 + lineLen; x += 9) {
        ctx.lineTo(x, y + (Math.sin(x * 0.4 + row) * 2.2));
      }
      ctx.stroke();
    }

    const tex = track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  })();

  // 17. Rough weathered timber barricade planks
  const barricadeWood = (() => {
    const [c, ctx] = makeCanvas(256, 128);
    ctx.fillStyle = '#473626';
    ctx.fillRect(0, 0, 256, 128);
    for (let y = 0; y < 128; y += 3) {
      const shade = Math.floor((Math.random() - 0.5) * 18);
      ctx.fillStyle = `rgb(${71 + shade}, ${54 + shade}, ${38 + shade})`;
      ctx.fillRect(0, y, 256, 2);
    }
    // Wood grain streaks & knots
    ctx.strokeStyle = 'rgba(24, 16, 10, 0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const sy = Math.random() * 128;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.bezierCurveTo(80, sy + (Math.random() - 0.5) * 12, 170, sy + (Math.random() - 0.5) * 12, 256, sy);
      ctx.stroke();
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 18. Brushed metal HVAC vent louver grate
  const ventGrate = (() => {
    const [c, ctx] = makeCanvas(256, 160);
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, 256, 160);

    // Outer metallic flange
    ctx.strokeStyle = '#647080';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 242, 146);

    // Horizontal louver blades with highlight & deep shadow slot
    for (let y = 22; y < 138; y += 12) {
      ctx.fillStyle = '#05070a';
      ctx.fillRect(20, y, 216, 6);
      ctx.fillStyle = '#738091';
      ctx.fillRect(20, y + 6, 216, 4);
      ctx.fillStyle = '#9aa5b4';
      ctx.fillRect(20, y + 9, 216, 1.5);
    }

    // Corner mounting screws
    ctx.fillStyle = '#334155';
    for (const [sx, sy] of [
      [10, 10],
      [246, 10],
      [10, 150],
      [246, 150],
    ]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  })();

  // 19. Damp stained basement poured concrete floor
  const basementFloor = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#242930';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 3200; i++) {
      const a = 0.04 + Math.random() * 0.08;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(85,94,108,${a})` : `rgba(10,12,16,${a})`;
      const s = 2 + Math.random() * 10;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
    }

    // Dark moisture puddles & hairline expansion cracks
    for (let i = 0; i < 6; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const g = ctx.createRadialGradient(px, py, 6, px, py, 55 + Math.random() * 45);
      g.addColorStop(0, 'rgba(8, 11, 15, 0.45)');
      g.addColorStop(1, 'rgba(8, 11, 15, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
    }

    ctx.strokeStyle = 'rgba(12, 15, 20, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();

    return track(finalizeColorTexture(c, maxAnisotropy, 8, 5));
  })();

  // 20. Raw damp subterranean concrete foundation wall
  const basementWall = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#454c56');
    grad.addColorStop(0.7, '#3b414a');
    grad.addColorStop(1, '#262b32');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 2400; i++) {
      const a = 0.03 + Math.random() * 0.06;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(140,150,165,${a})` : `rgba(14,17,22,${a})`;
      const s = 2 + Math.random() * 8;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, s, s);
    }

    // Vertical water seepage streaks
    for (let i = 0; i < 14; i++) {
      const sx = Math.random() * 512;
      const sg = ctx.createLinearGradient(sx, 0, sx, 420);
      sg.addColorStop(0, 'rgba(14, 18, 22, 0.28)');
      sg.addColorStop(1, 'rgba(14, 18, 22, 0)');
      ctx.fillStyle = sg;
      ctx.fillRect(sx, 0, 6 + Math.random() * 14, 420);
    }

    ctx.strokeStyle = 'rgba(20, 24, 30, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 508, 254);
    ctx.strokeRect(2, 256, 508, 254);

    return track(finalizeColorTexture(c, maxAnisotropy, 2, 1));
  })();

  // 21. Diagonal industrial yellow/black hazard warning strip
  const hazardStripe = (() => {
    const [c, ctx] = makeCanvas(256, 64);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#111827';
    for (let x = -64; x < 320; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 24, 64);
      ctx.lineTo(x + 56, 0);
      ctx.lineTo(x + 32, 0);
      ctx.closePath();
      ctx.fill();
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 3, 1));
  })();

  // 22. Electrical switchgear / breaker cabinet face
  const breakerPanelFace = (() => {
    const [c, ctx] = makeCanvas(256, 512);
    ctx.fillStyle = '#252c36';
    ctx.fillRect(0, 0, 256, 512);
    ctx.strokeStyle = '#11161d';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 496);

    // Top analog meter dials
    for (const mx of [78, 178]) {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(mx, 78, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(mx, 78);
      ctx.lineTo(mx - 14, 64);
      ctx.stroke();
    }

    // Danger placard
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(42, 134, 172, 34);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIGH VOLTAGE · #202', 128, 156);

    // Breaker switch matrix
    for (let row = 0; row < 8; row++) {
      const y = 196 + row * 28;
      ctx.fillStyle = '#141920';
      ctx.fillRect(36, y, 82, 18);
      ctx.fillRect(138, y, 82, 18);
      ctx.fillStyle = row === 2 ? '#b91c1c' : '#475569';
      ctx.fillRect(44, y + 4, 20, 10);
      ctx.fillRect(188, y + 4, 20, 10);
    }

    // Bottom louver vents
    ctx.fillStyle = '#0f1318';
    for (let v = 0; v < 4; v++) {
      ctx.fillRect(44, 434 + v * 12, 168, 6);
    }

    const tex = track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  })();

  // 23. Stenciled wooden shipping crate
  const crateWood = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#574431';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      ctx.fillStyle = `rgb(${84 + (y % 64) / 8}, ${66 + (y % 64) / 8}, ${48})`;
      ctx.fillRect(0, y, 256, 30);
      ctx.fillStyle = 'rgba(18, 12, 8, 0.55)';
      ctx.fillRect(0, y + 30, 256, 2);
    }
    // Outer frame battens
    ctx.strokeStyle = '#3d2f21';
    ctx.lineWidth = 22;
    ctx.strokeRect(11, 11, 234, 234);
    ctx.fillStyle = 'rgba(20, 16, 12, 0.45)';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('B1 ARCHIVE', 52, 134);
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 24. Dusty cardboard banker box
  const cardboardBox = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#7c6b53';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#6b5b45';
    ctx.fillRect(0, 0, 256, 46);
    ctx.strokeStyle = 'rgba(25, 20, 14, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 46, 244, 204);
    // White archive label
    ctx.fillStyle = '#d6d0c4';
    ctx.fillRect(68, 92, 120, 44);
    ctx.fillStyle = '#334155';
    ctx.fillRect(82, 108, 92, 4);
    ctx.fillRect(82, 120, 68, 4);
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 25. Industrial chain-link fence wire mesh (alpha-cutout)
  const chainLink = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = '#7b8694';
    ctx.lineWidth = 4;
    const step = 32;
    for (let x = -128; x <= 256; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 128, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 128, 0);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 4, 3));
  })();

  // 26. Gymnasium varnished maple hardwood strips with court lines
  const gymFloor = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#6e5235';
    ctx.fillRect(0, 0, 512, 512);
    const stripH = 16;
    for (let y = 0; y < 512; y += stripH) {
      let x = 0;
      while (x < 512) {
        const w = 64 + Math.floor(Math.random() * 96);
        const shade = Math.floor((Math.random() - 0.5) * 18);
        ctx.fillStyle = `rgb(${112 + shade}, ${82 + shade}, ${52 + shade})`;
        ctx.fillRect(x, y, w - 1, stripH - 1);
        x += w;
      }
    }
    // Painted court boundary lines
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, 476, 476);
    ctx.beginPath();
    ctx.arc(256, 256, 84, 0, Math.PI * 2);
    ctx.stroke();
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 27. Institutional checkered cafeteria tile
  const cafeteriaTile = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    const tile = 64;
    for (let y = 0; y < 512; y += tile) {
      for (let x = 0; x < 512; x += tile) {
        const odd = (x / tile + y / tile) % 2 === 1;
        ctx.fillStyle = odd ? '#4b5563' : '#7b8594';
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      }
    }
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = 'rgba(15, 18, 24, 0.12)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 4, 4));
  })();

  // 28. Auditorium deep burgundy / slate woven carpet
  const carpetTheater = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.fillStyle = '#2d161d';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(95, 36, 52, 0.22)' : 'rgba(12, 6, 9, 0.35)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    return track(finalizeColorTexture(c, maxAnisotropy, 5, 4));
  })();

  // 29. Dark slate lecture chalkboard with dusty erased marks
  const chalkboardDark = (() => {
    const [c, ctx] = makeCanvas(512, 256);
    ctx.fillStyle = '#1b2621';
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = 'rgba(200, 215, 210, 0.05)';
      ctx.beginPath();
      ctx.ellipse(
        60 + Math.random() * 390,
        40 + Math.random() * 170,
        30 + Math.random() * 50,
        12 + Math.random() * 20,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
    ctx.font = '16px monospace';
    ctx.fillText('LECTURE NOTES — SECTION IV', 36, 58);
    ctx.fillText('ATTENDANCE:  0 / 32', 36, 92);
    return track(finalizeColorTexture(c, maxAnisotropy, 1, 1));
  })();

  // 30. Occult Curse Ward Sigil (transparent high-detail crimson rune circle)
  const curseSigil = (() => {
    const [c, ctx] = makeCanvas(512, 512);
    ctx.clearRect(0, 0, 512, 512);
    const cx = 256;
    const cy = 256;

    // Subtle radial crimson-ember aura
    const grad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 244);
    grad.addColorStop(0, 'rgba(220, 38, 38, 0.34)');
    grad.addColorStop(0.58, 'rgba(153, 27, 27, 0.16)');
    grad.addColorStop(0.86, 'rgba(127, 29, 29, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(248, 113, 113, 0.92)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 224, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(220, 38, 38, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 204, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 146, 0, Math.PI * 2);
    ctx.stroke();

    // Archaic ward tick marks & angular glyphs between outer rings
    ctx.strokeStyle = 'rgba(252, 165, 165, 0.88)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r0 = i % 3 === 0 ? 196 : 205;
      const r1 = 223;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
      if (i % 3 === 0) {
        const ax = cx + Math.cos(a + 0.08) * 174;
        const ay = cy + Math.sin(a + 0.08) * 174;
        ctx.beginPath();
        ctx.moveTo(ax - 7, ay - 7);
        ctx.lineTo(ax + 7, ay + 5);
        ctx.moveTo(ax + 5, ay - 8);
        ctx.lineTo(ax - 4, ay + 8);
        ctx.stroke();
      }
    }

    // Interlocking binding triangles (3-seal geometry)
    const drawTriangle = (radius: number, rot: number, width: number, stroke: string) => {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = rot + (k * Math.PI * 2) / 3;
        const px = cx + Math.cos(a) * radius;
        const py = cy + Math.sin(a) * radius;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    };
    drawTriangle(196, -Math.PI / 2, 3.5, 'rgba(248, 113, 113, 0.92)');
    drawTriangle(146, Math.PI / 2, 2.5, 'rgba(251, 146, 60, 0.72)');

    // Central locked eye / keyhole sigil
    ctx.strokeStyle = 'rgba(254, 202, 202, 0.95)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 62, 34, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 2);
    ctx.lineTo(cx + 10, cy + 2);
    ctx.lineTo(cx + 15, cy + 32);
    ctx.lineTo(cx - 15, cy + 32);
    ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return track(tex);
  })();

  // 31. Main Entrance Architectural Banner Plaque
  const entranceBanner = (() => {
    const [c, ctx] = makeCanvas(1024, 192);
    ctx.fillStyle = '#12161e';
    ctx.fillRect(0, 0, 1024, 192);

    ctx.strokeStyle = '#9a7b4f';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, 996, 164);
    ctx.strokeStyle = 'rgba(154, 123, 79, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 976, 144);

    ctx.fillStyle = '#d6c5a3';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BLACKWOOD HIGH SCHOOL', 512, 78);

    ctx.fillStyle = '#9aa4b2';
    ctx.font = '600 24px monospace';
    ctx.fillText('MAIN ENTRANCE  ·  EST. 1964', 512, 134);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return track(tex);
  })();

  return {
    corridorFloor,
    classroomFloor,
    labFloor,
    libraryCarpet,
    concreteWall,
    ceilingGrid,
    lockerFront,
    whiteboardLecture,
    whiteboardLab,
    periodicChart,
    exitSign,
    clockFace,
    bookSpines,
    asphaltNight,
    dustParticle,
    notePaper,
    barricadeWood,
    ventGrate,
    basementFloor,
    basementWall,
    hazardStripe,
    breakerPanelFace,
    crateWood,
    cardboardBox,
    chainLink,
    gymFloor,
    cafeteriaTile,
    carpetTheater,
    chalkboardDark,
    curseSigil,
    entranceBanner,
    createRoomPlaque,
    dispose: () => {
      allTextures.forEach((t) => t.dispose());
    },
  };
}
