/**
 * js/game.js
 * Serce gry 2D: „Kozminski Escape: Polowanie na ECTS”
 * Akademia Leona Koźmińskiego (ALK) w Warszawie
 *
 * Implementuje:
 * 1. Układ kampusu na Canvasie (Aula A, Biblioteka, Dziekanat, Lab Komputerowy, Patio ALK 🌿)
 * 2. Gracz (Student) – ruch wektorowy, sprint ze staminą, tarcza, turbo-kawa
 * 3. Przeciwnik (Egzaminator) – algorytm pościgu skalowany z ECTS, paraliż Gemini AI, komiksowe dymki
 * 4. Przedmioty – ECTS, Kawa z Patio, Gemini AI, Legitymacja ALK
 * 5. Pełna integracja z modułem audio SoundSystem.play(...)
 */

(() => {
  'use strict';

  // =========================================================================
  // 1. STAŁE, KONFIGURACJA I ARCHITEKTURA KAMPUSU ALK
  // =========================================================================
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 540;
  const TARGET_ECTS = 30;

  // Prędkości i parametry fizyki
  const PLAYER_BASE_SPEED = 3.3;
  const PLAYER_SPRINT_SPEED = 5.6;
  const PROFESSOR_BASE_SPEED = 2.3;
  const MAX_STAMINA = 100;
  const STAMINA_DRAIN_RATE = 28;    // /s podczas sprintu
  const STAMINA_RECOVERY_RATE = 18; // /s podczas marszu/stania
  const COFFEE_BOOST_DURATION = 5.0; // 5 sekund turbo
  const GEMINI_FREEZE_DURATION = 3.5; // 3.5 sekundy paraliżu profesora

  // Komiksowe teksty akademickie profesora
  const PROFESSOR_QUOTES = [
    '„A gdzie przypis harwardzki?!”',
    '„Ten bilans się nie zamyka!”',
    '„Widzę Pana we wrześniu!”',
    '„USOS właśnie zamknął protokół!”',
    '„Czy ten esej pisał Pan, czy ChatGPT?!”'
  ];

  // Strefy kampusu z nazwami i współrzędnymi
  const CAMPUS_ZONES = [
    { id: 'aula', name: 'Aula A', x: 20, y: 20, w: 260, h: 180, color: '#091c36', label: 'AULA A' },
    { id: 'dziekanat', name: 'Dziekanat', x: 520, y: 20, w: 260, h: 180, color: '#092140', label: 'DZIEKANAT' },
    { id: 'patio', name: 'Patio ALK 🌿', x: 260, y: 170, w: 280, h: 200, color: '#063a23', label: 'PATIO ALK 🌿' },
    { id: 'biblioteka', name: 'Biblioteka', x: 20, y: 340, w: 260, h: 180, color: '#0a1a30', label: 'BIBLIOTEKA' },
    { id: 'lab', name: 'Lab Komputerowy', x: 520, y: 340, w: 260, h: 180, color: '#081d38', label: 'LAB KOMPUTEROWY' }
  ];

  // Ściany budynku kampusu (zostawiają szerokie wejścia/korytarze do sal i Patio)
  const WALLS = [
    // Obwód zewnętrzny sali: Aula A (lewy górny róg)
    { x: 20, y: 20, w: 260, h: 14 },
    { x: 20, y: 20, w: 14, h: 180 },
    { x: 20, y: 186, w: 170, h: 14 }, // wejście od 190 do 280
    { x: 266, y: 20, w: 14, h: 100 },

    // Obwód zewnętrzny: Dziekanat (prawy górny róg)
    { x: 520, y: 20, w: 260, h: 14 },
    { x: 766, y: 20, w: 14, h: 180 },
    { x: 610, y: 186, w: 170, h: 14 }, // wejście od 520 do 610
    { x: 520, y: 20, w: 14, h: 100 },

    // Obwód zewnętrzny: Biblioteka (lewy dolny róg)
    { x: 20, y: 340, w: 170, h: 14 }, // wejście od 190 do 280
    { x: 20, y: 340, w: 14, h: 180 },
    { x: 20, y: 506, w: 260, h: 14 },
    { x: 266, y: 420, w: 14, h: 100 },

    // Obwód zewnętrzny: Lab Komputerowy (prawy dolny róg)
    { x: 610, y: 340, w: 170, h: 14 }, // wejście od 520 do 610
    { x: 766, y: 340, w: 14, h: 180 },
    { x: 520, y: 506, w: 260, h: 14 },
    { x: 520, y: 420, w: 14, h: 100 },

    // Wewnętrzne meble / przeszkody w salach
    { x: 90, y: 80, w: 110, h: 22 },   // Ławki w Auli A
    { x: 90, y: 125, w: 110, h: 22 },  // Drugi rząd ławek w Auli
    { x: 600, y: 90, w: 100, h: 40 },  // Lada Dziekanatu
    { x: 80, y: 400, w: 130, h: 24 },  // Regały Biblioteki
    { x: 80, y: 450, w: 130, h: 24 },  // Drugi regał Biblioteki
    { x: 590, y: 400, w: 110, h: 26 }, // Biurka komputerowe
    { x: 590, y: 450, w: 110, h: 26 }  // Drugi rząd komputerów
  ];

  // Drzewka ozdobne na Patio ALK (stanowią również naturalne przeszkody)
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

  // Pasek HUD
  const ectsCounter = document.getElementById('ects-counter');
  const ectsProgress = document.getElementById('ects-progress');
  const staminaCounter = document.getElementById('stamina-counter');
  const staminaBar = document.getElementById('stamina-bar');
  const campusStatus = document.getElementById('campus-status');
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const audioIcon = document.getElementById('audio-icon');
  const btnPauseToggle = document.getElementById('btn-pause-toggle');
  const pauseIcon = document.getElementById('pause-icon');

  // Komiksowy dymek profesora
  const professorBubble = document.getElementById('professor-bubble');
  const bubbleText = document.getElementById('bubble-text');

  // Ekrany modalne
  const modalStart = document.getElementById('modal-start');
  const modalGameOver = document.getElementById('modal-game-over');
  const modalVictory = document.getElementById('modal-victory');
  const btnStartGame = document.getElementById('btn-start-game');
  const btnRestartGame = document.getElementById('btn-restart-game');
  const btnPlayAgain = document.getElementById('btn-play-again');

  // Metryki podsumowań
  const failEctsCount = document.getElementById('fail-ects-count');
  const failSurvivalTime = document.getElementById('fail-survival-time');
  const failLocationName = document.getElementById('fail-location-name');
  const winTimeCount = document.getElementById('win-time-count');
  const winCoffeeCount = document.getElementById('win-coffee-count');

  // Sterowanie dotykowe (mobilne)
  const touchUp = document.getElementById('touch-up');
  const touchDown = document.getElementById('touch-down');
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');
  const touchSprint = document.getElementById('touch-sprint');

  // =========================================================================
  // 3. STAN ROZGRYWKI (STATE)
  // =========================================================================
  let gameState = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'
  let ects = 0;
  let stamina = MAX_STAMINA;
  let coffeesCollected = 0;
  let startTime = 0;
  let elapsedTime = 0;
  let currentZone = 'Patio ALK 🌿';
  let quoteTimer = 3.0; // Odliczanie do następnej kwestii profesora
  let bubbleHideTimer = 0;

  // Wejście sterowania (Klawiatura + Dotyk)
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false
  };

  // Gracz (Student ALK)
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

  // Przeciwnik (Profesor Egzaminator)
  const professor = {
    x: 100,
    y: 100,
    radius: 16,
    speed: PROFESSOR_BASE_SPEED,
    freezeTimer: 0,
    direction: 'down',
    walkCycle: 0,
    quoteIndex: 0
  };

  // Tablica aktywnych przedmiotów na planszy
  let items = [];

  // =========================================================================
  // 4. BEZPIECZNE WYWOŁYWANIE DŹWIĘKÓW (SoundSystem)
  // =========================================================================
  function playSound(type) {
    if (window.SoundSystem && typeof window.SoundSystem.play === 'function') {
      window.SoundSystem.play(type);
    } else if (window.gameAudio && typeof window.gameAudio.playCollectECTS === 'function') {
      // Fallback
      if (type === 'ects') window.gameAudio.playCollectECTS();
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
  // 5. OBSŁUGA DYMKÓW KOMIKSOWYCH PROFESORA
  // =========================================================================
  function triggerProfessorQuote(specificText = null) {
    let quote = specificText;
    if (!quote) {
      quote = PROFESSOR_QUOTES[professor.quoteIndex % PROFESSOR_QUOTES.length];
      professor.quoteIndex++;
    }

    bubbleText.textContent = quote;
    professorBubble.classList.remove('bubble--hidden');
    bubbleHideTimer = 4.0; // Ukryj po 4 sekundach
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
  // 6. SYSTEM KOLIZJI ZE ŚCIANAMI I ARCHITEKTURĄ KAMPUSU
  // =========================================================================
  function isCollidingWithWalls(x, y, radius) {
    // 1. Zewnętrzne granice planszy gry (margines 12px)
    if (
      x - radius < 10 ||
      x + radius > CANVAS_WIDTH - 10 ||
      y - radius < 10 ||
      y + radius > CANVAS_HEIGHT - 10
    ) {
      return true;
    }

    // 2. Prostokątne ściany i meble
    for (let i = 0; i < WALLS.length; i++) {
      const w = WALLS[i];
      // Najbliższy punkt prostokąta względem środka koła
      const closestX = Math.max(w.x, Math.min(x, w.x + w.w));
      const closestY = Math.max(w.y, Math.min(y, w.y + w.h));
      const distX = x - closestX;
      const distY = y - closestY;
      const distanceSquared = distX * distX + distY * distY;

      if (distanceSquared < radius * radius) {
        return true;
      }
    }

    // 3. Drzewa na Patio
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
  // 7. GENEROWANIE PRZEDMIOTÓW (SPAWN POZA ŚCIANAMI)
  // Przedmioty: 'ects', 'coffee', 'gemini', 'shield'
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

      // Przedmiot nie może leżeć w ścianie ani zbyt blisko innej ściany
      if (!isCollidingWithWalls(x, y, 16)) {
        // Nie może też leżeć bezpośrednio na studencie
        const distToPlayer = Math.hypot(x - player.x, y - player.y);
        if (distToPlayer > 45) {
          valid = true;
        }
      }
    }

    if (valid) {
      items.push({
        type: type, // 'ects' | 'coffee' | 'gemini' | 'shield'
        x: x,
        y: y,
        radius: 12,
        bobPhase: Math.random() * Math.PI * 2
      });
    }
  }

  function initCampusItems() {
    items = [];
    // 8 początkowych zwojów ECTS
    for (let i = 0; i < 8; i++) spawnItem('ects');
    // 2 kawy z Patio ALK
    spawnItem('coffee');
    spawnItem('coffee');
    // 1 moduł Gemini AI
    spawnItem('gemini');
    // 1 Legitymacja ALK
    spawnItem('shield');
  }

  // =========================================================================
  // 8. AKTUALIZACJA STREFY KAMPUSU
  // =========================================================================
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
  // 9. LOGIKA GRY (RESET, START, PAUZA, PORAŻKA, ZWYCIĘSTWO)
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

    // Student startuje w bezpiecznym Patio
    player.x = 400;
    player.y = 270;
    player.hasShield = false;
    player.coffeeTimer = 0;

    // Profesor startuje w gabinecie Auli A
    professor.x = 90;
    professor.y = 60;
    professor.freezeTimer = 0;
    professor.quoteIndex = 0;

    startTime = Date.now();
    elapsedTime = 0;
    quoteTimer = 2.5;
    bubbleHideTimer = 0;

    initCampusItems();
    updateHUD();

    // Ukryj modale
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
  // 10. GŁÓWNA AKTUALIZACJA FIZYKI I PRZEBIEGU ROZGRYWKI (UPDATE)
  // =========================================================================
  function update(delta) {
    if (gameState !== 'PLAYING') return;

    elapsedTime = Date.now() - startTime;
    updateProfessorBubble(delta);

    // Losowe rzucanie akademickimi kwestiami
    quoteTimer -= delta;
    if (quoteTimer <= 0) {
      triggerProfessorQuote();
      quoteTimer = 7.0 + Math.random() * 5.0;
    }

    // -----------------------------------------------------------------------
    // A. RUCH GRACZA (STUDENT)
    // -----------------------------------------------------------------------
    let isSprinting = false;

    // Obsługa sprintu pod Spacją lub Shiftem lub dotykiem
    if (input.sprint && stamina > 0) {
      isSprinting = true;
      stamina = Math.max(0, stamina - STAMINA_DRAIN_RATE * delta);
    } else {
      stamina = Math.min(MAX_STAMINA, stamina + STAMINA_RECOVERY_RATE * delta);
    }

    // Turbo-szybkość po kawie z Patio ALK (5s)
    let turboSpeedMultiplier = 1.0;
    if (player.coffeeTimer > 0) {
      player.coffeeTimer -= delta;
      turboSpeedMultiplier = 1.45;
      isSprinting = true; // Kawa daje nieprzerwany darmowy sprint
    }

    const currentSpeed = (isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_BASE_SPEED) * turboSpeedMultiplier;

    // Wektor ruchu
    let vx = 0;
    let vy = 0;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;

    // Normalizacja po przekątnej
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

    // Płynny ruch osiowy z niezależnym sprawdzaniem kolizji X i Y
    const nextPlayerX = player.x + vx * currentSpeed;
    const nextPlayerY = player.y + vy * currentSpeed;

    if (!isCollidingWithWalls(nextPlayerX, player.y, player.radius)) {
      player.x = nextPlayerX;
    }
    if (!isCollidingWithWalls(player.x, nextPlayerY, player.radius)) {
      player.y = nextPlayerY;
    }

    updateCampusZone();

    // -----------------------------------------------------------------------
    // B. PRZECIWNIK (EGZAMINATOR)
    // Przyspiesza z każdym ECTS; paraliżowany przez Gemini AI
    // -----------------------------------------------------------------------
    if (professor.freezeTimer > 0) {
      professor.freezeTimer -= delta;
      // Podczas paraliżu profesor stoi w miejscu
    } else {
      // Algorytm śledzenia studenta
      const dx = player.x - professor.x;
      const dy = player.y - professor.y;
      const angle = Math.atan2(dy, dx);

      // Profesor przyspiesza z każdym zdobytym ECTS!
      const ectsSpeedBonus = (ects / TARGET_ECTS) * 1.6;
      const currentProfSpeed = PROFESSOR_BASE_SPEED + ectsSpeedBonus;

      let pvx = Math.cos(angle) * currentProfSpeed;
      let pvy = Math.sin(angle) * currentProfSpeed;

      professor.walkCycle += delta * 8;
      if (Math.abs(pvx) > Math.abs(pvy)) {
        professor.direction = pvx > 0 ? 'right' : 'left';
      } else {
        professor.direction = pvy > 0 ? 'down' : 'up';
      }

      // Ruch z omijaniem ścian
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

      // Jeśli profesor utknął na narożniku ściany, wykonaj drobny ślizg
      if (!moved) {
        if (!isCollidingWithWalls(professor.x + (Math.random() - 0.5) * 4, professor.y + 3, professor.radius)) {
          professor.y += 2;
        } else {
          professor.x += 2;
        }
      }
    }

    // -----------------------------------------------------------------------
    // C. ZBIERANIE PRZEDMIOTÓW
    // -----------------------------------------------------------------------
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const dist = Math.hypot(player.x - item.x, player.y - item.y);

      if (dist < player.radius + item.radius + 3) {
        // 1. Zbiór punktu ECTS
        if (item.type === 'ects') {
          ects++;
          playSound('ects');
          if (ects >= TARGET_ECTS) {
            triggerVictory();
            return;
          }
          // Zapewnij stałą obecność ECTS na kampusie
          spawnItem('ects');
          // Szansa na dodatkowy spawn przedmiotu specjalnego
          if (Math.random() < 0.25) spawnItem('coffee');
          if (Math.random() < 0.15 && professor.freezeTimer <= 0) spawnItem('gemini');
        }

        // 2. Kawa z Patio ALK (5s turbo)
        else if (item.type === 'coffee') {
          coffeesCollected++;
          player.coffeeTimer = COFFEE_BOOST_DURATION;
          stamina = MAX_STAMINA;
          playSound('coffee');
          triggerProfessorQuote('„Kawa z Patio?! To nie obniży progu zaliczenia!”');
        }

        // 3. Gemini AI (paraliżuje profesora na 3.5s)
        else if (item.type === 'gemini') {
          professor.freezeTimer = GEMINI_FREEZE_DURATION;
          playSound('freeze');
          triggerProfessorQuote('„Czy ten esej pisał Pan, czy ChatGPT?!”');
        }

        // 4. Legitymacja ALK (tarcza ochronna)
        else if (item.type === 'shield') {
          player.hasShield = true;
          playSound('shield');
        }

        items.splice(i, 1);
      }
    }

    // -----------------------------------------------------------------------
    // D. KOLIZJA STUDENTA Z PROFESOREM
    // -----------------------------------------------------------------------
    const distToProf = Math.hypot(player.x - professor.x, player.y - professor.y);
    if (distToProf < player.radius + professor.radius) {
      if (player.hasShield) {
        // Legitymacja pochłania jedno uderzenie i odpycha profesora
        player.hasShield = false;
        playSound('shield');
        triggerProfessorQuote('„Legitymacja podstemplowana, ale widzę Pana we wrześniu!”');

        // Odpychamy profesora w przeciwnym kierunku
        const pushAngle = Math.atan2(professor.y - player.y, professor.x - player.x);
        professor.x += Math.cos(pushAngle) * 90;
        professor.y += Math.sin(pushAngle) * 90;
      } else {
        // Złapanie studenta -> Kampania Wrześniowa!
        triggerGameOver();
        return;
      }
    }

    updateHUD();
  }

  // =========================================================================
  // 11. RYSOWANIE KAMPUSU I GRAFIKI (RENDER)
  // =========================================================================
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Podłoże i sale kampusu
    ctx.fillStyle = '#0a1128';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Kafelkowanie korytarza kampusu
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

    // Rysowanie stref (Aula, Dziekanat, Biblioteka, Lab, Patio)
    for (let i = 0; i < CAMPUS_ZONES.length; i++) {
      const z = CAMPUS_ZONES[i];
      ctx.fillStyle = z.color;
      ctx.fillRect(z.x, z.y, z.w, z.h);

      // Obramowanie strefy
      ctx.strokeStyle = z.id === 'patio' ? '#10b981' : '#004b87';
      ctx.lineWidth = z.id === 'patio' ? 2 : 1;
      ctx.strokeRect(z.x, z.y, z.w, z.h);

      // Oznaczenie Patio ALK 🌿
      if (z.id === 'patio') {
        // Wewnętrzny trawnik
        ctx.fillStyle = '#0a422a';
        ctx.fillRect(z.x + 8, z.y + 8, z.w - 16, z.h - 16);

        // Ścieżki na patio
        ctx.fillStyle = '#1e382b';
        ctx.fillRect(z.x + z.w / 2 - 20, z.y + 8, 40, z.h - 16);
        ctx.fillRect(z.x + 8, z.y + z.h / 2 - 20, z.w - 16, 40);

        // Napis centralny
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '700 15px "Chakra Petch", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PATIO ALK 🌿', z.x + z.w / 2, z.y + z.h / 2 + 5);
      } else {
        // Napisy sal
        ctx.fillStyle = 'rgba(242, 169, 0, 0.4)';
        ctx.font = '700 13px "Chakra Petch", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(z.label, z.x + 18, z.y + 24);
      }
    }

    // 2. Ściany i przeszkody stałe
    ctx.fillStyle = '#002244';
    ctx.strokeStyle = '#f2a900';
    ctx.lineWidth = 2;

    for (let i = 0; i < WALLS.length; i++) {
      const w = WALLS[i];
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeRect(w.x, w.y, w.w, w.h);

      // Ozdobna złota wstęga na ścianach ALK
      ctx.fillStyle = '#ffc740';
      ctx.fillRect(w.x + 2, w.y + 2, Math.max(2, w.w - 4), Math.min(3, w.h - 4));
      ctx.fillStyle = '#002244';
    }

    // Drzewka na Patio
    for (let i = 0; i < PATIO_TREES.length; i++) {
      const t = PATIO_TREES[i];
      // Cień
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(t.x + 2, t.y + 4, t.r, 0, Math.PI * 2);
      ctx.fill();

      // Korona
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 3, t.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Przedmioty (ECTS, Kawa, Gemini AI, Legitymacja)
    const timeNow = Date.now() * 0.005;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const bob = Math.sin(timeNow + it.bobPhase) * 3;

      ctx.save();
      ctx.translate(it.x, it.y + bob);

      if (it.type === 'ects') {
        // 📜 ECTS
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
        // ☕ Kawa z Patio ALK
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = '#004b87';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(-8, -8, 16, 17, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Pasek na kubku kawy
        ctx.fillStyle = '#10b981';
        ctx.fillRect(-8, -2, 16, 5);

        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☕', 0, -10);
      } else if (it.type === 'gemini') {
        // 💻 Gemini AI
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
        // 🪪 Legitymacja ALK
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

    // 4. Rysowanie Profesora (Egzaminator)
    drawProfessor(professor.x, professor.y, professor.direction, professor.walkCycle, professor.freezeTimer > 0);

    // 5. Rysowanie Gracza (Student)
    drawStudent(player.x, player.y, player.direction, player.walkCycle, player.hasShield, player.coffeeTimer > 0);
  }

  // Rysowanie studenta ALK
  function drawStudent(x, y, dir, cycle, hasShield, isBoosted) {
    ctx.save();
    ctx.translate(x, y);

    // Efekt tarczy Legitymacji ALK
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

    // Efekt turbo po kawie
    if (isBoosted) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(Date.now() * 0.015) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cień
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 13, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nogi
    const leg = Math.sin(cycle) * 5;
    ctx.fillStyle = '#0a1128';
    ctx.fillRect(-7, 7 + leg, 5, 8);
    ctx.fillRect(2, 7 - leg, 5, 8);

    // Tułów w granatowej bluzie ALK z logo
    ctx.fillStyle = '#002244';
    ctx.beginPath();
    ctx.roundRect(-9, -7, 18, 17, 4);
    ctx.fill();

    // Złoty zamek / pas bluzki
    ctx.fillStyle = '#f2a900';
    ctx.fillRect(-9, 3, 18, 3);

    // Plecak
    ctx.fillStyle = '#004b87';
    if (dir === 'down' || dir === 'up') {
      ctx.beginPath();
      ctx.roundRect(-6, -4, 12, 11, 3);
      ctx.fill();
    }

    // Głowa
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -11, 8, 0, Math.PI * 2);
    ctx.fill();

    // Fryzura studenta
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, -13, 8, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Rysowanie profesora (Egzaminator)
  function drawProfessor(x, y, dir, cycle, isFrozen) {
    ctx.save();
    ctx.translate(x, y);

    // Efekt zamrożenia Cyber-Freeze przez Gemini AI
    if (isFrozen) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Napis paraliżu nad profesorem
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px "Chakra Petch", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ GEMINI FREEZE ⚡', 0, -28);
    }

    // Cień
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nogi
    const leg = isFrozen ? 0 : Math.sin(cycle) * 5;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-8, 9 + leg, 5, 8);
    ctx.fillRect(3, 9 - leg, 5, 8);

    // Ciemny garnitur
    ctx.fillStyle = isFrozen ? '#1e293b' : '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-11, -8, 22, 19, 4);
    ctx.fill();

    // Czerwony krawat
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.lineTo(2, -6);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();

    // Formularz z oceną 2.0 w ręku profesora
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, -2, 8, 12);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText('2.0', 11, 6);

    // Głowa z siwymi włosami i okularami
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(0, -12, 9, 0, Math.PI * 2);
    ctx.fill();

    // Siwe włosy
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, -15, 9, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    // Okulary
    ctx.fillStyle = '#000000';
    ctx.fillRect(-6, -13, 4, 3);
    ctx.fillRect(2, -13, 4, 3);
    ctx.fillRect(-2, -12, 4, 1);

    ctx.restore();
  }

  // =========================================================================
  // 12. PĘTLA GRY (GAME LOOP)
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
  // 13. STEROWANIE I REJESTRACJA ZDARZEŃ (INPUT & EVENTS)
  // =========================================================================
  function setupControls() {
    // A. Klawiatura (WASD, Strzałki, Spacja, Shift)
    window.addEventListener('keydown', (e) => {
      initAudioOnUserGesture();

      if (e.code === 'KeyW' || e.code === 'ArrowUp') input.up = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        input.sprint = true;
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

    // B. Przyciski ekranowe / dotykowe (D-pad i Sprint)
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

    // C. Przyciski w HUD (Dźwięk, Pauza)
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

    // D. Przyciski w modalach
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

  // =========================================================================
  // 14. INICJALIZACJA GRY PO ZAŁADOWANIU DOM
  // =========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    setupControls();
    initCampusItems();
    updateHUD();
    requestAnimationFrame(gameLoop);
  });
})();
