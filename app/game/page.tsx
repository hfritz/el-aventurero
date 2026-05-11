"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function GameInstance({ level, router }: { level: number; router: ReturnType<typeof useRouter> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<{ stop: () => void } | null>(null);
  const gameRef = useRef<{ destroy: (b: boolean) => void } | null>(null);
  const keysHeld = useRef<Set<string>>(new Set());
  const keysJustPressed = useRef<Set<string>>(new Set());
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [endScreen, setEndScreen] = useState<{ type: 'gameover' | 'complete'; nextLevel: number | null } | null>(null);
  const restartRef = useRef<() => void>(() => {});

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const gameCodes = new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyD']);
    const onDown = (e: KeyboardEvent) => {
      if (gameCodes.has(e.code)) e.preventDefault();
      if (!e.repeat) keysJustPressed.current.add(e.code);
      keysHeld.current.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => { keysHeld.current.delete(e.code); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    import("phaser").then((PhaserModule) => {
      const Phaser = PhaserModule.default;
      if (!containerRef.current) return;
      if (gameRef.current) return; // guard: React StrictMode double-invokes effects; only create one game

      // ─── TEXTURES ────────────────────────────────────────────────────
      const createCharTexture = (scene: Phaser.Scene) => {
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0xf59e0b); g.fillRect(10, 16, 12, 14);
        g.fillStyle(0xfbbf24); g.fillCircle(16, 12, 8);
        g.fillStyle(0x000000); g.fillCircle(13, 11, 2); g.fillCircle(19, 11, 2);
        g.fillStyle(0x92400e); g.fillEllipse(16, 5, 22, 5);
        g.fillStyle(0xa16207); g.fillRect(12, 1, 8, 5);
        g.fillStyle(0x1e40af); g.fillRect(10, 29, 5, 8); g.fillRect(17, 29, 5, 8);
        g.generateTexture("hero", 32, 38);
        g.destroy();
      };

      const createEnemyTexture = (scene: Phaser.Scene, key: string, color: number) => {
        const g = scene.make.graphics({ x: 0, y: 0 });
        if (key === 'condor') {
          // Condor — wings spread, white ruff collar
          g.fillStyle(color, 0.75); g.fillRect(0, 14, 10, 5); g.fillRect(22, 14, 10, 5);
          g.fillStyle(color); g.fillEllipse(16, 20, 18, 13);
          g.fillStyle(0xffffff, 0.9); g.fillEllipse(16, 14, 11, 5);
          g.fillStyle(color); g.fillCircle(16, 9, 6);
          g.fillStyle(0xffffff); g.fillCircle(13, 8, 2); g.fillCircle(19, 8, 2);
          g.fillStyle(0x000000); g.fillCircle(13, 8, 1); g.fillCircle(19, 8, 1);
          g.fillStyle(0xd97706); g.fillTriangle(13, 11, 19, 11, 16, 15);
          g.generateTexture(key, 32, 32);
        } else if (key === 'jaguar') {
          // Jaguar — spots, amber eyes, fangs
          g.fillStyle(color); g.fillEllipse(16, 18, 28, 22);
          g.fillStyle(0x7c2d00, 0.65);
          g.fillCircle(9, 16, 3); g.fillCircle(23, 16, 3); g.fillCircle(16, 22, 3);
          g.fillStyle(0xfbbf24); g.fillCircle(10, 10, 4); g.fillCircle(22, 10, 4);
          g.fillStyle(0x000000); g.fillCircle(11, 10, 2); g.fillCircle(23, 10, 2);
          g.fillStyle(0xffffff); g.fillRect(12, 23, 2, 4); g.fillRect(18, 23, 2, 4);
          g.generateTexture(key, 32, 32);
        } else if (key === 'marimonda') {
          // Marimonda — pink elephant ears, round yellow face, blue eyes, T-pose arms
          // Pink ears (behind head — drawn first)
          g.fillStyle(0xec4899);
          g.fillEllipse(8, 15, 22, 26);   // left ear
          g.fillEllipse(40, 15, 22, 26);  // right ear
          g.fillStyle(0xf9a8d4);
          g.fillEllipse(8, 15, 12, 16);   // inner left ear
          g.fillEllipse(40, 15, 12, 16);  // inner right ear
          // Yellow round head
          g.fillStyle(0xfbbf24); g.fillCircle(24, 15, 13);
          // Blue goggle eyes
          g.fillStyle(0xffffff); g.fillCircle(18, 12, 5); g.fillCircle(30, 12, 5);
          g.fillStyle(0x2563eb); g.fillCircle(18, 12, 3.5); g.fillCircle(30, 12, 3.5);
          g.fillStyle(0x000000); g.fillCircle(18, 12, 1.5); g.fillCircle(30, 12, 1.5);
          g.fillStyle(0xffffff); g.fillCircle(17, 10.5, 1); g.fillCircle(29, 10.5, 1); // shine
          // Blue shirt — T-pose arm bar + lower torso
          g.fillStyle(0x60a5fa);
          g.fillRect(0, 29, 48, 8);    // arms full width
          g.fillRect(10, 37, 28, 9);   // lower torso
          // Dark purple vest over body center
          g.fillStyle(0x4c1d95);
          g.fillRect(16, 29, 16, 17);
          // Orange trunk (drawn after vest so it overlaps)
          g.fillStyle(0xf97316);
          g.fillEllipse(24, 23, 9, 7); // nose bridge
          g.fillRect(20, 26, 8, 8);    // trunk shaft
          g.fillEllipse(24, 36, 13, 6); // trunk tip curl
          // Green tie
          g.fillStyle(0x16a34a); g.fillTriangle(24, 31, 21, 42, 27, 42);
          // Yellow hands at arm tips
          g.fillStyle(0xfbbf24); g.fillCircle(4, 33, 4); g.fillCircle(44, 33, 4);
          // Red baggy pants
          g.fillStyle(0xdc2626);
          g.fillRect(13, 44, 9, 10); g.fillRect(26, 44, 9, 10);
          g.generateTexture(key, 48, 54);
        } else if (key === 'torito') {
          // Torito de Carnaval — person in all-red costume with decorative bull head mask + streamers
          // Wide black curved horns (sweep outward — most iconic silhouette feature)
          g.fillStyle(0x111111);
          g.fillTriangle(14, 10, 1, 1, 16, 5);   // left horn outer sweep
          g.fillTriangle(1, 1, 4, 8, 14, 8);      // left horn body
          g.fillTriangle(26, 10, 39, 1, 24, 5);   // right horn outer sweep
          g.fillTriangle(39, 1, 36, 8, 26, 8);    // right horn body
          // Bull mask — red face with golden diamond pattern
          g.fillStyle(0xdc2626); g.fillEllipse(20, 14, 22, 18);
          g.fillStyle(0xfbbf24);
          g.fillRect(18, 7, 4, 5);    // top diamond point
          g.fillRect(13, 11, 5, 5);   // left diamond point
          g.fillRect(22, 11, 5, 5);   // right diamond point
          g.fillRect(18, 18, 4, 4);   // bottom diamond point
          // Eyes (white with dark pupils)
          g.fillStyle(0xffffff); g.fillCircle(15, 12, 3.5); g.fillCircle(25, 12, 3.5);
          g.fillStyle(0x111111); g.fillCircle(15, 12, 2); g.fillCircle(25, 12, 2);
          // Nostrils
          g.fillStyle(0x7f1d1d); g.fillCircle(16, 20, 2.5); g.fillCircle(24, 20, 2.5);
          // Red costume body + arms (drawn before streamers so streamers appear on top)
          g.fillStyle(0xdc2626);
          g.fillRect(12, 24, 16, 14);   // torso
          g.fillRect(4, 25, 9, 6);      // left arm
          g.fillRect(27, 25, 9, 6);     // right arm
          g.fillRect(13, 36, 6, 10);    // left leg
          g.fillRect(21, 36, 6, 10);    // right leg
          // Colorful streamers hanging from mask (drawn last — in front of costume)
          g.fillStyle(0xfbbf24); g.fillRect(9,  22, 3, 13);
          g.fillStyle(0x22c55e); g.fillRect(13, 22, 3, 15);
          g.fillStyle(0x3b82f6); g.fillRect(17, 22, 3, 11);
          g.fillStyle(0xef4444); g.fillRect(21, 22, 3, 14);
          g.fillStyle(0xec4899); g.fillRect(25, 22, 3, 10);
          g.fillStyle(0xfde68a); g.fillRect(29, 22, 3, 13);
          g.generateTexture(key, 40, 46);
        } else if (key === 'harpy_eagle') {
          // Harpy Eagle — Venezuela's national bird; dark wings, white chest, grey crested head
          g.fillStyle(color);                                            // dark body/wings
          g.fillRect(0, 14, 10, 4); g.fillRect(22, 14, 10, 4);         // wings
          g.fillEllipse(16, 20, 16, 12);                                 // upper body
          g.fillStyle(0xffffff); g.fillEllipse(16, 25, 10, 7);          // white belly
          g.fillStyle(0x111111); g.fillRect(10, 18, 12, 3);             // black chest band
          g.fillStyle(0xd0d0d0); g.fillCircle(16, 9, 6);               // grey head
          g.fillStyle(0x444444);                                          // dark crest
          g.fillRect(12, 2, 2, 6); g.fillRect(15, 1, 2, 7); g.fillRect(18, 2, 2, 6);
          g.fillStyle(0xffd700); g.fillCircle(13, 8, 2); g.fillCircle(19, 8, 2); // eyes
          g.fillStyle(0x111111); g.fillCircle(13, 8, 1); g.fillCircle(19, 8, 1);
          g.fillStyle(0xd4a853); g.fillRect(14, 11, 4, 2);              // hooked beak
          g.fillTriangle(14, 13, 18, 13, 16, 16);
          g.generateTexture(key, 32, 32);
        } else if (key === 'caiman') {
          // Orinoco Caiman — flat, armored, long snout
          g.fillStyle(color);                                            // olive green body
          g.fillEllipse(22, 10, 38, 14);
          g.fillStyle(0x1a4810, 0.6);                                    // armor scutes
          for (let i = 0; i < 4; i++) g.fillRect(8 + i * 7, 4, 5, 10);
          g.fillStyle(0x3a8020); g.fillRect(34, 3, 12, 11);            // head block
          g.fillRect(44, 5, 6, 6);                                       // snout
          g.fillStyle(0xffffff);                                          // teeth
          g.fillRect(44, 10, 2, 3); g.fillRect(47, 10, 2, 3);
          g.fillStyle(0xd4a853); g.fillCircle(37, 2, 2.5); g.fillCircle(43, 2, 2.5); // eyes
          g.fillStyle(0x111111); g.fillCircle(37, 2, 1); g.fillCircle(43, 2, 1);
          g.fillStyle(color); g.fillTriangle(6, 5, 6, 15, 0, 10);      // tail
          g.fillRect(11, 15, 4, 5); g.fillRect(18, 15, 4, 5);          // front legs
          g.fillRect(26, 15, 4, 5); g.fillRect(33, 15, 4, 5);          // rear legs
          g.generateTexture(key, 50, 20);
        } else if (key === 'canarinho_brute') {
          // Green football bruiser — oversized comic-book build in Brazil kit
          g.fillStyle(0x15803d); g.fillCircle(25, 10, 9);               // head
          g.fillStyle(0x052e16); g.fillRect(17, 2, 16, 5);              // hair
          g.fillStyle(0xffffff); g.fillCircle(21, 9, 2.5); g.fillCircle(29, 9, 2.5);
          g.fillStyle(0x111111); g.fillCircle(21, 9, 1); g.fillCircle(29, 9, 1);
          g.fillStyle(0xfacc15); g.fillRect(11, 20, 28, 20);            // yellow jersey
          g.fillStyle(0x16a34a);
          g.fillTriangle(25, 22, 36, 30, 25, 38);
          g.fillTriangle(25, 22, 14, 30, 25, 38);
          g.fillStyle(0x1d4ed8); g.fillRect(21, 26, 8, 9);              // blue center mark
          g.fillStyle(0x15803d);                                       // massive arms
          g.fillCircle(8, 27, 8); g.fillCircle(42, 27, 8);
          g.fillRect(4, 27, 9, 15); g.fillRect(37, 27, 9, 15);
          g.fillStyle(0x1d4ed8); g.fillRect(14, 40, 10, 15); g.fillRect(27, 40, 10, 15);
          g.fillStyle(0xffffff); g.fillRect(12, 54, 13, 4); g.fillRect(26, 54, 13, 4);
          g.generateTexture(key, 50, 58);
        } else if (key === 'samba_dancer') {
          // Carnival dancer — feathered headdress and spinning parade costume
          const feathers = [0x22c55e, 0xfacc15, 0x2563eb, 0xef4444, 0xec4899];
          for (let i = 0; i < 5; i++) {
            g.fillStyle(feathers[i]);
            g.fillEllipse(10 + i * 7, 8 + Math.abs(2 - i) * 3, 8, 22);
          }
          g.fillStyle(0x8b5cf6); g.fillCircle(24, 19, 9);
          g.fillStyle(0xffffff); g.fillCircle(21, 17, 2); g.fillCircle(27, 17, 2);
          g.fillStyle(0x111111); g.fillCircle(21, 17, 1); g.fillCircle(27, 17, 1);
          g.fillStyle(0xfacc15); g.fillEllipse(24, 32, 24, 19);
          g.fillStyle(0x22c55e); g.fillTriangle(24, 23, 36, 38, 12, 38);
          g.fillStyle(0x2563eb); g.fillRect(7, 29, 34, 5);
          g.fillStyle(0xef4444); g.fillRect(14, 41, 6, 11); g.fillRect(28, 41, 6, 11);
          g.generateTexture(key, 48, 54);
        }
        g.destroy();
      };

      const createPortalTexture = (scene: Phaser.Scene) => {
        const g = scene.make.graphics({ x: 0, y: 0 });
        // Outer glow rings
        g.fillStyle(0xffd700, 0.15); g.fillCircle(30, 40, 28);
        g.fillStyle(0xffd700, 0.25); g.fillCircle(30, 40, 22);
        // Inner portal
        g.fillStyle(0xfbbf24, 0.6); g.fillCircle(30, 40, 16);
        g.fillStyle(0xffffff, 0.9); g.fillCircle(30, 40, 8);
        // Frame
        g.lineStyle(3, 0xffd700, 1);
        g.strokeCircle(30, 40, 22);
        // Star above (manual 5-point star)
        g.fillStyle(0xffd700, 1);
        const starPts: Phaser.Math.Vector2[] = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? 10 : 4;
          starPts.push(new Phaser.Math.Vector2(30 + Math.cos(angle) * r, 12 + Math.sin(angle) * r));
        }
        g.fillPoints(starPts, true);
        g.lineStyle(2, 0xffd700, 1);
        g.strokeRect(24, 68, 12, 4);
        g.generateTexture("portal", 60, 80);
        g.destroy();
      };

      // ─── LEVEL CONFIGS ────────────────────────────────────────────────
      type PlatformDef = { x: number; y: number; w: number };
      interface LevelConfig {
        bgColors: [number, number];
        mountainColor: number;
        platformColor: number;
        platformAccent: number;
        enemyColor: number;
        enemyKey: string;
        coinColor: number;
        title: string;
        worldWidth: number;
        platforms: PlatformDef[];
        musicNotes: number[];
        musicTempo: number;
        musicMelody?: number[];
        rhythmStyle?: 'default' | 'cumbia' | 'joropo' | 'samba';
        mountainProfile: number[];
        portalX: number;
        portalY: number;
        nextLevel: number | null;
        hazardBehavior: 'dive' | 'charge' | 'carnival' | 'tepui' | 'brazil';
        flag: string;
        backgroundStyle: 'andes' | 'pyramids' | 'carnival' | 'tepui' | 'rio';
        enemy2Key?: string;
        enemy2Color?: number;
      }

      const LEVEL_CONFIGS: Record<number, LevelConfig> = {
        1: {
          bgColors:        [0x0a0a2e, 0x1a0a3e],
          mountainColor:   0x2d1b69,
          platformColor:   0x78350f,
          platformAccent:  0x92400e,
          enemyColor:      0x4b5563,
          enemyKey:        "condor",
          coinColor:       0xffd700,
          title:           "Los Andes — Machu Picchu",
          worldWidth:      4800,
          musicNotes:      [261, 294, 330, 349, 392, 440, 494, 523],
          musicTempo:      380,
          mountainProfile: [370,330,280,155,210,290,350,300,260,310,270,240,340,290,370],
          portalX:         4680,
          portalY:         260,
          nextLevel:       2,
          hazardBehavior:  'dive',
          flag:            '🇵🇪',
          backgroundStyle: 'andes',
          platforms: [
            {x:100,  y:460, w:200}, {x:380,  y:420, w:160}, {x:620,  y:380, w:140},
            {x:840,  y:340, w:180}, {x:1080, y:380, w:120}, {x:1260, y:420, w:160},
            {x:1480, y:360, w:140}, {x:1700, y:310, w:180}, {x:1940, y:350, w:120},
            {x:2140, y:390, w:160}, {x:2360, y:340, w:140}, {x:2580, y:300, w:180},
            {x:2800, y:340, w:120}, {x:3000, y:380, w:160}, {x:3200, y:420, w:140},
            {x:3400, y:360, w:180}, {x:3620, y:310, w:120}, {x:3840, y:350, w:160},
            {x:4000, y:390, w:200}, {x:4260, y:340, w:180}, {x:4500, y:300, w:240},
          ],
        },
        2: {
          bgColors:        [0x1a0a00, 0x2d1600],
          mountainColor:   0x451a03,
          platformColor:   0x44403c,
          platformAccent:  0x57534e,
          enemyColor:      0xb45309,
          enemyKey:        "jaguar",
          coinColor:       0x00ff88,
          title:           "Tierra Azteca — Teotihuacán",
          worldWidth:      4800,
          musicNotes:      [220, 246, 261, 293, 329, 349, 392, 440],
          musicTempo:      300,
          mountainProfile: [350,300,280,320,290,260,310,280,300,270,290,310,280,300,270],
          portalX:         4700,
          portalY:         240,
          nextLevel:       3,
          hazardBehavior:  'charge',
          flag:            '🇲🇽',
          backgroundStyle: 'pyramids',
          platforms: [
            {x:100,  y:460, w:200}, {x:360,  y:400, w:180}, {x:600,  y:350, w:160},
            {x:820,  y:300, w:200}, {x:1080, y:350, w:140}, {x:1280, y:400, w:160},
            {x:1500, y:340, w:180}, {x:1740, y:290, w:200}, {x:1980, y:330, w:140},
            {x:2180, y:380, w:160}, {x:2400, y:320, w:180}, {x:2640, y:270, w:200},
            {x:2880, y:310, w:160}, {x:3100, y:360, w:140}, {x:3300, y:400, w:180},
            {x:3500, y:340, w:160}, {x:3720, y:290, w:180}, {x:3960, y:330, w:160},
            {x:4160, y:380, w:200}, {x:4420, y:320, w:180}, {x:4620, y:280, w:240},
          ],
        },
        3: {
          bgColors:        [0x87ceeb, 0x5b9bd5],
          mountainColor:   0x4a1272,
          platformColor:   0x7c3aed,
          platformAccent:  0xc026d3,
          enemyColor:      0xfde68a,
          enemyKey:        "marimonda",
          enemy2Key:       "torito",
          enemy2Color:     0x44260a,
          coinColor:       0xffd700,
          title:           "El Carnaval — Barranquilla",
          worldWidth:      4800,
          musicNotes:      [294, 330, 349, 392, 440, 466, 523, 587],
          musicTempo:      220,
          musicMelody:     [4, 2, 0, 2, 4, 7, 5, 4],
          rhythmStyle:     'cumbia' as const,
          mountainProfile: [370,320,290,350,310,270,340,300,360,290,350,310,280,330,370],
          portalX:         4700,
          portalY:         260,
          nextLevel:       4,
          hazardBehavior:  'carnival',
          flag:            '🇨🇴',
          backgroundStyle: 'carnival',
          platforms: [
            {x:100,  y:460, w:180},  // start
            {x:450,  y:375, w:100},  // gap 170 — some players drop to ground
            {x:730,  y:308, w:110},  // climbing
            {x:1050, y:415, w:100},  // drops near ground — torito territory
            {x:1350, y:340, w:100},  // back up
            {x:1660, y:275, w:110},  // high platform
            {x:1990, y:408, w:100},  // big drop — torito territory
            {x:2290, y:335, w:110},
            {x:2610, y:270, w:100},  // high
            {x:2940, y:398, w:100},  // big drop — torito territory
            {x:3250, y:322, w:110},
            {x:3570, y:270, w:100},  // high
            {x:3870, y:358, w:110},
            {x:4180, y:310, w:100},
            {x:4460, y:292, w:240},  // final approach
          ],
        },
        4: {
          bgColors:        [0x0e2a40, 0x04101a],
          mountainColor:   0x7a3418,
          platformColor:   0x6b2e12,
          platformAccent:  0x8a4228,
          enemyColor:      0x1a1210,
          enemyKey:        'harpy_eagle',
          enemy2Key:       'caiman',
          enemy2Color:     0x2d6b1a,
          coinColor:       0x40e0ff,
          title:           'Gran Sabana — Salto Ángel',
          worldWidth:      4800,
          musicNotes:      [329, 370, 415, 440, 493, 554, 622, 659],
          musicTempo:      280,
          musicMelody:     [0, 2, 4, 5, 7, 5, 4, 2],
          rhythmStyle:     'joropo' as const,
          mountainProfile: [280, 240, 310, 260, 290, 240, 270, 300, 250, 280, 310, 260, 290, 270, 290],
          portalX:         4700,
          portalY:         255,
          nextLevel:       5,
          hazardBehavior:  'tepui',
          flag:            '🇻🇪',
          backgroundStyle: 'tepui',
          platforms: [
            {x:100,  y:460, w:160},
            {x:420,  y:390, w:110},
            {x:680,  y:320, w:100},
            {x:940,  y:255, w:110},
            {x:1220, y:360, w:100},
            {x:1500, y:290, w:100},
            {x:1790, y:235, w:100},
            {x:2090, y:375, w:100},
            {x:2380, y:305, w:100},
            {x:2680, y:245, w:100},
            {x:2980, y:385, w:100},
            {x:3280, y:310, w:110},
            {x:3580, y:250, w:100},
            {x:3870, y:375, w:100},
            {x:4150, y:300, w:100},
            {x:4430, y:255, w:240},
          ],
        },
        5: {
          bgColors:        [0x0b7a75, 0x032b45],
          mountainColor:   0x14532d,
          platformColor:   0x15803d,
          platformAccent:  0xfacc15,
          enemyColor:      0x15803d,
          enemyKey:        'canarinho_brute',
          enemy2Key:       'samba_dancer',
          enemy2Color:     0xfacc15,
          coinColor:       0xfacc15,
          title:           'Brasil Futebol — Río de Janeiro',
          worldWidth:      5200,
          musicNotes:      [262, 294, 330, 392, 440, 494, 523, 587],
          musicTempo:      360,
          musicMelody:     [0, 3, 4, 6, 4, 3, 1, 3],
          rhythmStyle:     'samba' as const,
          mountainProfile: [330,280,250,310,270,230,290,255,315,260,300,245,285,270,330],
          portalX:         5080,
          portalY:         235,
          nextLevel:       null,
          hazardBehavior:  'brazil',
          flag:            '🇧🇷',
          backgroundStyle: 'rio',
          platforms: [
            {x:100,  y:460, w:150},
            {x:390,  y:392, w:95},
            {x:660,  y:322, w:90},
            {x:940,  y:250, w:100},
            {x:1240, y:382, w:90},
            {x:1530, y:310, w:95},
            {x:1810, y:240, w:90},
            {x:2110, y:398, w:90},
            {x:2390, y:326, w:95},
            {x:2685, y:252, w:90},
            {x:2980, y:408, w:85},
            {x:3270, y:334, w:90},
            {x:3560, y:262, w:90},
            {x:3860, y:396, w:85},
            {x:4140, y:318, w:90},
            {x:4430, y:252, w:90},
            {x:4720, y:308, w:90},
            {x:4940, y:235, w:250},
          ],
        },
      };

      // ─── AUDIO ENGINE ─────────────────────────────────────────────────
      class AudioEngine {
        ctx: AudioContext;
        notes: number[];
        tempo: number;
        melody: number[];
        rhythmStyle: string;
        handle: ReturnType<typeof setInterval> | null = null;
        step = 0;

        constructor(notes: number[], tempo: number, melody?: number[], rhythmStyle?: string) {
          this.ctx = new AudioContext();
          this.notes = notes;
          this.tempo = tempo;
          this.melody = melody ?? [0, 2, 4, 7, 2, 4, 7, 4];
          this.rhythmStyle = rhythmStyle ?? 'default';
        }

        private tone(freq: number, time: number, dur = 0.12, vol = 0.08, type: OscillatorType = "triangle") {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.frequency.value = freq; osc.type = type;
          gain.gain.setValueAtTime(vol, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
          osc.start(time); osc.stop(time + dur + 0.05);
        }

        private noise(time: number, vol = 0.15, dur = 0.08) {
          const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 800);
          const src = this.ctx.createBufferSource();
          const gain = this.ctx.createGain();
          src.buffer = buf; src.connect(gain); gain.connect(this.ctx.destination);
          gain.gain.value = vol;
          src.start(time);
        }

        // Sound effects
        sfx(type: "jump" | "coin" | "stomp" | "hurt" | "complete") {
          if (this.ctx.state === "closed") return;
          const now = this.ctx.currentTime;
          if (type === "jump") {
            this.tone(320, now, 0.06, 0.12, "square");
            this.tone(480, now + 0.04, 0.08, 0.08, "square");
          } else if (type === "coin") {
            this.tone(880, now, 0.05, 0.12, "sine");
            this.tone(1200, now + 0.05, 0.08, 0.1, "sine");
          } else if (type === "stomp") {
            this.noise(now, 0.2, 0.06);
            this.tone(120, now, 0.1, 0.15, "square");
          } else if (type === "hurt") {
            this.tone(300, now, 0.08, 0.18, "sawtooth");
            this.tone(200, now + 0.08, 0.12, 0.15, "sawtooth");
          } else if (type === "complete") {
            [0, 0.1, 0.2, 0.35].forEach((t, i) => {
              const freqs = [523, 659, 784, 1046];
              this.tone(freqs[i], now + t, 0.18, 0.12, "triangle");
            });
          }
        }

        // Background music
        start() {
          this.stopMusic();
          const tick = () => {
            if (this.ctx.state === "closed") return;
            const now = this.ctx.currentTime;
            const interval = 60 / this.tempo;
            if (this.rhythmStyle === 'cumbia') {
              // Colombian cumbia pattern — 8-step cycle
              // Maracas: constant noise on every tick (characteristic cumbia texture)
              this.noise(now, 0.07, 0.03);
              const s = this.step % 8;
              // Melody on downbeats and upbeats
              if (s === 0 || s === 2 || s === 4 || s === 6)
                this.tone(this.notes[this.melody[s % this.melody.length]], now, interval * 0.65, 0.09, "triangle");
              // Bombo (bass drum) on 0 and syncopated 5 — cumbia's characteristic push
              if (s === 0 || s === 5)
                this.tone(this.notes[0] / 2, now, interval * 1.6, 0.11, "sine");
              // Caja (snare/tambor) on 2 and 6 — the backbeat
              if (s === 2 || s === 6) {
                this.noise(now, 0.2, 0.07);
                this.tone(180, now, 0.09, 0.07, "square");
              }
              // Llamador (small drum) anticipation on 3 and 7
              if (s === 3 || s === 7)
                this.tone(110, now, 0.1, 0.05, "sine");
            } else if (this.rhythmStyle === 'joropo') {
              // Venezuelan joropo — fast 6/8 feel: arpa llanera melody + cuatro chords + maracas
              const s = this.step % 6;
              // Arpa llanera melody on the three triplet subdivisions
              if (s === 0 || s === 2 || s === 4)
                this.tone(this.notes[this.melody[Math.floor(this.step / 3) % this.melody.length]], now, interval * 0.5, 0.1, 'triangle');
              // Cuatro chord stabs on beats 0 and 3 (two voices for chord feel)
              if (s === 0 || s === 3) {
                this.tone(this.notes[0], now, interval * 0.8, 0.07, 'square');
                this.tone(this.notes[4], now, interval * 0.8, 0.04, 'square');
              }
              // Maracas — constant light noise on every tick
              this.noise(now, 0.09, 0.03);
              // Bandola syncopation on upbeats 1 and 4
              if (s === 1 || s === 4)
                this.tone(this.notes[this.melody[(Math.floor(this.step / 3) + 3) % this.melody.length]], now, interval * 0.4, 0.06, 'sine');
            } else if (this.rhythmStyle === 'samba') {
              // Brazilian samba feel — bright syncopated melody, surdo pulse, shaker texture
              const s = this.step % 8;
              this.noise(now, s % 2 === 0 ? 0.08 : 0.05, 0.025);
              if (s === 0 || s === 3 || s === 6)
                this.tone(this.notes[0] / 2, now, interval * 1.4, 0.12, 'sine');
              if (s === 2 || s === 5)
                this.noise(now, 0.2, 0.05);
              if (s === 1 || s === 3 || s === 4 || s === 7)
                this.tone(this.notes[this.melody[this.step % this.melody.length]], now, interval * 0.45, 0.09, 'triangle');
              if (s === 4)
                this.tone(this.notes[4], now, interval * 0.6, 0.05, 'square');
            } else {
              this.tone(this.notes[this.melody[this.step % this.melody.length]], now, interval * 0.8);
              if (this.step % 4 === 0 || this.step % 4 === 2)
                this.tone(this.notes[0] / 2, now, interval * 1.5, 0.06);
              this.noise(now, 0.12, 0.05);
              if (this.step % 2 === 1) this.noise(now + interval * 0.5, 0.08, 0.04);
            }
            this.step++;
          };
          tick();
          this.handle = setInterval(tick, 60000 / this.tempo);
        }

        stopMusic() {
          if (this.handle) { clearInterval(this.handle); this.handle = null; }
        }

        stop() {
          this.stopMusic();
          if (this.ctx.state !== "closed") this.ctx.close().catch(() => {});
        }
      }

      // ─── GAME SCENE ───────────────────────────────────────────────────
      class GameScene extends Phaser.Scene {
        cfg!: LevelConfig;
        hero!: Phaser.Physics.Arcade.Sprite;
        platforms!: Phaser.Physics.Arcade.StaticGroup;
        enemies!: Phaser.Physics.Arcade.Group;
        coins!: Phaser.Physics.Arcade.StaticGroup;
        audio!: AudioEngine;

        score = 0;
        lives = 3;
        invincible = false;
        invincibleTimer = 0;
        coyoteFrames = 0;
        wasOnGround = false;
        ended = false;
        introActive = false;
        portalX = 0;
        portalY = 0;

        scoreText!: Phaser.GameObjects.Text;
        heartsText!: Phaser.GameObjects.Text;
        groundY = 500;

        constructor() { super("GameScene"); }

        preload() {
          this.cfg = LEVEL_CONFIGS[level] ?? LEVEL_CONFIGS[1];
          createCharTexture(this);
          createEnemyTexture(this, this.cfg.enemyKey, this.cfg.enemyColor);
          if (this.cfg.enemy2Key) createEnemyTexture(this, this.cfg.enemy2Key, this.cfg.enemy2Color ?? 0);
          createPortalTexture(this);

          const pg = this.make.graphics({ x: 0, y: 0 });
          pg.fillStyle(this.cfg.platformColor); pg.fillRect(0, 0, 32, 20);
          pg.fillStyle(this.cfg.platformAccent); pg.fillRect(0, 0, 32, 4);
          pg.fillStyle(this.cfg.platformColor - 0x111111);
          pg.fillRect(8, 0, 1, 20); pg.fillRect(24, 0, 1, 20); pg.fillRect(0, 10, 32, 1);
          pg.generateTexture("platform-tile", 32, 20); pg.destroy();

          const cg = this.make.graphics({ x: 0, y: 0 });
          cg.fillStyle(this.cfg.coinColor); cg.fillCircle(8, 8, 7);
          cg.fillStyle(0xffffff, 0.4); cg.fillCircle(6, 6, 3);
          cg.generateTexture("coin", 16, 16); cg.destroy();

          const gg = this.make.graphics({ x: 0, y: 0 });
          gg.fillStyle(this.cfg.platformColor); gg.fillRect(0, 0, 32, 32);
          gg.fillStyle(this.cfg.platformAccent); gg.fillRect(0, 0, 32, 6);
          gg.generateTexture("ground-tile", 32, 32); gg.destroy();
        }

        create() {
          this.audio?.stop(); // guard: stop any audio left over from a previous run (scene.restart)

          const cfg = this.cfg;
          const W = this.scale.width;
          const H = this.scale.height;
          const worldW = cfg.worldWidth;

          this.score = 0; this.lives = 3;
          this.invincible = false; this.invincibleTimer = 0;
          this.ended = false; this.coyoteFrames = 0; this.wasOnGround = false;

          this.cameras.main.setBounds(0, 0, worldW, H);
          this.physics.world.setBounds(0, 0, worldW, H + 200);

          // Background
          const bg = this.add.graphics();
          for (let i = 0; i < H; i++) {
            const t = i / H;
            const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
            const r = lerp((cfg.bgColors[0] >> 16) & 0xff, (cfg.bgColors[1] >> 16) & 0xff);
            const g = lerp((cfg.bgColors[0] >> 8)  & 0xff, (cfg.bgColors[1] >> 8)  & 0xff);
            const b = lerp( cfg.bgColors[0]         & 0xff,  cfg.bgColors[1]         & 0xff);
            bg.fillStyle((r << 16) | (g << 8) | b); bg.fillRect(0, i, worldW, 1);
          }
          bg.setScrollFactor(0.1);

          // Stars
          const stars = this.add.graphics().setScrollFactor(0.05);
          for (let i = 0; i < 120; i++) {
            stars.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 1));
            stars.fillRect(Phaser.Math.Between(0, worldW), Phaser.Math.Between(0, H * 0.6), 1, 1);
          }

          // Background landmarks
          if (cfg.backgroundStyle === 'andes') {
            // Machu Picchu: tiled scenes of ruins + Huayna Picchu peak
            const bg  = this.add.graphics().setScrollFactor(0.3);
            const mist = this.add.graphics().setScrollFactor(0.18);

            const drawScene = (ox: number) => {
              const py = 415; // plateau baseline

              // ── Left surrounding mountain ──
              bg.fillStyle(0x2d1b69, 0.65);
              bg.fillTriangle(ox, py + 30, ox + 70, py - 155, ox + 230, py + 30);

              // ── The saddle / ridge the ruins sit on ──
              bg.fillStyle(0x3a2560, 0.85);
              bg.fillRect(ox + 205, py - 108, 210, 118);
              bg.fillStyle(0x2d1b69, 0.5); // slight slope on top of ridge
              bg.fillTriangle(ox + 205, py - 108, ox + 300, py - 138, ox + 415, py - 108);

              // ── Stone buildings (Inca ruins) — two rows ──
              const sc = 0x7a6e58;
              for (let b = 0; b < 4; b++) {
                const bx = ox + 217 + b * 46; const by = py - 140;
                bg.fillStyle(sc); bg.fillRect(bx, by, 34, 32);
                bg.fillStyle(0x2a2520, 0.75); bg.fillRect(bx + 12, by + 13, 11, 19); // doorway
              }
              for (let b = 0; b < 3; b++) {
                const bx = ox + 235 + b * 52; const by = py - 166;
                bg.fillStyle(sc - 0x101008); bg.fillRect(bx, by, 28, 26);
                bg.fillStyle(0x2a2520, 0.6); bg.fillRect(bx + 9, by + 10, 10, 16);
              }

              // ── Right surrounding mountain ──
              bg.fillStyle(0x2d1b69, 0.55);
              bg.fillTriangle(ox + 560, py + 30, ox + 660, py - 110, ox + 760, py + 30);

              // ── Huayna Picchu — tall sharp iconic peak ──
              bg.fillStyle(0x1a0e42, 0.95);
              bg.fillTriangle(ox + 390, py + 30, ox + 500, py - 345, ox + 610, py + 30);
              bg.fillStyle(0x251660, 0.55); // lit left face
              bg.fillTriangle(ox + 390, py + 30, ox + 500, py - 345, ox + 478, py + 30);
              // Snow cap
              bg.fillStyle(0xffffff, 0.82);
              bg.fillTriangle(ox + 477, py - 297, ox + 500, py - 345, ox + 523, py - 297);

              // ── Green terracing — actual steps below the ridge ──
              for (let t = 0; t < 8; t++) {
                const tw = 200 - t * 14; const tx = ox + 208 + t * 7;
                const ty = py - 102 + t * 19;
                bg.fillStyle(0x166534, 0.48); bg.fillRect(tx, ty, tw, 11);
                bg.fillStyle(0x0a3a1e, 0.38); bg.fillRect(tx, ty + 9, tw, 9);
              }
            };

            // Tile across full world
            for (let i = 0; i * 760 < worldW + 760; i++) drawScene(i * 760);

            // Cloud mist at mountain level
            mist.fillStyle(0xffffff, 0.06);
            for (let i = 0; i < 16; i++)
              mist.fillEllipse(i * (worldW / 15), 205 + Math.sin(i * 1.4) * 26, 650, 85);
          } else if (cfg.backgroundStyle === 'pyramids') {
            // Teotihuacán — desert plain with stepped pyramid silhouettes
            const plain = this.add.graphics().setScrollFactor(0.2);
            // Sandy ground
            plain.fillStyle(0x6b3a1f, 0.55); plain.fillRect(0, H * 0.58, worldW, H * 0.45);
            plain.fillStyle(0x92400e, 0.25); plain.fillRect(0, H * 0.575, worldW, 18);

            const drawPyramid = (cx: number, baseY: number, bw: number, h: number, steps: number, baseCol: number) => {
              for (let s = 0; s < steps; s++) {
                const pct = (steps - s) / steps;
                const sw = bw * pct; const sh = h / steps;
                const sx = cx - sw / 2; const sy = baseY - (s + 1) * sh;
                plain.fillStyle(Math.min(0xffffff, baseCol + s * 0x060400), 0.88);
                plain.fillRect(sx, sy, sw, sh);
                plain.fillStyle(0x000000, 0.2); plain.fillRect(sx + sw / 2, sy, sw / 2, sh);
                plain.fillStyle(0xffffff, 0.07); plain.fillRect(sx, sy, sw, 2);
              }
            };

            const col = cfg.mountainColor;
            const baseY = Math.round(H * 0.58);
            for (let i = 0; i < 8; i++) {
              const bx = 280 + i * 580;
              if (i % 3 === 0)      drawPyramid(bx,       baseY, 360, 220, 5, col);
              else if (i % 3 === 1) drawPyramid(bx + 150, baseY, 220, 145, 4, col - 0x0a0800);
              else                  drawPyramid(bx + 70,  baseY, 140,  95, 3, col - 0x141000);
            }
          } else if (cfg.backgroundStyle === 'carnival') {
            // Barranquilla Carnival — midday parade, tropical sun, colorful colonial buildings

            // Clouds in the bright sky
            const clouds = this.add.graphics().setScrollFactor(0.05);
            clouds.fillStyle(0xffffff, 0.75);
            for (let i = 0; i < 14; i++) {
              const cx = i * (worldW / 13); const cy = 50 + (i * 37 % 50);
              clouds.fillEllipse(cx, cy, 130, 38); clouds.fillEllipse(cx + 45, cy - 16, 85, 32);
              clouds.fillEllipse(cx - 35, cy - 10, 65, 28);
            }

            // Colorful colonial buildings — skyline in the upper background
            const bldgs = this.add.graphics().setScrollFactor(0.15);
            const bBase = Math.round(H * 0.42);
            const bWall  = [0xfef9c3, 0xfde68a, 0xfed7aa, 0xcffafe, 0xfce7f3];
            const bTrim  = [0xef4444, 0xf59e0b, 0x0891b2, 0xdb2777, 0x16a34a];
            for (let i = 0; i < Math.ceil(worldW / 95); i++) {
              const bx = i * 95; const bh = 115 + (i * 53 % 90);
              bldgs.fillStyle(bWall[i % bWall.length], 1); bldgs.fillRect(bx, bBase - bh, 90, bh);
              bldgs.fillStyle(bTrim[i % bTrim.length], 0.9); bldgs.fillRect(bx, bBase - bh, 90, 8);
              bldgs.fillStyle(0x1e3a5f, 0.45);
              for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++)
                if ((i + r + c) % 4 !== 0) bldgs.fillRect(bx + 12 + c * 40, bBase - bh + 16 + r * 30, 22, 18);
            }

            // Pennant banners strung across the street
            const banners = this.add.graphics().setScrollFactor(0.45);
            const pColors = [0xef4444, 0xfbbf24, 0x3b82f6, 0x22c55e, 0xec4899, 0x8b5cf6];
            banners.lineStyle(1, 0xd4a853, 0.5);
            for (let i = 0; i < Math.ceil(worldW / 28); i++) {
              const bx = i * 28; const by = 75 + Math.sin(i * 0.45) * 18;
              if (i % 28 === 0) banners.lineBetween(bx, by - 14, bx + worldW / 14, by - 14);
              banners.fillStyle(pColors[i % pColors.length], 0.9);
              banners.fillTriangle(bx, by - 12, bx + 14, by + 10, bx + 25, by - 12);
            }

            // Crowd — dense, in daylight they're dark silhouettes against bright buildings
            const crowd = this.add.graphics().setScrollFactor(0.6);
            for (let i = 0; i < Math.ceil(worldW / 26); i++) {
              const cx = i * 26; const ch = 55 + (i * 19 % 30);
              crowd.fillStyle(0x1e0a00, 0.88); crowd.fillRect(cx, this.groundY - ch, 22, ch + 40);
              crowd.fillEllipse(cx + 11, this.groundY - ch - 5, 16, 18);
            }

            // Confetti — very visible against bright sky
            const conf = this.add.graphics().setScrollFactor(0.92);
            const cfColors = [0xff6b9d, 0xffd700, 0x00aaff, 0x44ff66, 0xff6600, 0xcc44ff, 0xff2222, 0x00ddaa];
            for (let i = 0; i < 700; i++) {
              const cx = (i * 2654435761 >>> 0) % worldW;
              const cy = 15 + ((i * 1234567891 >>> 0) % (this.groundY - 60));
              conf.fillStyle(cfColors[i % cfColors.length], 0.9);
              if (i % 3 === 0) conf.fillRect(cx, cy, 5, 8);
              else conf.fillCircle(cx, cy, 3);
            }
          } else if (cfg.backgroundStyle === 'tepui') {
            // Gran Sabana — Angel Falls, tepui mesas, jungle canopy

            // Angel Falls — distant thin waterfall streaks
            const falls = this.add.graphics().setScrollFactor(0.07);
            for (let i = 0; i < Math.ceil(worldW / 370); i++) {
              const fx = 140 + i * 370;
              falls.fillStyle(0xaaddff, 0.2); falls.fillRect(fx, 50, 5, 340);
              falls.fillStyle(0xffffff, 0.1); falls.fillRect(fx + 1, 50, 2, 340);
            }

            // Tepui mesa formations (flat-topped, vertical red cliffs)
            const mesas = this.add.graphics().setScrollFactor(0.2);
            const drawMesa = (ox: number, bw: number, mh: number) => {
              const baseY = Math.round(H * 0.74);
              mesas.fillStyle(0x7a3418, 0.9);  mesas.fillRect(ox, baseY - mh, bw, mh);   // cliff face
              mesas.fillStyle(0xa04822, 0.4);  mesas.fillRect(ox, baseY - mh, 15, mh);   // lit left edge
              mesas.fillStyle(0x3a150a, 0.4);  mesas.fillRect(ox + bw - 15, baseY - mh, 15, mh); // shadow
              mesas.fillStyle(0x1a6a1a, 0.75); mesas.fillRect(ox, baseY - mh, bw, 20);   // jungle top
              mesas.fillStyle(0x0d3d0d, 0.35); mesas.fillRect(ox, baseY - mh, bw, 5);    // top edge
              mesas.fillStyle(0x5a2010, 0.25);
              for (let s = 1; s <= 3; s++)
                mesas.fillRect(ox + 13, baseY - mh + s * Math.round(mh / 4), bw - 26, 2); // strata
            };
            for (let i = 0; i * 550 < worldW + 550; i++) {
              drawMesa(i * 550,       270, 190);
              drawMesa(i * 550 + 310, 175, 130);
            }

            // Mist bands at tepui mid-height
            const mist = this.add.graphics().setScrollFactor(0.28);
            mist.fillStyle(0xffffff, 0.06);
            for (let i = 0; i < 28; i++)
              mist.fillEllipse(i * (worldW / 26), 255 + Math.sin(i * 1.6) * 18, 520, 48);

            // Jungle canopy at ground level
            const jungle = this.add.graphics().setScrollFactor(0.65);
            jungle.fillStyle(0x0d4a12, 0.85);
            for (let i = 0; i < Math.ceil(worldW / 50); i++) {
              const jx = i * 50; const jh = 36 + (i * 23 % 26);
              jungle.fillEllipse(jx + 25, this.groundY - jh / 2, 60, jh);
            }
            jungle.fillStyle(0x1a7020, 0.5);
            for (let i = 0; i < Math.ceil(worldW / 36); i++) {
              const jx = i * 36 + (i % 3) * 12; const jh = 22 + (i * 13 % 18);
              jungle.fillEllipse(jx, this.groundY - jh / 2, 42, jh);
            }
          } else if (cfg.backgroundStyle === 'rio') {
            // Rio — football beach, Sugarloaf silhouettes, parade energy
            const ocean = this.add.graphics().setScrollFactor(0.12);
            ocean.fillStyle(0x38bdf8, 0.35); ocean.fillRect(0, Math.round(H * 0.56), worldW, H * 0.16);
            ocean.fillStyle(0xffffff, 0.2);
            for (let i = 0; i < Math.ceil(worldW / 180); i++)
              ocean.fillEllipse(i * 180 + 50, Math.round(H * 0.62) + Math.sin(i) * 8, 110, 10);

            const hills = this.add.graphics().setScrollFactor(0.18);
            for (let i = 0; i < Math.ceil(worldW / 760); i++) {
              const ox = i * 760;
              hills.fillStyle(0x064e3b, 0.88);
              hills.fillEllipse(ox + 170, 360, 280, 260);
              hills.fillEllipse(ox + 450, 350, 210, 300);
              hills.fillStyle(0x052e2b, 0.95);
              hills.fillEllipse(ox + 590, 330, 130, 360);              // Sugarloaf-like peak
              hills.fillStyle(0xf8fafc, 0.75);
              hills.fillRect(ox + 443, 136, 5, 54);                    // distant Christ statue
              hills.fillRect(ox + 424, 152, 42, 5);
            }

            const beach = this.add.graphics().setScrollFactor(0.38);
            beach.fillStyle(0xfde68a, 0.82); beach.fillRect(0, Math.round(H * 0.68), worldW, 190);
            beach.fillStyle(0x16a34a, 0.65);
            for (let i = 0; i < Math.ceil(worldW / 120); i++) {
              const x = i * 120 + 30;
              beach.fillRect(x, this.groundY - 82, 4, 45);
              beach.fillCircle(x - 10, this.groundY - 87, 14);
              beach.fillCircle(x + 10, this.groundY - 91, 14);
            }

            const crowd = this.add.graphics().setScrollFactor(0.62);
            const shirts = [0xfacc15, 0x22c55e, 0x2563eb, 0xffffff];
            for (let i = 0; i < Math.ceil(worldW / 30); i++) {
              const x = i * 30; const h = 42 + (i * 17 % 28);
              crowd.fillStyle(shirts[i % shirts.length], 0.9);
              crowd.fillRect(x, this.groundY - h, 20, h + 24);
              crowd.fillStyle(0x3f1d0b, 0.9);
              crowd.fillCircle(x + 10, this.groundY - h - 6, 8);
            }

            const conf = this.add.graphics().setScrollFactor(0.9);
            const cfColors = [0xfacc15, 0x22c55e, 0x2563eb, 0xffffff, 0xef4444];
            for (let i = 0; i < 650; i++) {
              const cx = (i * 1103515245 >>> 0) % worldW;
              const cy = 20 + ((i * 2654435761 >>> 0) % (this.groundY - 70));
              conf.fillStyle(cfColors[i % cfColors.length], 0.85);
              conf.fillRect(cx, cy, i % 2 === 0 ? 6 : 3, i % 2 === 0 ? 3 : 7);
            }
          }

          // Ground
          this.platforms = this.physics.add.staticGroup();
          for (let i = 0; i <= Math.ceil(worldW / 32); i++)
            this.platforms.create(i * 32 + 16, this.groundY + 16, "ground-tile").refreshBody();

          // Floating platforms
          cfg.platforms.forEach(p => {
            for (let i = 0; i < Math.ceil(p.w / 32); i++)
              this.platforms.create(p.x + i * 32 + 16, p.y, "platform-tile").refreshBody();
          });

          // Coins
          this.coins = this.physics.add.staticGroup();
          cfg.platforms.forEach((p, idx) => {
            if (idx % 2 === 0) this.coins.create(p.x + p.w / 2, p.y - 30, "coin");
          });

          // Enemies
          this.enemies = this.physics.add.group();
          if (cfg.hazardBehavior === 'dive') {
            // Condors — airborne, no gravity, distributed across the world
            const numCondors = 8;
            for (let i = 0; i < numCondors; i++) {
              const x = 500 + i * (cfg.worldWidth / numCondors);
              const e = this.enemies.create(x, 140, cfg.enemyKey) as Phaser.Physics.Arcade.Sprite;
              const body = e.body as Phaser.Physics.Arcade.Body;
              body.setAllowGravity(false);
              body.setCollideWorldBounds(true);
              e.setVelocityX(i % 2 === 0 ? -80 : 80);
              e.setData('state', 'patrol');
              e.setData('diveTimer', Phaser.Math.Between(120, 300));
              e.setData('homeY', 140);
            }
          } else if (cfg.hazardBehavior === 'charge') {
            // Jaguars — platform-based patrol, charge when player is close
            cfg.platforms.slice(2).forEach((p, idx) => {
              if (idx % 3 === 0) {
                const e = this.enemies.create(p.x + p.w / 2, p.y - 24, cfg.enemyKey) as Phaser.Physics.Arcade.Sprite;
                (e.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
                e.setVelocityX(idx % 2 === 0 ? -90 : 90);
                e.setBounceX(1);
                e.setData('state', 'patrol');
              }
            });
          } else if (cfg.hazardBehavior === 'carnival') {
            // Marimondas — on platforms, dancing patrol then charge
            cfg.platforms.slice(2).forEach((p, idx) => {
              if (idx % 2 === 0) {
                const e = this.enemies.create(p.x + p.w / 2, p.y - 35, 'marimonda') as Phaser.Physics.Arcade.Sprite;
                (e.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
                e.setVelocityX(idx % 4 < 2 ? 95 : -95);
                e.setBounceX(1);
                e.setData('state', 'patrol');
                e.setData('enemyType', 'marimonda');
              }
            });
            // Toritos — on the ground, wind-up then fast charge
            const numToritos = 9;
            for (let i = 0; i < numToritos; i++) {
              const x = 500 + i * (cfg.worldWidth / numToritos);
              const e = this.enemies.create(x, this.groundY - 23, 'torito') as Phaser.Physics.Arcade.Sprite;
              (e.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
              e.setVelocityX(i % 2 === 0 ? 55 : -55);
              e.setBounceX(0);
              e.setData('state', 'patrol');
              e.setData('enemyType', 'torito');
            }
          } else if (cfg.hazardBehavior === 'tepui') {
            // Harpy Eagles — aggressive aerial divers
            const numEagles = 7;
            for (let i = 0; i < numEagles; i++) {
              const x = 600 + i * (cfg.worldWidth / numEagles);
              const e = this.enemies.create(x, 125, cfg.enemyKey) as Phaser.Physics.Arcade.Sprite;
              const body = e.body as Phaser.Physics.Arcade.Body;
              body.setAllowGravity(false);
              body.setCollideWorldBounds(true);
              e.setVelocityX(i % 2 === 0 ? -95 : 95);
              e.setData('state', 'patrol');
              e.setData('enemyType', 'harpy_eagle');
              e.setData('diveTimer', Phaser.Math.Between(70, 220));
              e.setData('homeY', 125);
            }
            // Orinoco Caimans — slow ground patrol, sudden lunge
            const numCaimans = 8;
            for (let i = 0; i < numCaimans; i++) {
              const x = 500 + i * (cfg.worldWidth / numCaimans);
              const e = this.enemies.create(x, this.groundY - 10, cfg.enemy2Key!) as Phaser.Physics.Arcade.Sprite;
              (e.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
              e.setVelocityX(i % 2 === 0 ? 40 : -40);
              e.setBounceX(0);
              e.setData('state', 'patrol');
              e.setData('enemyType', 'caiman');
            }
          } else if (cfg.hazardBehavior === 'brazil') {
            // Football brutes — heavier platform enemies that leap toward the player
            cfg.platforms.slice(1, -1).forEach((p, idx) => {
              if (idx % 2 === 0) {
                const e = this.enemies.create(p.x + p.w / 2, p.y - 36, cfg.enemyKey) as Phaser.Physics.Arcade.Sprite;
                const body = e.body as Phaser.Physics.Arcade.Body;
                body.setCollideWorldBounds(true);
                body.setSize(34, 50);
                body.setOffset(8, 8);
                e.setVelocityX(idx % 4 < 2 ? 80 : -80);
                e.setBounceX(1);
                e.setData('state', 'patrol');
                e.setData('enemyType', 'canarinho_brute');
                e.setData('jumpCooldown', Phaser.Math.Between(35, 115));
              }
            });
            // Samba dancers — fast ground hazards that spin-dash through the crowd line
            const numDancers = 10;
            for (let i = 0; i < numDancers; i++) {
              const x = 520 + i * (cfg.worldWidth / numDancers);
              const e = this.enemies.create(x, this.groundY - 28, cfg.enemy2Key!) as Phaser.Physics.Arcade.Sprite;
              (e.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
              e.setVelocityX(i % 2 === 0 ? 95 : -95);
              e.setBounceX(0);
              e.setData('state', 'patrol');
              e.setData('enemyType', 'samba_dancer');
              e.setData('spinTimer', Phaser.Math.Between(45, 120));
            }
          }

          // Portal at end
          const portalSprite = this.add.image(cfg.portalX, cfg.portalY, "portal").setDepth(2);
          this.tweens.add({ targets: portalSprite, alpha: { from: 0.7, to: 1 }, scaleX: { from: 0.95, to: 1.05 }, scaleY: { from: 0.95, to: 1.05 }, duration: 900, yoyo: true, repeat: -1 });

          // Portal position stored for proximity check in update()
          this.portalX = cfg.portalX;
          this.portalY = cfg.portalY;

          // "GOAL" label above portal
          this.add.text(cfg.portalX, cfg.portalY - 56, "¡META!", {
            fontSize: "13px", color: "#ffd700", fontStyle: "bold",
            stroke: "#000", strokeThickness: 3,
          }).setOrigin(0.5).setDepth(3);

          // Hero
          this.hero = this.physics.add.sprite(80, 400, "hero");
          this.hero.setBounce(0.05);
          this.hero.setCollideWorldBounds(true);
          (this.hero.body as Phaser.Physics.Arcade.Body).setGravityY(200);

          // Colliders
          this.physics.add.collider(this.hero, this.platforms);
          this.physics.add.collider(this.enemies, this.platforms);

          // Coin collect
          this.physics.add.overlap(this.hero, this.coins, (_h, coin) => {
            (coin as Phaser.GameObjects.GameObject).destroy();
            this.score += 10;
            this.scoreText.setText(`★ ${this.score}`);
            this.audio?.sfx("coin");
          });

          // Enemy contact — stomp vs. hurt
          this.physics.add.overlap(this.hero, this.enemies, (_h, enemyObj) => {
            const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
            const hBody = this.hero.body as Phaser.Physics.Arcade.Body;
            const eBody = enemy.body as Phaser.Physics.Arcade.Body;
            // Stomp: hero falling AND hero's bottom is above enemy center
            if (hBody.velocity.y > 40 && hBody.bottom < eBody.center.y + 12) {
              this.stompEnemy(enemy);
            } else {
              this.takeDamage();
            }
          });


          // Camera
          this.cameras.main.startFollow(this.hero, true, 0.08, 0.08);

          // HUD
          this.add.text(16, 16, cfg.title, {
            fontSize: "13px", color: "#D4A853", fontStyle: "bold",
            stroke: "#000", strokeThickness: 3,
          }).setScrollFactor(0).setDepth(5);

          this.heartsText = this.add.text(16, 40, "♥ ♥ ♥", {
            fontSize: "18px", color: "#ff4444", fontStyle: "bold",
            stroke: "#000", strokeThickness: 3,
          }).setScrollFactor(0).setDepth(5);

          this.scoreText = this.add.text(W - 110, 16, "★ 0", {
            fontSize: "18px", color: "#fbbf24", fontStyle: "bold",
            stroke: "#000", strokeThickness: 3,
          }).setScrollFactor(0).setDepth(5);


          // Music + intro card
          this.audio = new AudioEngine(cfg.musicNotes, cfg.musicTempo, cfg.musicMelody, cfg.rhythmStyle);
          audioRef.current = this.audio;
          this.audio.start();
          this.showIntro();
        }

        showIntro() {
          this.introActive = true;
          const W = this.scale.width;
          const H = this.scale.height;

          const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0)
            .setScrollFactor(0).setDepth(20);

          const flagObj = this.add.text(W/2, H/2 - 80, this.cfg.flag, { fontSize: '72px' })
            .setOrigin(0.5).setScrollFactor(0).setDepth(21).setAlpha(0);

          const line = this.add.rectangle(W/2, H/2 - 10, 220, 2, 0xD4A853)
            .setScrollFactor(0).setDepth(21).setAlpha(0);

          const parts = this.cfg.title.split(' — ');
          const regionObj = this.add.text(W/2, H/2 + 12, parts[0].toUpperCase(), {
            fontSize: '34px', color: '#D4A853', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 5,
          }).setOrigin(0.5).setScrollFactor(0).setDepth(21).setAlpha(0);

          const placeObj = this.add.text(W/2, H/2 + 54, parts[1] ?? '', {
            fontSize: '18px', color: '#f0e6c8',
            stroke: '#000000', strokeThickness: 3,
          }).setOrigin(0.5).setScrollFactor(0).setDepth(21).setAlpha(0);

          const hintText = this.sys.game.device.input.touch ? 'tap to start' : 'press any key to start';
          const hintObj = this.add.text(W/2, H/2 + 96, hintText, {
            fontSize: '12px', color: '#888888',
          }).setOrigin(0.5).setScrollFactor(0).setDepth(21).setAlpha(0);

          const all = [overlay, flagObj, line, regionObj, placeObj, hintObj];

          const dismiss = () => {
            if (!this.introActive) return;
            this.introActive = false;
            this.tweens.add({
              targets: all, alpha: 0, duration: 400,
              onComplete: () => all.forEach(o => o.destroy()),
            });
          };

          // Fade in overlay then content
          this.tweens.add({ targets: overlay, alpha: 0.9, duration: 500 });
          this.tweens.add({
            targets: [flagObj, line, regionObj, placeObj, hintObj],
            alpha: 1, duration: 700, delay: 300,
            onComplete: () => this.time.delayedCall(2200, dismiss),
          });

          // Any key or tap skips immediately
          this.input.keyboard?.once('keydown', dismiss);
          this.input.once('pointerdown', dismiss);
        }

        stompEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
          enemy.destroy();
          this.hero.setVelocityY(-350); // bounce up
          this.score += 20;
          this.scoreText.setText(`★ ${this.score}`);
          this.audio?.sfx("stomp");
          this.cameras.main.shake(80, 0.008);
          // Particle burst
          const px = enemy.x; const py = enemy.y;
          for (let i = 0; i < 8; i++) {
            const star = this.add.text(px, py, "★", {
              fontSize: "14px", color: "#ffd700",
            }).setDepth(6);
            const angle = (i / 8) * Math.PI * 2;
            this.tweens.add({
              targets: star,
              x: px + Math.cos(angle) * 40,
              y: py + Math.sin(angle) * 40,
              alpha: 0, duration: 400,
              onComplete: () => star.destroy(),
            });
          }
        }

        takeDamage() {
          if (this.invincible || this.ended) return;
          this.lives--;
          this.heartsText.setText(["", "♥", "♥ ♥", "♥ ♥ ♥"][Math.max(0, this.lives)]);
          this.audio?.sfx("hurt");
          this.cameras.main.shake(150, 0.018);
          this.invincible = true;
          this.invincibleTimer = 120; // 2s at 60fps
          if (this.lives <= 0) {
            this.time.delayedCall(200, () => this.showGameOver());
          }
        }

        showGameOver() {
          this.ended = true;
          this.audio?.stop();
          const W = this.scale.width; const H = this.scale.height;
          this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.78).setScrollFactor(0).setDepth(10);
          this.add.text(W/2, H/2 - 90, "GAME OVER", {
            fontSize: "52px", color: "#ff4444", fontStyle: "bold", stroke: "#000", strokeThickness: 6,
          }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
          this.add.text(W/2, H/2 - 30, `Score: ${this.score}`, {
            fontSize: "26px", color: "#fbbf24", stroke: "#000", strokeThickness: 3,
          }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

          restartRef.current = () => { this.audio?.stop(); this.scene.restart(); };
          setEndScreen({ type: 'gameover', nextLevel: null });
        }

        showLevelComplete() {
          this.ended = true;
          try {
            const key = 'el-aventurero-completed';
            const saved: number[] = JSON.parse(localStorage.getItem(key) || '[]');
            if (!saved.includes(level)) localStorage.setItem(key, JSON.stringify([...saved, level]));
          } catch {}
          this.audio?.stopMusic();          // stop the loop immediately
          this.audio?.sfx("complete");      // play jingle (SFX uses already-open ctx)
          setTimeout(() => this.audio?.stop(), 900); // close ctx after jingle finishes

          const W = this.scale.width; const H = this.scale.height;
          this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.78).setScrollFactor(0).setDepth(10);
          this.add.text(W/2, H/2 - 100, "¡NIVEL COMPLETO!", {
            fontSize: "44px", color: "#ffd700", fontStyle: "bold", stroke: "#000", strokeThickness: 6,
          }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
          this.add.text(W/2, H/2 - 45, this.cfg.title, {
            fontSize: "18px", color: "#D4A853", stroke: "#000", strokeThickness: 3,
          }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
          this.add.text(W/2, H/2 + 5, `Score: ${this.score}`, {
            fontSize: "26px", color: "#fbbf24", stroke: "#000", strokeThickness: 3,
          }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

          setEndScreen({ type: 'complete', nextLevel: this.cfg.nextLevel ?? null });
        }

        update() {
          if (this.ended) return;
          if (this.introActive) { keysJustPressed.current.clear(); return; }

          const body = this.hero.body as Phaser.Physics.Arcade.Body;
          const onGround = body.blocked.down;

          // Coyote time: allow jump briefly after leaving platform
          if (this.wasOnGround && !onGround) this.coyoteFrames = 8;
          if (this.coyoteFrames > 0) this.coyoteFrames--;
          this.wasOnGround = onGround;

          // Invincibility flash
          if (this.invincible) {
            this.invincibleTimer--;
            this.hero.setAlpha(Math.floor(this.invincibleTimer / 6) % 2 === 0 ? 0.35 : 1);
            if (this.invincibleTimer <= 0) { this.invincible = false; this.hero.setAlpha(1); }
          }

          // Movement — read from React window listeners (canvas focus-independent)
          const left  = keysHeld.current.has('ArrowLeft')  || keysHeld.current.has('KeyA');
          const right = keysHeld.current.has('ArrowRight') || keysHeld.current.has('KeyD');
          const jump  = keysJustPressed.current.has('ArrowUp') ||
                        keysJustPressed.current.has('Space') ||
                        keysJustPressed.current.has('KeyW');
          keysJustPressed.current.clear();

          if (left)       { this.hero.setVelocityX(-200); this.hero.setFlipX(true); }
          else if (right) { this.hero.setVelocityX(200);  this.hero.setFlipX(false); }
          else            { this.hero.setVelocityX(0); }

          if (jump && (onGround || this.coyoteFrames > 0)) {
            this.hero.setVelocityY(-480);
            this.coyoteFrames = 0;
            this.audio?.sfx("jump");
          }

          // Enemy behavior
          (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach(e => {
            if (!e.active) return;
            const eb = e.body as Phaser.Physics.Arcade.Body;
            const state = e.getData('state') as string;

            if (this.cfg.hazardBehavior === 'dive') {
              // ── Condor: patrol at altitude → dive → return ──
              if (state === 'patrol') {
                if (eb.blocked.left || e.x < 60) e.setVelocityX(80);
                else if (eb.blocked.right || e.x > this.cfg.worldWidth - 60) e.setVelocityX(-80);
                if (Math.abs(eb.velocity.x) < 10) e.setVelocityX(80);
                e.setFlipX(eb.velocity.x < 0);
                const t = (e.getData('diveTimer') as number) - 1;
                e.setData('diveTimer', t);
                if (t <= 0 && Math.abs(e.x - this.hero.x) < 200) {
                  e.setData('state', 'diving');
                  e.setVelocityX(0);
                  e.setVelocityY(420);
                }
              } else if (state === 'diving') {
                if (e.y >= this.hero.y + 24 || e.y > 460) {
                  e.setData('state', 'returning');
                  e.setVelocityY(-280);
                  e.setVelocityX(Math.random() > 0.5 ? 80 : -80);
                }
              } else if (state === 'returning') {
                const homeY = e.getData('homeY') as number;
                if (e.y <= homeY) {
                  e.setY(homeY);
                  e.setVelocityY(0);
                  e.setData('state', 'patrol');
                  e.setData('diveTimer', Phaser.Math.Between(200, 420));
                }
              }
            } else if (this.cfg.hazardBehavior === 'charge') {
              // ── Jaguar: patrol → charge when player is nearby ──
              if (state === 'patrol') {
                if (eb.blocked.left)  e.setVelocityX(90);
                if (eb.blocked.right) e.setVelocityX(-90);
                e.setFlipX(eb.velocity.x < 0);
                if (Math.abs(e.x - this.hero.x) < 240 && Math.abs(e.y - this.hero.y) < 48) {
                  e.setData('state', 'charge');
                  e.setData('chargeTimer', 160);
                  e.setVelocityX(this.hero.x > e.x ? 320 : -320);
                }
              } else if (state === 'charge') {
                e.setFlipX(eb.velocity.x < 0);
                const t = (e.getData('chargeTimer') as number) - 1;
                e.setData('chargeTimer', t);
                if (t <= 0 || eb.blocked.left || eb.blocked.right) {
                  e.setData('state', 'patrol');
                  e.setVelocityX(eb.velocity.x > 0 ? -90 : 90);
                }
              }
            } else if (this.cfg.hazardBehavior === 'carnival') {
              const type = e.getData('enemyType') as string;
              if (type === 'marimonda') {
                // ── Marimonda: bouncy patrol → medium-speed charge ──
                if (state === 'patrol') {
                  if (eb.blocked.left)  e.setVelocityX(95);
                  if (eb.blocked.right) e.setVelocityX(-95);
                  e.setFlipX(eb.velocity.x < 0);
                  if (Math.abs(e.x - this.hero.x) < 185 && Math.abs(e.y - this.hero.y) < 52) {
                    e.setData('state', 'charge');
                    e.setData('chargeTimer', 90);
                    e.setVelocityX(this.hero.x > e.x ? 250 : -250);
                  }
                } else if (state === 'charge') {
                  e.setFlipX(eb.velocity.x < 0);
                  const t = (e.getData('chargeTimer') as number) - 1;
                  e.setData('chargeTimer', t);
                  if (t <= 0 || eb.blocked.left || eb.blocked.right) {
                    e.setData('state', 'patrol');
                    e.setVelocityX(eb.velocity.x > 0 ? -95 : 95);
                  }
                }
              } else if (type === 'torito') {
                // ── Torito: slow patrol → telegraph wind-up → fast charge ──
                if (state === 'patrol') {
                  if (eb.blocked.left)  e.setVelocityX(55);
                  if (eb.blocked.right) e.setVelocityX(-55);
                  e.setFlipX(eb.velocity.x < 0);
                  if (Math.abs(e.x - this.hero.x) < 230 && Math.abs(e.y - this.hero.y) < 60) {
                    e.setData('state', 'windup');
                    e.setData('windupTimer', 52);
                    e.setData('chargeDir', this.hero.x > e.x ? 1 : -1);
                    e.setVelocityX(0);
                  }
                } else if (state === 'windup') {
                  // Stamp effect — oscillate to telegraph the charge
                  const t = (e.getData('windupTimer') as number) - 1;
                  e.setData('windupTimer', t);
                  e.setVelocityX(t % 10 < 5 ? 30 : -30);
                  if (t <= 0) {
                    e.setData('state', 'charge');
                    e.setData('chargeTimer', 110);
                    e.setVelocityX((e.getData('chargeDir') as number) * 500);
                  }
                } else if (state === 'charge') {
                  e.setFlipX(eb.velocity.x < 0);
                  const t = (e.getData('chargeTimer') as number) - 1;
                  e.setData('chargeTimer', t);
                  if (t <= 0 || eb.blocked.left || eb.blocked.right) {
                    e.setData('state', 'patrol');
                    e.setVelocityX(eb.velocity.x > 0 ? -55 : 55);
                  }
                }
              }
            } else if (this.cfg.hazardBehavior === 'tepui') {
              const type = e.getData('enemyType') as string;
              if (type === 'harpy_eagle') {
                // ── Harpy Eagle: fast patrol → aggressive dive ──
                if (state === 'patrol') {
                  if (eb.blocked.left || e.x < 60) e.setVelocityX(95);
                  else if (eb.blocked.right || e.x > this.cfg.worldWidth - 60) e.setVelocityX(-95);
                  if (Math.abs(eb.velocity.x) < 10) e.setVelocityX(95);
                  e.setFlipX(eb.velocity.x < 0);
                  const t = (e.getData('diveTimer') as number) - 1;
                  e.setData('diveTimer', t);
                  if (t <= 0 && Math.abs(e.x - this.hero.x) < 160) {
                    e.setData('state', 'diving');
                    e.setVelocityX(this.hero.x > e.x ? 55 : -55);
                    e.setVelocityY(520);
                  }
                } else if (state === 'diving') {
                  if (e.y >= this.hero.y + 20 || e.y > 450) {
                    e.setData('state', 'returning');
                    e.setVelocityY(-300);
                    e.setVelocityX(Math.random() > 0.5 ? 95 : -95);
                  }
                } else if (state === 'returning') {
                  const homeY = e.getData('homeY') as number;
                  if (e.y <= homeY) {
                    e.setY(homeY); e.setVelocityY(0);
                    e.setData('state', 'patrol');
                    e.setData('diveTimer', Phaser.Math.Between(70, 200));
                  }
                }
              } else if (type === 'caiman') {
                // ── Caiman: slow patrol → sudden fast lunge ──
                if (state === 'patrol') {
                  if (eb.blocked.left)  e.setVelocityX(40);
                  if (eb.blocked.right) e.setVelocityX(-40);
                  e.setFlipX(eb.velocity.x < 0);
                  if (Math.abs(e.x - this.hero.x) < 140 && Math.abs(e.y - this.hero.y) < 55) {
                    e.setData('state', 'lunge');
                    e.setData('lungeTimer', 65);
                    e.setVelocityX(this.hero.x > e.x ? 400 : -400);
                  }
                } else if (state === 'lunge') {
                  e.setFlipX(eb.velocity.x < 0);
                  const t = (e.getData('lungeTimer') as number) - 1;
                  e.setData('lungeTimer', t);
                  if (t <= 0 || eb.blocked.left || eb.blocked.right) {
                    e.setData('state', 'patrol');
                    e.setVelocityX(eb.velocity.x > 0 ? -40 : 40);
                  }
                }
              }
            } else if (this.cfg.hazardBehavior === 'brazil') {
              const type = e.getData('enemyType') as string;
              if (type === 'canarinho_brute') {
                // ── Football brute: patrols narrow platforms, then jumps hard toward the player ──
                if (state === 'patrol') {
                  if (eb.blocked.left)  e.setVelocityX(85);
                  if (eb.blocked.right) e.setVelocityX(-85);
                  e.setFlipX(eb.velocity.x < 0);
                  const cooldown = (e.getData('jumpCooldown') as number) - 1;
                  e.setData('jumpCooldown', cooldown);
                  if (cooldown <= 0 && eb.blocked.down && Math.abs(e.x - this.hero.x) < 260 && Math.abs(e.y - this.hero.y) < 115) {
                    e.setData('state', 'leap');
                    e.setData('leapTimer', 82);
                    e.setVelocityX(this.hero.x > e.x ? 255 : -255);
                    e.setVelocityY(-500);
                    e.setScale(1.06);
                  }
                } else if (state === 'leap') {
                  e.setFlipX(eb.velocity.x < 0);
                  const t = (e.getData('leapTimer') as number) - 1;
                  e.setData('leapTimer', t);
                  if ((eb.blocked.down && t < 58) || t <= 0 || eb.blocked.left || eb.blocked.right) {
                    this.cameras.main.shake(70, 0.006);
                    e.setScale(1);
                    e.setData('state', 'patrol');
                    e.setData('jumpCooldown', Phaser.Math.Between(45, 110));
                    e.setVelocityX(eb.velocity.x > 0 ? -95 : 95);
                  }
                }
              } else if (type === 'samba_dancer') {
                // ── Carnival dancer: fast patrol → spinning dash with a short telegraph ──
                if (state === 'patrol') {
                  if (eb.blocked.left)  e.setVelocityX(95);
                  if (eb.blocked.right) e.setVelocityX(-95);
                  e.setFlipX(eb.velocity.x < 0);
                  e.angle += 4;
                  const t = (e.getData('spinTimer') as number) - 1;
                  e.setData('spinTimer', t);
                  if (t <= 0 && Math.abs(e.x - this.hero.x) < 230 && Math.abs(e.y - this.hero.y) < 70) {
                    e.setData('state', 'windup');
                    e.setData('windupTimer', 28);
                    e.setData('chargeDir', this.hero.x > e.x ? 1 : -1);
                    e.setVelocityX(0);
                  }
                } else if (state === 'windup') {
                  const t = (e.getData('windupTimer') as number) - 1;
                  e.setData('windupTimer', t);
                  e.angle += 18;
                  e.setAlpha(t % 8 < 4 ? 0.55 : 1);
                  if (t <= 0) {
                    e.setAlpha(1);
                    e.setData('state', 'dash');
                    e.setData('dashTimer', 80);
                    e.setVelocityX((e.getData('chargeDir') as number) * 430);
                  }
                } else if (state === 'dash') {
                  e.angle += 24;
                  e.setFlipX(eb.velocity.x < 0);
                  const t = (e.getData('dashTimer') as number) - 1;
                  e.setData('dashTimer', t);
                  if (t <= 0 || eb.blocked.left || eb.blocked.right) {
                    e.setAngle(0);
                    e.setData('state', 'patrol');
                    e.setData('spinTimer', Phaser.Math.Between(55, 130));
                    e.setVelocityX(eb.velocity.x > 0 ? -95 : 95);
                  }
                }
              }
            }
          });

          // Portal proximity check
          if (Math.abs(this.hero.x - this.portalX) < 36 && Math.abs(this.hero.y - this.portalY) < 48) {
            this.showLevelComplete();
          }

          // Fall into pit → lose a life and respawn
          if (this.hero.y > this.groundY + 80) {
            this.hero.setPosition(80, 400);
            this.hero.setVelocity(0, 0);
            this.takeDamage();
          }
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: 960,
        height: 520,
        parent: containerRef.current!,
        backgroundColor: "#030814",
        physics: { default: "arcade", arcade: { gravity: { x: 0, y: 400 }, debug: false } },
        scene: GameScene,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      });
    });

    return () => {
      audioRef.current?.stop();
      audioRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-screen h-dvh bg-black flex flex-col">
      <div className="flex-1 overflow-hidden relative" ref={containerRef}>
        {endScreen && (
          <div className="absolute inset-0 z-20 flex items-end justify-center pb-24">
            <div className="flex gap-4">
              {endScreen.type === 'gameover' && (
                <button
                  className="px-6 py-3 rounded-xl font-black text-sm tracking-widest active:scale-95 transition-transform"
                  style={{ background: '#4ade8033', border: '2px solid #4ade80', color: '#4ade80' }}
                  onClick={() => { setEndScreen(null); restartRef.current(); }}
                >↺ RETRY</button>
              )}
              {endScreen.type === 'complete' && endScreen.nextLevel && (
                <button
                  className="px-6 py-3 rounded-xl font-black text-sm tracking-widest active:scale-95 transition-transform"
                  style={{ background: '#4ade8033', border: '2px solid #4ade80', color: '#4ade80' }}
                  onClick={() => { audioRef.current?.stop(); router.push(`/game?level=${endScreen.nextLevel}`); }}
                >▶ NEXT LEVEL</button>
              )}
              <button
                className="px-6 py-3 rounded-xl font-black text-sm tracking-widest active:scale-95 transition-transform"
                style={{ background: '#60a5fa33', border: '2px solid #60a5fa', color: '#60a5fa' }}
                onClick={() => { audioRef.current?.stop(); router.push('/'); }}
              >⌂ MENU</button>
            </div>
          </div>
        )}
        {isTouchDevice && (
          <>
            <div className="absolute bottom-4 left-4 flex gap-2 z-10">
              <button
                className="w-16 h-14 rounded-xl bg-black/50 border border-white/20 text-white text-xl font-bold active:bg-white/20 select-none touch-none"
                onTouchStart={(e) => { e.preventDefault(); keysHeld.current.add('ArrowLeft'); }}
                onTouchEnd={(e) => { e.preventDefault(); keysHeld.current.delete('ArrowLeft'); }}
                onTouchCancel={(e) => { e.preventDefault(); keysHeld.current.delete('ArrowLeft'); }}
              >←</button>
              <button
                className="w-16 h-14 rounded-xl bg-black/50 border border-white/20 text-white text-xl font-bold active:bg-white/20 select-none touch-none"
                onTouchStart={(e) => { e.preventDefault(); keysHeld.current.add('ArrowRight'); }}
                onTouchEnd={(e) => { e.preventDefault(); keysHeld.current.delete('ArrowRight'); }}
                onTouchCancel={(e) => { e.preventDefault(); keysHeld.current.delete('ArrowRight'); }}
              >→</button>
            </div>
            <div className="absolute bottom-4 right-4 flex items-center gap-3 z-10">
              <button
                className="text-slate-400 text-xs font-mono px-2 py-1"
                onClick={() => { audioRef.current?.stop(); router.push("/"); }}
              >MENU</button>
              <button
                className="w-24 h-14 rounded-xl bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 font-bold text-sm active:bg-yellow-500/50 select-none touch-none"
                onTouchStart={(e) => { e.preventDefault(); keysJustPressed.current.add('Space'); }}
                onTouchEnd={(e) => { e.preventDefault(); }}
                onTouchCancel={(e) => { e.preventDefault(); }}
              >JUMP</button>
            </div>
          </>
        )}
      </div>
      {!isTouchDevice && (
        <div className="flex items-center justify-between px-4 py-2 bg-black/70 z-10 pointer-events-none">
          <span className="flex-1 text-center text-slate-400 text-xs font-mono">← → move  ·  ↑ / Space jump</span>
          <button
            className="text-slate-300 text-xs font-bold font-mono hover:text-yellow-500 pointer-events-auto"
            onClick={() => { audioRef.current?.stop(); router.push("/"); }}
          >MENU →</button>
        </div>
      )}
    </div>
  );
}

// Reads search params and remounts GameInstance fresh on every level change via key=
function GameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const level = Number(searchParams.get("level") || "1");
  return <GameInstance key={level} level={level} router={router} />;
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-dvh bg-black flex items-center justify-center text-yellow-400 font-mono text-xl">
        Cargando…
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}
