/**
 * js/game.js
 * Serce gry 2D: „Kozminski Escape: Polowanie na ECTS”
 * Akademia Leona Koźmińskiego (ALK) w Warszawie
 *
 * Implementuje:
 * 1. Układ kampusu na Canvasie (Aula A, Biblioteka, Dziekanat, Lab Komputerowy, Patio ALK 🌿)
 * 2. Gracz (Student) – ruch wektorowy, sprint ze staminą, tarcza, turbo-kawa
 * 3. Przeciwnik (Egzaminator) – zbalansowany pościg, dymki z tekstami akademickimi
 * 4. SYSTEM ARTYLERII AKADEMICKIEJ (Klawisz R / Przycisk HUD / Dotyk):
 *    Odrzuca wykładowcę do najdalszego narożnika/sali kampusu i ogłusza go na 4.5s!
 * 5. Przedmioty – ECTS, Kawa z Patio, Gemini AI, Legitymacja ALK
 * 6. Pełna integracja z modułem audio SoundSystem.play(...)
 */

(() => {
  'use strict';

  // =========================================================================
  // 1. STAŁE, KONFIGURACJA I ARCHITEKTURA KAMPUSU ALK
  // =========================================================================
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 540;
  const TARGET_ECTS = 30;

  // Zbalansowane prędkości (poprawiona przystępność po zgłoszeniach graczy)
  const PLAYER_BASE_SPEED = 3.3;
  const PLAYER_SPRINT_SPEED = 5.6;
  const PROFESSOR_BASE_SPEED = 2.05; // Przyjaźniejsza prędkość bazowa
  const MAX_STAMINA = 100;
  const STAMINA_DRAIN_RATE = 28;    // zużycie staminy na sekundę sprintu
  const STAMINA_RECOVERY_RATE = 20; // szybsza regeneracja staminy
  const COFFEE_BOOST_DURATION = 5.0; // 5 sekund turbo
  const GEMINI_FREEZE_DURATION = 3.5; // 3.5 sekundy paraliżu profesora
  const ARTILLERY_STUN_DURATION = 4.5; // 4.5 sekundy ogłuszenia po trafieniu artylerią
  const INITIAL_ARTILLERY_CHARGES = 3;

  // Kwestie wypowiadane przez profesora
  const PROFESSOR_QUOTES = [
    '„A gdzie przypis harwardzki?!”',
    '„Ten bilans się nie zamyka!”',
    '„Widzę Pana we wrześniu!”',
    '„USOS właśnie zamknął protokół!”',
    '„Czy ten esej pisał Pan, czy ChatGPT?!”'
  ];

  // Kwestie po uderzeniu artylerią
  const ARTILLERY_QUOTES = [
    '„Co to za nalot?! Moje konspekty z ekonometrii!”',
    '„Artyleria Dziekańska?! Panie Rektorze, składam sprzeciw!”',
    '„Kto wystrzelił te segregatory?! Wszystkie oceny 2.0 mi się pomieszały!”',
    '„Zaraz zwołam nadzwyczajną komisję za ten ostrzał!”'
  ];

  // Strefy kampusu z nazwami i współrzędnymi
  const CAMPUS_ZONES = [
    { id: 'aula', name: 'Aula A', x: 20, y: 20, w: 260, h: 180, color: '#091c36', label: 'AULA A' },
    { id: 'dziekanat', name: 'Dziekanat', x: 520, y: 20, w: 260, h: 180, color: '#092140', label: 'DZIEKANAT' },
    { id: 'patio', name: 'Patio ALK 🌿', x: 260, y: 170, w: 280, h: 200, color: '#063a23', label: 'PATIO ALK 🌿' },
    { id: 'biblioteka', name: 'Biblioteka', x: 20, y: 340, w: 260, h: 180, color: '#0a1a30', label: 'BIBLIOTEKA' },
    { id: 'lab', name: 'Lab Komputerowy', x: 520, y: 340, w: 260, h: 180, color: '#081d38', label: 'LAB KOMPUTEROWY' }
  ];

  // Cztery bezpieczne bazy artyleryjskie (punkty odrzucenia wykładowcy)
  const ARTILLERY_OUTPOSTS = [
    { x: 90, y: 70, name: 'Auli A' },
    { x: 700, y: 70, name: 'Dziekanatu' },
    { x: 90, y: 460, name: 'Biblioteki' },
    { x: 700, y: 460, name: 'Labu Komputerowego' }
  ];

  // Ściany budynku kampusu (zostawiają szerokie wejścia/korytarze)
  const WALLS = [
    // Aula A (lewy górny róg)
    { x: 20, y: 20, w: 260, h: 14 },
    { x: 20, y: 20, w: 14, h: 180 },
    { x: 20, y: 186, w: 170, h: 14 },
    { x: 266, y: 20, w: 14, h: 100 },

    // Dziekanat (prawy górny róg)
    { x: 520, y: 20, w: 260, h: 14 },
    { x: 766, y: 20, w: 14, h: 180 },
    { x: 610, y: 186, w: 170, h: 14 },
    { x: 520, y: 20, w: 14, h: 100 },

    // Biblioteka (lewy dolny róg)
    { x: 20, y: 340, w: 170, h: 14 },
    { x: 20, y: 340, w: 14, h: 180 },
    { x: 20, y: 506, w: 260, h: 14 },
    { x: 266, y: 420, w: 14, h: 100 },

    // Lab Komputerowy (prawy dolny róg)
    { x: 610, y: 340, w: 170, h: 14 },
    { x: 766, y: 340, w: 14, h: 180 },
    { x: 520, y: 506, w: 260, h: 14 },
    { x: 520, y: 420, w: 14, h: 100 },

    // Meble sal
    { x: 90, y: 80, w: 110, h: 22 },
    { x: 90, y: 125, w: 110, h: 22 },
    { x: 600, y: 90, w: 100, h: 40 },
    { x: 80, y: 400, w: 130, h: 24 },
    { x: 80, y: 450, w: 130, h: 24 },
    { x: 590, y: 400, w: 110, h: 26 },
    { x: 590, y: 450, w: 110, h: 26 }
  ];

  // Drzewka na Patio ALK
  const PATIO_TREES = [
    { x: 310, y: 220, r: 18 },
    { x: 490, y: 220, r: 18 },
    { x: 310, y: 320, r: 18 },
    { x: 490, y: 320, r: 18 }
  ];

  // =========================================================================
  // 2. REFERENCJE DOM
  // =========================================================================
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  // HUD
  const ectsCounter = document.getElementById('ects-counter');
  const ectsProgress = document.getElementById('ects-progress');
  const staminaCounter = document.getElementById('stamina-counter');
  const staminaBar = document.getElementById('stamina-bar');
  const campusStatus = document.getElementById('campus-status');
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const audioIcon = document.getElementById('audio-icon');
  const btnPauseToggle = document.getElementById('btn-pause-toggle');
  const pauseIcon = document.getElementById('pause-icon');

  // Przycisk i licznik Artylerii w HUD
  const btnArtillery = document.getElementById('btn-artillery');
  const artilleryChargesBadge = document.getElementById('artillery-charges');

  // Przycisk i licznik Artylerii w kontrolkach dotykowych
  const touchArtillery = document.getElementById('touch-artillery');
  const touchArtilleryChargesBadge = document.getElementById('touch-artillery-charges');

  // Dymek profesora
  const professorBubble = document.getElementById('professor-bubble');
  const bubbleText = document.getElementById('bubble-text');

  // Ekrany modalne
  const modalStart = document.getElementById('modal-start');
  const modalGameOver = document.getElementById('modal-game-over');
  const modalVictory = document.getElementById('modal-victory');
  const btnStartGame = document.getElementById('btn-start-game');
  const btnRestartGame = document.getElementById('btn-restart-game');
  const btnPlayAgain = document.getElementById('btn-play-again');

  // Statystyki
  const failEctsCount = document.getElementById('fail-ects-count');
  const failSurvivalTime = document.getElementById('fail-survival-time');
  const failLocationName = document.getElementById('fail-location-name');
  const winTimeCount = document.getElementById('win-time-count');
  const winCoffeeCount = document.getElementById('win-coffee-count');

  // Kontrolki dotykowe
  const touchUp = document.getElementById('touch-up');
  const touchDown = document.getElementById('touch-down');
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');
  const touchSprint = document.getElementById('touch-sprint');

  // =========================================================================
  // 3. STAN ROZGRYWKI (STATE)
  // =========================================================================
  let gameState = 'START';
  let ects = 0;
  let stamina = MAX_STAMINA;
  let coffeesCollected = 0;
  let artilleryCharges = INITIAL_ARTILLERY_CHARGES;
  let startTime = 0;
  let elapsedTime = 0;
  let currentZone = 'Patio ALK 🌿';
  let quoteTimer = 3.0;
  let bubbleHideTimer = 0;

  // Efekty wizualne wybuchu artylerii
  let blastEffects = [];
  let screenBannerText = '';
  let screenBannerTimer = 0;

  // Wejście klawiatury i dotyku
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false
  };

  // Gracz (Student)
  const player = {
    x: 400,
    y: 270,
    radius: 14,
    speed: PLAYER_BASE_SPEED,
    hasShield: false,
    coffeeTimer: 0,
    direction: 'down',
    walkCycle: 0
  };

  // Przeciwnik (Wykładowca / Egzaminator)
  const professor = {
    x: 90,
    y: 70,
    radius: 16,
    speed: PROFESSOR_BASE_SPEED,
    freezeTimer: 0,
    direction: 'down',
    walkCycle: 0,
    quoteIndex: 0
  };

  let items = [];

  // =========================================================================
  // 4. BEZPIECZNE WYWOŁYWANIE DŹWIĘKÓW (SoundSystem)
  // =========================================================================
  function playSound(type) {
    if (window.SoundSystem && typeof window.SoundSystem.play === 'function') {
      window.SoundSystem.play(type);
    } else if (window.gameAudio) {
      if (type === 'artillery') window.gameAudio.playAlert();
      else if (type === 'ects') window.gameAudio.playCollectECTS();
      else if (type === 'coffee') window.gameAudio.playCoffee();
      else if (type === 'shield') window.gameAudio.playShield();
      else if (type === 'freeze') window.gameAudio.playAlert();
      else if (type === 'hit') window.gameAudio.playDefeat();
      else if (type === 'win') window.gameAudio.playVictory();
    }
  }

  function initAudioOnUserGesture() {
    if (window.SoundSystem && typeof window.SoundSystem.init === 'function') {
      window.SoundSystem.init();
    }
  }

  // =========================================================================
  // 5. OBSŁUGA KOMIKSOWEGO DYMKA PROFESORA
  // =========================================================================
  function triggerProfessorQuote(specificText = null) {
    let quote = specificText;
    if (!quote) {
      quote = PROFESSOR_QUOTES[professor.quoteIndex % PROFESSOR_QUOTES.length];
      professor.quoteIndex++;
    }

    bubbleText.textContent = quote;
    professorBubble.classList.remove('bubble--hidden');
    bubbleHideTimer = 4.0;
  }

  function updateProfessorBubble(delta) {
    if (bubbleHideTimer > 0) {
      bubbleHideTimer -= delta;
      if (bubbleHideTimer <= 0) {
        professorBubble.classList.add('bubble--hidden');
      }
    }
  }

  // =========================================================================
  // 6. SYSTEM KOLIZJI ZE ŚCIANAMI
  // =========================================================================
  function isCollidingWithWalls(x, y, radius) {
    if (
      x - radius < 10 ||
      x + radius > CANVAS_WIDTH - 10 ||
      y - radius < 10 ||
      y + radius > CANVAS_HEIGHT - 10
    ) {
      return true;
    }

    for (let i = 0; i < WALLS.length; i++) {
      const w = WALLS[i];
      const closestX = Math.max(w.x, Math.min(x, w.x + w.w));
      const closestY = Math.max(w.y, Math.min(y, w.y + w.h));
      const distX = x - closestX;
      const distY = y - closestY;
      if (distX * distX + distY * distY < radius * radius) {
        return true;
      }
    }

    for (let i = 0; i < PATIO_TREES.length; i++) {
      const tree = PATIO_TREES[i];
      const dist = Math.hypot(x - tree.x, y - tree.y);
      if (dist < radius + tree.r - 2) {
        return true;
      }
    }

    return false;
  }

  // =========================================================================
  // 7. SYSTEM ARTYLERII DZIEKAŃSKIEJ (RATUNEK PRZED WYKŁADOWCĄ)
  // =========================================================================
  function fireArtillery() {
    if (gameState !== 'PLAYING') return;

    if (artilleryCharges <= 0) {
      // Brak amunicji - kliknięcie z dźwiękiem ostrzegawczym
      playSound('freeze');
      screenBannerText = '⚠️ Brak ładunków artylerii! Zbieraj ECTS-y!';
      screenBannerTimer = 2.0;
      return;
    }

    artilleryCharges--;
    updateArtilleryUI();

    // 1. Dźwięk artylerii (świst + eksplozja)
    playSound('artillery');

    // 2. Pozycja wybuchu na starym miejscu profesora
    const oldProfX = professor.x;
    const oldProfY = professor.y;

    // Stwórz cząsteczki eksplozji na starym miejscu
    createBlastEffect(oldProfX, oldProfY);

    // 3. Znajdź najdalszą bazę kampusu od studenta (żeby dać mu maksimum przestrzeni)
    let maxDistance = -1;
    let targetOutpost = ARTILLERY_OUTPOSTS[0];

    for (let i = 0; i < ARTILLERY_OUTPOSTS.length; i++) {
      const outpost = ARTILLERY_OUTPOSTS[i];
      const d = Math.hypot(outpost.x - player.x, outpost.y - player.y);
      if (d > maxDistance) {
        maxDistance = d;
        targetOutpost = outpost;
      }
    }

    // 4. Teleportacja i uziemienie profesora
    professor.x = targetOutpost.x;
    professor.y = targetOutpost.y;
    professor.freezeTimer = ARTILLERY_STUN_DURATION; // Uziemiony na 4.5 sekundy!

    // Cząsteczki upadku na nowe miejsce
    createBlastEffect(professor.x, professor.y, '#f59e0b');

    // 5. Komiksowy krzyk profesora
    const randomQuote = ARTILLERY_QUOTES[Math.floor(Math.random() * ARTILLERY_QUOTES.length)];
    triggerProfessorQuote(randomQuote);

    // 6. Baner informacyjny na ekranie
    screenBannerText = `🎯 SALWA ARTYLERII! Wykładowca odrzucony do ${targetOutpost.name}!`;
    screenBannerTimer = 3.2;
  }

  function createBlastEffect(x, y, tintColor = '#ef4444') {
    // Fala uderzeniowa
    blastEffects.push({
      type: 'shockwave',
      x: x,
      y: y,
      radius: 5,
      maxRadius: 55,
      alpha: 1.0,
      color: tintColor
    });

    // Rozprysk kartek egzaminacyjnych i iskier
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 90;
      blastEffects.push({
        type: 'particle',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        isPaper: Math.random() > 0.4
      });
    }
  }

  function updateBlastEffects(delta) {
    for (let i = blastEffects.length - 1; i >= 0; i--) {
      const fx = blastEffects[i];
      if (fx.type === 'shockwave') {
        fx.radius += delta * 120;
        fx.alpha = Math.max(0, 1 - fx.radius / fx.maxRadius);
        if (fx.radius >= fx.maxRadius) {
          blastEffects.splice(i, 1);
        }
      } else if (fx.type === 'particle') {
        fx.x += fx.vx * delta;
        fx.y += fx.vy * delta;
        fx.vx *= 0.94;
        fx.vy *= 0.94;
        fx.life -= delta;
        if (fx.life <= 0) {
          blastEffects.splice(i, 1);
        }
      }
    }

    if (screenBannerTimer > 0) {
      screenBannerTimer -= delta;
    }
  }

  function updateArtilleryUI() {
    if (artilleryChargesBadge) {
      artilleryChargesBadge.textContent = artilleryCharges;
    }
    if (touchArtilleryChargesBadge) {
      touchArtilleryChargesBadge.textContent = artilleryCharges;
    }

    if (btnArtillery) {
      if (artilleryCharges <= 0) {
        btnArtillery.classList.add('disabled');
        btnArtillery.title = 'Brak ładunków artylerii!';
      } else {
        btnArtillery.classList.remove('disabled');
        btnArtillery.title = `Artyleria akademicka (${artilleryCharges} ładunki, Klawisz R)`;
      }
    }

    if (touchArtillery) {
      if (artilleryCharges <= 0) {
        touchArtillery.disabled = true;
      } else {
        touchArtillery.disabled = false;
      }
    }
  }

  // =========================================================================
  // 8. GENEROWANIE PRZEDMIOTÓW (SPAWN POZA ŚCIANAMI)
  // =========================================================================
  function spawnItem(type) {
    let valid = false;
    let x = 0;
    let y = 0;
    let attempts = 0;

    while (!valid && attempts < 80) {
      attempts++;
      x = 35 + Math.random() * (CANVAS_WIDTH - 70);
      y = 35 + Math.random() * (CANVAS_HEIGHT - 70);

      if (!isCollidingWithWalls(x, y, 16)) {
        const distToPlayer = Math.hypot(x - player.x, y - player.y);
        if (distToPlayer > 45) {
          valid = true;
        }
      }
    }

    if (valid) {
      items.push({
        type: type,
        x: x,
        y: y,
        radius: 12,
        bobPhase: Math.random() * Math.PI * 2
      });
    }
  }

  function initCampusItems() {
    items = [];
    for (let i = 0; i < 8; i++) spawnItem('ects');
    spawnItem('coffee');
    spawnItem('coffee');
    spawnItem('gemini');
    spawnItem('shield');
  }

  function updateCampusZone() {
    let foundZone = 'Korytarz Kampusu';
    for (let i = 0; i < CAMPUS_ZONES.length; i++) {
      const z = CAMPUS_ZONES[i];
      if (player.x >= z.x && player.x <= z.x + z.w && player.y >= z.y && player.y <= z.y + z.h) {
        foundZone = z.label;
        break;
      }
    }

    if (currentZone !== foundZone) {
      currentZone = foundZone;
      campusStatus.textContent = foundZone;
    }
  }

  // =========================================================================
  // 9. LOGIKA STANU GRY (RESET, PORAŻKA, ZWYCIĘSTWO)
  // =========================================================================
  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function resetGame() {
    ects = 0;
    stamina = MAX_STAMINA;
    coffeesCollected = 0;
    artilleryCharges = INITIAL_ARTILLERY_CHARGES;
    blastEffects = [];
    screenBannerTimer = 0;

    player.x = 400;
    player.y = 270;
    player.hasShield = false;
    player.coffeeTimer = 0;

    professor.x = 90;
    professor.y = 70;
    professor.freezeTimer = 0;
    professor.quoteIndex = 0;

    startTime = Date.now();
    elapsedTime = 0;
    quoteTimer = 2.5;
    bubbleHideTimer = 0;

    initCampusItems();
    updateHUD();
    updateArtilleryUI();

    modalStart.classList.add('modal-hidden');
    modalStart.classList.remove('modal-active');
    modalGameOver.classList.add('modal-hidden');
    modalGameOver.classList.remove('modal-active');
    modalVictory.classList.add('modal-hidden');
    modalVictory.classList.remove('modal-active');

    gameState = 'PLAYING';
    triggerProfessorQuote('„Zaczynamy sesję! Egzamin potrwa do skutku!”');
  }

  function triggerGameOver() {
    gameState = 'GAMEOVER';
    playSound('hit');

    failEctsCount.textContent = `${ects} / ${TARGET_ECTS}`;
    failSurvivalTime.textContent = formatTime(elapsedTime);
    failLocationName.textContent = currentZone;

    modalGameOver.classList.remove('modal-hidden');
    modalGameOver.classList.add('modal-active');
    professorBubble.classList.add('bubble--hidden');
  }

  function triggerVictory() {
    gameState = 'VICTORY';
    playSound('win');

    winTimeCount.textContent = formatTime(elapsedTime);
    winCoffeeCount.textContent = coffeesCollected;

    modalVictory.classList.remove('modal-hidden');
    modalVictory.classList.add('modal-active');
    professorBubble.classList.add('bubble--hidden');
  }

  function updateHUD() {
    ectsCounter.textContent = ects;
    const pct = Math.min(100, Math.round((ects / TARGET_ECTS) * 100));
    ectsProgress.style.width = `${pct}%`;

    staminaCounter.textContent = `${Math.round(stamina)}%`;
    staminaBar.style.width = `${stamina}%`;
  }

  // =========================================================================
  // 10. GŁÓWNA AKTUALIZACJA FIZYKI (UPDATE)
  // =========================================================================
  function update(delta) {
    if (gameState !== 'PLAYING') return;

    elapsedTime = Date.now() - startTime;
    updateProfessorBubble(delta);
    updateBlastEffects(delta);

    quoteTimer -= delta;
    if (quoteTimer <= 0) {
      triggerProfessorQuote();
      quoteTimer = 8.0 + Math.random() * 5.0;
    }

    // A. Ruch gracza i sprint
    let isSprinting = false;
    if (input.sprint && stamina > 0) {
      isSprinting = true;
      stamina = Math.max(0, stamina - STAMINA_DRAIN_RATE * delta);
    } else {
      stamina = Math.min(MAX_STAMINA, stamina + STAMINA_RECOVERY_RATE * delta);
    }

    let turboMultiplier = 1.0;
    if (player.coffeeTimer > 0) {
      player.coffeeTimer -= delta;
      turboMultiplier = 1.45;
      isSprinting = true;
    }

    const currentSpeed = (isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_BASE_SPEED) * turboMultiplier;

    let vx = 0;
    let vy = 0;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    if (vx !== 0 || vy !== 0) {
      player.walkCycle += delta * 14;
      if (Math.abs(vx) > Math.abs(vy)) {
        player.direction = vx > 0 ? 'right' : 'left';
      } else {
        player.direction = vy > 0 ? 'down' : 'up';
      }
    }

    const nextPlayerX = player.x + vx * currentSpeed;
    const nextPlayerY = player.y + vy * currentSpeed;

    if (!isCollidingWithWalls(nextPlayerX, player.y, player.radius)) {
      player.x = nextPlayerX;
    }
    if (!isCollidingWithWalls(player.x, nextPlayerY, player.radius)) {
      player.y = nextPlayerY;
    }

    updateCampusZone();

    // B. Przeciwnik (Wykładowca)
    if (professor.freezeTimer > 0) {
      professor.freezeTimer -= delta;
      // Podczas ogłuszenia/zamrożenia nie rusza się
    } else {
      const dx = player.x - professor.x;
      const dy = player.y - professor.y;
      const angle = Math.atan2(dy, dx);

      // Skalowanie prędkości z ECTS
      const ectsSpeedBonus = (ects / TARGET_ECTS) * 1.35;
      const currentProfSpeed = PROFESSOR_BASE_SPEED + ectsSpeedBonus;

      let pvx = Math.cos(angle) * currentProfSpeed;
      let pvy = Math.sin(angle) * currentProfSpeed;

      professor.walkCycle += delta * 8;
      if (Math.abs(pvx) > Math.abs(pvy)) {
        professor.direction = pvx > 0 ? 'right' : 'left';
      } else {
        professor.direction = pvy > 0 ? 'down' : 'up';
      }

      const nextProfX = professor.x + pvx;
      const nextProfY = professor.y + pvy;

      let moved = false;
      if (!isCollidingWithWalls(nextProfX, professor.y, professor.radius)) {
        professor.x = nextProfX;
        moved = true;
      }
      if (!isCollidingWithWalls(professor.x, nextProfY, professor.radius)) {
        professor.y = nextProfY;
        moved = true;
      }

      if (!moved) {
        if (!isCollidingWithWalls(professor.x + (Math.random() - 0.5) * 4, professor.y + 3, professor.radius)) {
          professor.y += 2;
        } else {
          professor.x += 2;
        }
      }
    }

    // C. Przedmioty
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const dist = Math.hypot(player.x - item.x, player.y - item.y);

      if (dist < player.radius + item.radius + 3) {
        if (item.type === 'ects') {
          ects++;
          playSound('ects');

          // Bonus: co 10 ECTS zyskujesz dodatkowy ładunek Artylerii!
          if (ects === 10 || ects === 20) {
            artilleryCharges++;
            updateArtilleryUI();
            screenBannerText = '🎉 BONUS! Otrzymałeś dodatkowy ładunek Artylerii!';
            screenBannerTimer = 3.0;
          }

          if (ects >= TARGET_ECTS) {
            triggerVictory();
            return;
          }
          spawnItem('ects');
          if (Math.random() < 0.25) spawnItem('coffee');
          if (Math.random() < 0.15 && professor.freezeTimer <= 0) spawnItem('gemini');
        } else if (item.type === 'coffee') {
          coffeesCollected++;
          player.coffeeTimer = COFFEE_BOOST_DURATION;
          stamina = MAX_STAMINA;
          playSound('coffee');
          triggerProfessorQuote('„Kawa z Patio?! To nie obniży progu zaliczenia!”');
        } else if (item.type === 'gemini') {
          professor.freezeTimer = GEMINI_FREEZE_DURATION;
          playSound('freeze');
          triggerProfessorQuote('„Czy ten esej pisał Pan, czy ChatGPT?!”');
        } else if (item.type === 'shield') {
          player.hasShield = true;
          playSound('shield');
        }

        items.splice(i, 1);
      }
    }

    // D. Kolizja z profesorem
    const distToProf = Math.hypot(player.x - professor.x, player.y - professor.y);
    if (distToProf < player.radius + professor.radius) {
      if (player.hasShield) {
        player.hasShield = false;
        playSound('shield');
        triggerProfessorQuote('„Legitymacja podstemplowana, ale widzę Pana we wrześniu!”');

        const pushAngle = Math.atan2(professor.y - player.y, professor.x - player.x);
        professor.x += Math.cos(pushAngle) * 90;
        professor.y += Math.sin(pushAngle) * 90;
      } else {
        triggerGameOver();
        return;
      }
    }

    updateHUD();
  }

  // =========================================================================
  // 11. RYSOWANIE KAMPUSU I EFEKTÓW ARTYLERII (RENDER)
  // =========================================================================
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Podłoże
    ctx.fillStyle = '#0a1128';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Kafelkowanie korytarzy
    ctx.strokeStyle = 'rgba(0, 75, 135, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Sale kampusu
    for (let i = 0; i < CAMPUS_ZONES.length; i++) {
      const z = CAMPUS_ZONES[i];
      ctx.fillStyle = z.color;
      ctx.fillRect(z.x, z.y, z.w, z.h);

      ctx.strokeStyle = z.id === 'patio' ? '#10b981' : '#004b87';
      ctx.lineWidth = z.id === 'patio' ? 2 : 1;
      ctx.strokeRect(z.x, z.y, z.w, z.h);

      if (z.id === 'patio') {
        ctx.fillStyle = '#0a422a';
        ctx.fillRect(z.x + 8, z.y + 8, z.w - 16, z.h - 16);

        ctx.fillStyle = '#1e382b';
        ctx.fillRect(z.x + z.w / 2 - 20, z.y + 8, 40, z.h - 16);
        ctx.fillRect(z.x + 8, z.y + z.h / 2 - 20, z.w - 16, 40);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = '700 15px "Chakra Petch", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PATIO ALK 🌿', z.x + z.w / 2, z.y + z.h / 2 + 5);
      } else {
        ctx.fillStyle = 'rgba(242, 169, 0, 0.4)';
        ctx.font = '700 13px "Chakra Petch", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(z.label, z.x + 18, z.y + 24);
      }
    }

    // Ściany
    ctx.fillStyle = '#002244';
    ctx.strokeStyle = '#f2a900';
    ctx.lineWidth = 2;

    for (let i = 0; i < WALLS.length; i++) {
      const w = WALLS[i];
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeRect(w.x, w.y, w.w, w.h);

      ctx.fillStyle = '#ffc740';
      ctx.fillRect(w.x + 2, w.y + 2, Math.max(2, w.w - 4), Math.min(3, w.h - 4));
      ctx.fillStyle = '#002244';
    }

    // Drzewka na Patio
    for (let i = 0; i < PATIO_TREES.length; i++) {
      const t = PATIO_TREES[i];
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(t.x + 2, t.y + 4, t.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, t.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Przedmioty
    const timeNow = Date.now() * 0.005;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const bob = Math.sin(timeNow + it.bobPhase) * 3;

      ctx.save();
      ctx.translate(it.x, it.y + bob);

      if (it.type === 'ects') {
        ctx.fillStyle = '#f2a900';
        ctx.shadowColor = '#ffc740';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(-9, -11, 18, 22, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#002244';
        ctx.font = 'bold 8px "Chakra Petch", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ECTS', 0, 3);
      } else if (it.type === 'coffee') {
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = '#004b87';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(-8, -8, 16, 17, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#10b981';
        ctx.fillRect(-8, -2, 16, 5);

        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☕', 0, -10);
      } else if (it.type === 'gemini') {
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(-10, -9, 20, 18, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AI', 0, 4);
      } else if (it.type === 'shield') {
        ctx.fillStyle = '#004b87';
        ctx.strokeStyle = '#f2a900';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#f2a900';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(-10, -8, 20, 16, 3);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ALK', 0, 2);
      }

      ctx.restore();
    }

    // Postacie
    drawProfessor(professor.x, professor.y, professor.direction, professor.walkCycle, professor.freezeTimer > 0);
    drawStudent(player.x, player.y, player.direction, player.walkCycle, player.hasShield, player.coffeeTimer > 0);

    // Rysowanie efektów wybuchu artylerii
    renderBlastEffects();

    // Baner informacyjny na planszy
    if (screenBannerTimer > 0) {
      renderScreenBanner();
    }
  }

  // Rysowanie efektów cząsteczkowych artylerii
  function renderBlastEffects() {
    for (let i = 0; i < blastEffects.length; i++) {
      const fx = blastEffects[i];
      if (fx.type === 'shockwave') {
        ctx.save();
        ctx.strokeStyle = fx.color || '#ef4444';
        ctx.lineWidth = 3;
        ctx.globalAlpha = fx.alpha;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (fx.type === 'particle') {
        ctx.save();
        ctx.globalAlpha = Math.min(1, fx.life / fx.maxLife);
        if (fx.isPaper) {
          // Rozrzucone kartki egzaminacyjne
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#f2a900';
          ctx.lineWidth = 1;
          ctx.fillRect(fx.x - 4, fx.y - 4, 8, 10);
          ctx.strokeRect(fx.x - 4, fx.y - 4, 8, 10);
        } else {
          // Iskra ognia
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(fx.x, fx.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  // Baner powiadomienia
  function renderScreenBanner() {
    ctx.save();
    ctx.fillStyle = 'rgba(127, 29, 29, 0.85)';
    ctx.strokeStyle = '#f2a900';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CANVAS_WIDTH / 2 - 240, 18, 480, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(screenBannerText, CANVAS_WIDTH / 2, 41);
    ctx.restore();
  }

  // Student
  function drawStudent(x, y, dir, cycle, hasShield, isBoosted) {
    ctx.save();
    ctx.translate(x, y);

    if (hasShield) {
      ctx.strokeStyle = '#f2a900';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffc740';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (isBoosted) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(Date.now() * 0.015) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 13, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const leg = Math.sin(cycle) * 5;
    ctx.fillStyle = '#0a1128';
    ctx.fillRect(-7, 7 + leg, 5, 8);
    ctx.fillRect(2, 7 - leg, 5, 8);

    ctx.fillStyle = '#002244';
    ctx.beginPath();
    ctx.roundRect(-9, -7, 18, 17, 4);
    ctx.fill();

    ctx.fillStyle = '#f2a900';
    ctx.fillRect(-9, 3, 18, 3);

    ctx.fillStyle = '#004b87';
    if (dir === 'down' || dir === 'up') {
      ctx.beginPath();
      ctx.roundRect(-6, -4, 12, 11, 3);
      ctx.fill();
    }

    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -11, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, -13, 8, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Profesor
  function drawProfessor(x, y, dir, cycle, isFrozen) {
    ctx.save();
    ctx.translate(x, y);

    if (isFrozen) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Wirujące gwiazdki ogłuszenia
      const starPhase = Date.now() * 0.008;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💫', Math.cos(starPhase) * 18, -26 + Math.sin(starPhase) * 6);
      ctx.fillText('💫', Math.cos(starPhase + Math.PI) * 18, -26 + Math.sin(starPhase + Math.PI) * 6);

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 9px "Chakra Petch", monospace';
      ctx.fillText('OGŁUSZONY ARTYLERIĄ!', 0, -36);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const leg = isFrozen ? 0 : Math.sin(cycle) * 5;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-8, 9 + leg, 5, 8);
    ctx.fillRect(3, 9 - leg, 5, 8);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-11, -8, 22, 19, 4);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.lineTo(2, -6);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, -2, 8, 12);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('2.0', 11, 6);

    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(0, -12, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, -15, 9, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.fillRect(-6, -13, 4, 3);
    ctx.fillRect(2, -13, 4, 3);
    ctx.fillRect(-2, -12, 4, 1);

    ctx.restore();
  }

  // =========================================================================
  // 12. PĘTLA GRY
  // =========================================================================
  let lastTime = performance.now();
  function gameLoop(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    update(delta);
    render();

    requestAnimationFrame(gameLoop);
  }

  // =========================================================================
  // 13. OBSŁUGA ZDARZEŃ I STEROWANIA
  // =========================================================================
  function setupControls() {
    window.addEventListener('keydown', (e) => {
      initAudioOnUserGesture();

      if (e.code === 'KeyW' || e.code === 'ArrowUp') input.up = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        input.sprint = true;
      }

      // KLAWISZ 'R' LUB 'E' – WYSTRZAŁ ARTYLERII!
      if (e.code === 'KeyR' || e.code === 'KeyE') {
        fireArtillery();
      }

      // Klawisz 'P' (Pauza)
      if (e.code === 'KeyP') togglePause();
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') input.up = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        input.sprint = false;
      }
    });

    // Przyciski dotykowe D-pad
    const bindTouch = (btn, keyProp) => {
      if (!btn) return;
      const onPress = (e) => {
        e.preventDefault();
        initAudioOnUserGesture();
        input[keyProp] = true;
        btn.classList.add('active');
      };
      const onRelease = (e) => {
        e.preventDefault();
        input[keyProp] = false;
        btn.classList.remove('active');
      };

      btn.addEventListener('touchstart', onPress, { passive: false });
      btn.addEventListener('touchend', onRelease);
      btn.addEventListener('touchcancel', onRelease);
      btn.addEventListener('mousedown', onPress);
      btn.addEventListener('mouseup', onRelease);
      btn.addEventListener('mouseleave', onRelease);
    };

    bindTouch(touchUp, 'up');
    bindTouch(touchDown, 'down');
    bindTouch(touchLeft, 'left');
    bindTouch(touchRight, 'right');
    bindTouch(touchSprint, 'sprint');

    // Przycisk Artylerii w HUD
    if (btnArtillery) {
      btnArtillery.addEventListener('click', (e) => {
        e.preventDefault();
        initAudioOnUserGesture();
        fireArtillery();
      });
    }

    // Przycisk Artylerii w kontrolkach dotykowych
    if (touchArtillery) {
      const onTouchArtillery = (e) => {
        e.preventDefault();
        initAudioOnUserGesture();
        fireArtillery();
      };
      touchArtillery.addEventListener('touchstart', onTouchArtillery, { passive: false });
      touchArtillery.addEventListener('click', onTouchArtillery);
    }

    // Dźwięk & Pauza
    btnAudioToggle.addEventListener('click', () => {
      initAudioOnUserGesture();
      if (window.SoundSystem) {
        const isMuted = window.SoundSystem.toggleMute();
        audioIcon.textContent = isMuted ? '🔇' : '🔊';
      }
    });

    btnPauseToggle.addEventListener('click', () => {
      initAudioOnUserGesture();
      togglePause();
    });

    // Przyciski w modalach
    btnStartGame.addEventListener('click', () => {
      initAudioOnUserGesture();
      resetGame();
    });

    btnRestartGame.addEventListener('click', () => {
      initAudioOnUserGesture();
      resetGame();
    });

    btnPlayAgain.addEventListener('click', () => {
      initAudioOnUserGesture();
      resetGame();
    });
  }

  function togglePause() {
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      triggerProfessorQuote('„Pauza w sesji?! Nie ma takiego paragrafu w regulaminie!”');
    } else if (gameState === 'PAUSED') {
      gameState = 'PLAYING';
      pauseIcon.textContent = '⏸️';
    }
  }

  // Start aplikacji
  window.addEventListener('DOMContentLoaded', () => {
    setupControls();
    initCampusItems();
    updateHUD();
    updateArtilleryUI();
    requestAnimationFrame(gameLoop);
  });
})();
