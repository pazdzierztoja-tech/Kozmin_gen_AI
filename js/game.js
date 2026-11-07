/**
 * js/game.js
 * Główny silnik gry 2D "Kozminski Escape: Polowanie na ECTS"
 * Obsługuje pętlę gry, fizykę gracza, AI profesora, staminę, strefy kampusu ALK oraz UI.
 */

(() => {
  // --- KONFIGURACJA GRY I STALE ---
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 540;
  const TARGET_ECTS = 30;
  const MAX_STAMINA = 100;
  const PLAYER_BASE_SPEED = 3.2;
  const PLAYER_SPRINT_SPEED = 5.4;
  const PROFESSOR_BASE_SPEED = 2.4;

  // Strefy na kampusie Akademii Leona Koźmińskiego
  const CAMPUS_ZONES = [
    { name: 'Budynek D – Korytarz Główny', x: 0, y: 0, w: 380, h: 260, color: '#0e243d' },
    { name: 'Budynek A – Dziekanat i Sale', x: 420, y: 0, w: 380, h: 260, color: '#122c4b' },
    { name: 'Zielone Patio ALK', x: 260, y: 220, w: 280, h: 200, color: '#093623' },
    { name: 'Budynek C – Biblioteka i Aula', x: 0, y: 300, w: 380, h: 240, color: '#0c2038' },
    { name: 'Kozminski Cafe & Lounge', x: 420, y: 300, w: 380, h: 240, color: '#162842' },
  ];

  // Kwestie wypowiadane przez profesora w dymku
  const PROFESSOR_QUOTES = [
    '„Gdzie pan biegnie z tym indeksem?! Kolokwium zaraz się zaczyna!”',
    '„Znam ten wzór na pamięć, a pan ucieka do Kozminski Cafe?!”',
    '„W bibliografii brakuje trzech kluczowych pozycji!”',
    '„Proszę pana, nie ma ucieczki przed makroekonomią!”',
    '„Kto nie zaliczy ćwiczeń, ten spotka się ze mną we wrześniu!”',
    '„Czy pan myśli, że ECTS-y rosną na drzewach na Patio?!”',
    '„Zaraz zamknę drzwi do sali egzaminacyjnej!”'
  ];

  // --- ELEMENTY DOM ---
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

  // Dymek profesora
  const professorBubble = document.getElementById('professor-bubble');
  const bubbleText = document.getElementById('bubble-text');

  // Modale
  const modalStart = document.getElementById('modal-start');
  const modalGameOver = document.getElementById('modal-game-over');
  const modalVictory = document.getElementById('modal-victory');

  const btnStart = document.getElementById('btn-start-game');
  const btnRestartFail = document.getElementById('btn-restart-game');
  const btnPlayAgain = document.getElementById('btn-play-again');

  // Statystyki modalne
  const failEctsCount = document.getElementById('fail-ects-count');
  const failSurvivalTime = document.getElementById('fail-survival-time');
  const failLocationName = document.getElementById('fail-location-name');
  const winTimeCount = document.getElementById('win-time-count');
  const winCoffeeCount = document.getElementById('win-coffee-count');

  // Sterowanie dotykowe
  const touchUp = document.getElementById('touch-up');
  const touchDown = document.getElementById('touch-down');
  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');
  const touchSprint = document.getElementById('touch-sprint');

  // --- STAN ROZGRYWKI ---
  let gameState = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'
  let ects = 0;
  let stamina = MAX_STAMINA;
  let coffeesDrunk = 0;
  let currentZoneName = 'Budynek D – Korytarz Główny';
  let startTime = 0;
  let elapsedTime = 0;
  let bubbleTimeout = null;
  let nextQuoteTime = 3000;

  // Klawiatura i wejście
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false
  };

  // Gracz (Student ALK)
  const player = {
    x: 120,
    y: 120,
    size: 26,
    speed: PLAYER_BASE_SPEED,
    hasShield: false,
    coffeeBoostTimer: 0,
    direction: 'down',
    legPhase: 0
  };

  // Przeciwnik (Profesor Egzaminator)
  const professor = {
    x: 680,
    y: 440,
    size: 30,
    speed: PROFESSOR_BASE_SPEED,
    direction: 'left',
    legPhase: 0
  };

  // Ściany i przeszkody na kampusie (architektura ALK)
  const obstacles = [
    // Pokoje / ściany działowe
    { x: 380, y: 0, w: 40, h: 180 }, // Kolumny między D a A
    { x: 380, y: 360, w: 40, h: 180 }, // Kolumny między C a Lounge
    { x: 0, y: 250, w: 220, h: 25 }, // Ściana sali B-101
    { x: 580, y: 250, w: 220, h: 25 }, // Ściana Auli Leona Koźmińskiego
    // Meble i recepcja
    { x: 140, y: 350, w: 80, h: 40 }, // Lada biblioteczna
    { x: 600, y: 110, w: 90, h: 40 } // Punkt informacyjny
  ];

  // Elementy do zebrania (ECTS, Kawa, Sylabus)
  let items = [];

  // --- FUNKCJE POMOCNICZE CZASU I FORMATOWANIA ---
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Wyświetlanie dymku z kwestią profesora
  function showProfessorQuote(customQuote = null) {
    if (gameState !== 'PLAYING') return;
    const text = customQuote || PROFESSOR_QUOTES[Math.floor(Math.random() * PROFESSOR_QUOTES.length)];
    bubbleText.textContent = text;
    professorBubble.classList.remove('bubble--hidden');

    if (window.gameAudio) window.gameAudio.playAlert();

    clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => {
      professorBubble.classList.add('bubble--hidden');
    }, 4500);
  }

  // Sprawdzanie aktualnej strefy kampusu
  function updateCampusZone() {
    for (const zone of CAMPUS_ZONES) {
      if (
        player.x >= zone.x &&
        player.x <= zone.x + zone.w &&
        player.y >= zone.y &&
        player.y <= zone.y + zone.h
      ) {
        if (currentZoneName !== zone.name) {
          currentZoneName = zone.name;
          campusStatus.textContent = zone.name;
        }
        return;
      }
    }
  }

  // Generowanie elementów na planszy
  function spawnItem(type) {
    let valid = false;
    let x = 0;
    let y = 0;
    let attempts = 0;

    while (!valid && attempts < 50) {
      attempts++;
      x = 40 + Math.random() * (CANVAS_WIDTH - 80);
      y = 40 + Math.random() * (CANVAS_HEIGHT - 80);

      // Sprawdź czy nie leży w ścianie
      let collidesWithWall = false;
      for (const obs of obstacles) {
        if (x > obs.x - 20 && x < obs.x + obs.w + 20 && y > obs.y - 20 && y < obs.y + obs.h + 20) {
          collidesWithWall = true;
          break;
        }
      }
      if (!collidesWithWall) valid = true;
    }

    items.push({
      type, // 'ects' | 'coffee' | 'shield'
      x,
      y,
      size: 16,
      floatOffset: Math.random() * Math.PI * 2
    });
  }

  // Inicjalizacja przedmiotów na start
  function initItems() {
    items = [];
    // 7 początkowych punktów ECTS
    for (let i = 0; i < 7; i++) {
      spawnItem('ects');
    }
    // 2 kawy
    spawnItem('coffee');
    spawnItem('coffee');
    // 1 sylabus ochronny
    spawnItem('shield');
  }

  // Reset całej rozgrywki
  function resetGame() {
    ects = 0;
    stamina = MAX_STAMINA;
    coffeesDrunk = 0;
    player.x = 100;
    player.y = 100;
    player.hasShield = false;
    player.coffeeBoostTimer = 0;

    professor.x = 700;
    professor.y = 440;

    startTime = Date.now();
    elapsedTime = 0;
    nextQuoteTime = 3000;

    initItems();
    updateHUD();

    modalStart.classList.add('modal-hidden');
    modalStart.classList.remove('modal-active');
    modalGameOver.classList.add('modal-hidden');
    modalGameOver.classList.remove('modal-active');
    modalVictory.classList.add('modal-hidden');
    modalVictory.classList.remove('modal-active');
    professorBubble.classList.add('bubble--hidden');

    gameState = 'PLAYING';
    showProfessorQuote('„Zaczynamy egzamin! Niech pan spróbuje zebrać 30 ECTS!”');
  }

  // Aktualizacja HUD
  function updateHUD() {
    ectsCounter.textContent = ects;
    const progressPercent = Math.min(100, Math.round((ects / TARGET_ECTS) * 100));
    ectsProgress.style.width = `${progressPercent}%`;

    staminaCounter.textContent = `${Math.round(stamina)}%`;
    staminaBar.style.width = `${stamina}%`;
  }

  // Kolizja prostokąt z przeszkodami
  function canMoveTo(x, y, size) {
    const half = size / 2;
    // Granice canvasu
    if (x - half < 8 || x + half > CANVAS_WIDTH - 8 || y - half < 8 || y + half > CANVAS_HEIGHT - 8) {
      return false;
    }
    // Ściany
    for (const obs of obstacles) {
      if (
        x + half > obs.x &&
        x - half < obs.x + obs.w &&
        y + half > obs.y &&
        y - half < obs.y + obs.h
      ) {
        return false;
      }
    }
    return true;
  }

  // --- LOGIKA AKTUALIZACJI ROZGRYWKI (UPDATE) ---
  function update(delta) {
    if (gameState !== 'PLAYING') return;

    elapsedTime = Date.now() - startTime;

    // Obsługa dymków profesora w czasie
    if (elapsedTime > nextQuoteTime) {
      showProfessorQuote();
      nextQuoteTime = elapsedTime + 9000 + Math.random() * 6000;
    }

    // 1. Ruch gracza i sprint
    let isSprinting = false;
    if (keys.sprint && stamina > 0) {
      isSprinting = true;
      stamina = Math.max(0, stamina - 28 * delta);
    } else {
      stamina = Math.min(MAX_STAMINA, stamina + 16 * delta);
    }

    if (player.coffeeBoostTimer > 0) {
      player.coffeeBoostTimer -= delta;
      isSprinting = true; // Turbo tryb po kawie
    }

    const currentSpeed = (isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_BASE_SPEED) * (player.coffeeBoostTimer > 0 ? 1.25 : 1);

    let dx = 0;
    let dy = 0;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;

    if (dx !== 0 && dy !== 0) {
      // Normalizacja wektora po przekątnej
      dx *= 0.7071;
      dy *= 0.7071;
    }

    if (dx !== 0 || dy !== 0) {
      player.legPhase += delta * 12;
      if (Math.abs(dx) > Math.abs(dy)) {
        player.direction = dx > 0 ? 'right' : 'left';
      } else {
        player.direction = dy > 0 ? 'down' : 'up';
      }
    }

    const nextX = player.x + dx * currentSpeed;
    const nextY = player.y + dy * currentSpeed;

    if (canMoveTo(nextX, player.y, player.size)) {
      player.x = nextX;
    }
    if (canMoveTo(player.x, nextY, player.size)) {
      player.y = nextY;
    }

    updateCampusZone();

    // 2. AI Egzaminatora (ściganie studenta z unikaniem ścian)
    const pAngle = Math.atan2(player.y - professor.y, player.x - professor.x);
    let profSpeed = PROFESSOR_BASE_SPEED + (ects / TARGET_ECTS) * 1.3; // Profesor przyspiesza z każdym ECTS!

    let profDx = Math.cos(pAngle) * profSpeed;
    let profDy = Math.sin(pAngle) * profSpeed;

    professor.legPhase += delta * 9;
    if (Math.abs(profDx) > Math.abs(profDy)) {
      professor.direction = profDx > 0 ? 'right' : 'left';
    } else {
      professor.direction = profDy > 0 ? 'down' : 'up';
    }

    const profNextX = professor.x + profDx;
    const profNextY = professor.y + profDy;

    // Próba ruchu w osi X i Y
    if (canMoveTo(profNextX, professor.y, professor.size)) {
      professor.x = profNextX;
    } else if (canMoveTo(professor.x, profNextY + (Math.random() - 0.5) * 4, professor.size)) {
      professor.y += (Math.random() > 0.5 ? 2 : -2);
    }

    if (canMoveTo(professor.x, profNextY, professor.size)) {
      professor.y = profNextY;
    } else if (canMoveTo(profNextX + (Math.random() - 0.5) * 4, professor.y, professor.size)) {
      professor.x += (Math.random() > 0.5 ? 2 : -2);
    }

    // 3. Kolizje z przedmiotami (ECTS, Kawa, Tarcza)
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const dist = Math.hypot(player.x - item.x, player.y - item.y);
      if (dist < (player.size / 2 + item.size / 2 + 4)) {
        if (item.type === 'ects') {
          ects++;
          if (window.gameAudio) window.gameAudio.playCollectECTS();
          // Pojawienie się kolejnego punktu ECTS aż do celu
          if (ects < TARGET_ECTS) {
            spawnItem('ects');
          }
          if (Math.random() < 0.25) spawnItem('coffee');
        } else if (item.type === 'coffee') {
          coffeesDrunk++;
          stamina = MAX_STAMINA;
          player.coffeeBoostTimer = 4.0;
          if (window.gameAudio) window.gameAudio.playCoffee();
        } else if (item.type === 'shield') {
          player.hasShield = true;
          if (window.gameAudio) window.gameAudio.playShield();
        }
        items.splice(i, 1);
      }
    }

    // Sprawdzenie warunku zwycięstwa (30 ECTS)
    if (ects >= TARGET_ECTS) {
      triggerVictory();
      return;
    }

    // 4. Kolizja z profesorem
    const distToProfessor = Math.hypot(player.x - professor.x, player.y - professor.y);
    if (distToProfessor < (player.size / 2 + professor.size / 2)) {
      if (player.hasShield) {
        // Tarcza ratuje studenta, odpycha profesora
        player.hasShield = false;
        showProfessorQuote('„Syllabus pana uratował, ale to było ostatnie ostrzeżenie!”');
        professor.x += Math.cos(pAngle + Math.PI) * 90;
        professor.y += Math.sin(pAngle + Math.PI) * 90;
      } else {
        triggerGameOver();
        return;
      }
    }

    updateHUD();
  }

  // Porażka: Kampania Wrześniowa
  function triggerGameOver() {
    gameState = 'GAMEOVER';
    if (window.gameAudio) window.gameAudio.playDefeat();

    failEctsCount.textContent = `${ects} / ${TARGET_ECTS}`;
    failSurvivalTime.textContent = formatTime(elapsedTime);
    failLocationName.textContent = currentZoneName;

    modalGameOver.classList.remove('modal-hidden');
    modalGameOver.classList.add('modal-active');
  }

  // Zwycięstwo: Zaliczony Semestr
  function triggerVictory() {
    gameState = 'VICTORY';
    if (window.gameAudio) window.gameAudio.playVictory();

    winTimeCount.textContent = formatTime(elapsedTime);
    winCoffeeCount.textContent = coffeesDrunk;

    modalVictory.classList.remove('modal-hidden');
    modalVictory.classList.add('modal-active');
  }

  // --- RYSOWANIE GRAFIKI (RENDER) ---
  function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Tło i strefy kampusu ALK
    for (const zone of CAMPUS_ZONES) {
      ctx.fillStyle = zone.color;
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

      // Oznaczenie Patio ALK z trawnikiem i ścieżkami
      if (zone.name === 'Zielone Patio ALK') {
        ctx.fillStyle = '#0f4830';
        ctx.fillRect(zone.x + 10, zone.y + 10, zone.w - 20, zone.h - 20);

        // Ozdobne drzewa na patio
        drawPatioTree(zone.x + 40, zone.y + 50);
        drawPatioTree(zone.x + 230, zone.y + 60);
        drawPatioTree(zone.x + 70, zone.y + 150);
        drawPatioTree(zone.x + 210, zone.y + 140);

        // Napis na trawie
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '700 13px "Chakra Petch", sans-serif';
        ctx.fillText('🌿 ZIELONE PATIO ALK', zone.x + 65, zone.y + 105);
      } else {
        // Płytki korytarza
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let gx = zone.x; gx < zone.x + zone.w; gx += 40) {
          ctx.beginPath();
          ctx.moveTo(gx, zone.y);
          ctx.lineTo(gx, zone.y + zone.h);
          ctx.stroke();
        }
        for (let gy = zone.y; gy < zone.y + zone.h; gy += 40) {
          ctx.beginPath();
          ctx.moveTo(zone.x, gy);
          ctx.lineTo(zone.x + zone.w, gy);
          ctx.stroke();
        }
      }

      // Etykieta strefy
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(zone.name.toUpperCase(), zone.x + 14, zone.y + 20);
    }

    // 2. Ściany i przeszkody kampusu
    ctx.fillStyle = '#06162a';
    ctx.strokeStyle = '#1a3e68';
    ctx.lineWidth = 2;
    for (const obs of obstacles) {
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

      // Ozdobny akcent na ścianach (tablice informacyjne ALK)
      ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.fillRect(obs.x + 4, obs.y + 4, Math.max(4, obs.w - 8), 4);
      ctx.fillStyle = '#06162a';
    }

    // 3. Przedmioty (ECTS, Kawa, Tarcza)
    const time = Date.now() * 0.005;
    for (const item of items) {
      const floatY = item.y + Math.sin(time + item.floatOffset) * 3;

      if (item.type === 'ects') {
        // Zwój ECTS / dyplom
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.roundRect(item.x - 9, floatY - 11, 18, 22, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 9px "Chakra Petch", monospace';
        ctx.fillText('ECTS', item.x - 11, floatY + 3);
      } else if (item.type === 'coffee') {
        // Kubek kawy z logo Kozminski Cafe
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(item.x - 7, floatY - 8, 14, 18, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Pasek na kubku
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(item.x - 7, floatY - 2, 14, 6);
      } else if (item.type === 'shield') {
        // Syllabus / tarcza
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(item.x, floatY, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('🛡️', item.x - 7, floatY + 4);
      }
    }

    // 4. Postać Profesora Egzaminatora
    drawProfessor(professor.x, professor.y, professor.direction, professor.legPhase);

    // 5. Postać Gracza (Student ALK)
    drawStudent(player.x, player.y, player.direction, player.legPhase, player.hasShield, player.coffeeBoostTimer > 0);

    // Obramowanie planszy
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);
  }

  // Rysowanie drzewka na patio
  function drawPatioTree(x, y) {
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x - 3, y - 4, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rysowanie studenta z plecakiem
  function drawStudent(x, y, direction, legPhase, hasShield, hasBoost) {
    ctx.save();
    ctx.translate(x, y);

    // Poświata tarczy lub boosta
    if (hasShield) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (hasBoost) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(Date.now() * 0.01) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cień
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nogi / buty (animowane)
    const legOffset = Math.sin(legPhase) * 4;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-8, 8 + legOffset, 5, 8);
    ctx.fillRect(3, 8 - legOffset, 5, 8);

    // Tułów (bluza w kolorze granatowym ALK z żółtym akcentem)
    ctx.fillStyle = '#002b49';
    ctx.beginPath();
    ctx.roundRect(-10, -6, 20, 18, 5);
    ctx.fill();

    // Pasek z logo ALK
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-10, 4, 20, 3);

    // Plecak studencki
    ctx.fillStyle = '#0369a1';
    if (direction === 'down') {
      ctx.beginPath();
      ctx.roundRect(-7, -4, 14, 12, 3);
      ctx.fill();
    } else if (direction === 'up') {
      ctx.beginPath();
      ctx.roundRect(-8, -5, 16, 13, 3);
      ctx.fill();
    }

    // Głowa i czapka z daszkiem / fryzura
    ctx.fillStyle = '#fbcfe8'; // Skóra
    ctx.beginPath();
    ctx.arc(0, -11, 8, 0, Math.PI * 2);
    ctx.fill();

    // Włosy / czapka
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(0, -13, 8, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Rysowanie profesora z teczką i garniturem
  function drawProfessor(x, y, direction, legPhase) {
    ctx.save();
    ctx.translate(x, y);

    // Cień
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nogi
    const legOffset = Math.sin(legPhase) * 4;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-9, 10 + legOffset, 6, 9);
    ctx.fillRect(3, 10 - legOffset, 6, 9);

    // Garnitur profesorski
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(-12, -7, 24, 20, 4);
    ctx.fill();

    // Czerwony krawat
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.lineTo(2, -6);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();

    // Teczka z ocenami niedostatecznymi
    ctx.fillStyle = '#78350f';
    ctx.fillRect(11, 0, 6, 12);

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

  // --- GŁÓWNA PĘTLA GRY (GAME LOOP) ---
  let lastFrameTime = performance.now();
  function gameLoop(now) {
    const delta = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;

    update(delta);
    render();

    requestAnimationFrame(gameLoop);
  }

  // --- OBSŁUGA ZDARZEŃ I KONTROLEK ---
  function setupControls() {
    // Klawiatura
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) keys.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keys.down = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = true;
      if (['ShiftLeft', 'ShiftRight', 'Space'].includes(e.code)) keys.sprint = true;

      // Klawisz pauzy 'P'
      if (e.code === 'KeyP') togglePause();
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) keys.down = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = false;
      if (['ShiftLeft', 'ShiftRight', 'Space'].includes(e.code)) keys.sprint = false;
    });

    // Kontrolki dotykowe (D-pad)
    const bindTouchButton = (btn, keyName) => {
      if (!btn) return;
      const start = (e) => {
        e.preventDefault();
        keys[keyName] = true;
        btn.classList.add('active');
        if (window.gameAudio) window.gameAudio.init();
      };
      const end = (e) => {
        e.preventDefault();
        keys[keyName] = false;
        btn.classList.remove('active');
      };
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end);
      btn.addEventListener('touchcancel', end);
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
    };

    bindTouchButton(touchUp, 'up');
    bindTouchButton(touchDown, 'down');
    bindTouchButton(touchLeft, 'left');
    bindTouchButton(touchRight, 'right');
    bindTouchButton(touchSprint, 'sprint');

    // Przyciski w HUD
    btnAudioToggle.addEventListener('click', () => {
      if (window.gameAudio) {
        window.gameAudio.init();
        const isMuted = window.gameAudio.toggleMute();
        audioIcon.textContent = isMuted ? '🔇' : '🔊';
      }
    });

    btnPauseToggle.addEventListener('click', () => {
      togglePause();
    });

    // Przyciski w modalach
    btnStart.addEventListener('click', () => {
      if (window.gameAudio) window.gameAudio.init();
      resetGame();
    });

    btnRestartFail.addEventListener('click', () => {
      if (window.gameAudio) window.gameAudio.init();
      resetGame();
    });

    btnPlayAgain.addEventListener('click', () => {
      if (window.gameAudio) window.gameAudio.init();
      resetGame();
    });
  }

  function togglePause() {
    if (gameState === 'PLAYING') {
      gameState = 'PAUSED';
      pauseIcon.textContent = '▶️';
      showProfessorQuote('„Pauza? W sesji nie ma przerw, drogi panie!”');
    } else if (gameState === 'PAUSED') {
      gameState = 'PLAYING';
      pauseIcon.textContent = '⏸️';
    }
  }

  // Start aplikacji
  window.addEventListener('DOMContentLoaded', () => {
    setupControls();
    initItems();
    updateHUD();
    requestAnimationFrame(gameLoop);
  });
})();
