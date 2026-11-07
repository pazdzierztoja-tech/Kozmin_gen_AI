/**
 * js/audio.js
 * Moduł dźwiękowy oparty wyłącznie na natywnym przeglądarkowym Web Audio API
 * (AudioContext, OscillatorNode, GainNode).
 * Generuje syntetyczne efekty retro 8-bit w czystym kodzie bez plików .mp3 / .wav.
 */

const SoundSystem = {
  ctx: null,
  isMuted: false,
  isInitialized: false,

  /**
   * Inicjalizacja AudioContext po pierwszej interakcji gracza
   * (zgodnie z polityką autoplay nowoczesnych przeglądarek)
   */
  init() {
    if (this.isInitialized && this.ctx && this.ctx.state !== 'suspended') {
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!this.ctx && AudioContextClass) {
        this.ctx = new AudioContextClass();
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isInitialized = true;
    } catch (err) {
      console.warn('Web Audio API nie jest obsługiwane w tej przeglądarce:', err);
    }
  },

  /**
   * Przełączanie stanu wyciszenia (Mute / Unmute)
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  },

  /**
   * Główna metoda odtwarzania efektów dźwiękowych
   * @param {string} type - 'ects' | 'coffee' | 'shield' | 'freeze' | 'hit' | 'win'
   */
  play(type) {
    if (this.isMuted) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    // Upewnij się, że kontekst jest aktywny
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    switch (type) {
      // 1. 'ects': melodyjny dwuton monety (fala trójkątna retro)
      case 'ects': {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'triangle';

        // Pierwszy ton: B5 (~987.77 Hz), drugi ton: E6 (~1318.51 Hz)
        osc1.frequency.setValueAtTime(987.77, now);
        osc2.frequency.setValueAtTime(1318.51, now + 0.08);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.setValueAtTime(0.22, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.08);

        osc2.start(now + 0.08);
        osc2.stop(now + 0.35);
        break;
      }

      // 2. 'coffee': dźwięk przyspieszenia (rosnąca częstotliwość fali piłokształtnej)
      case 'coffee': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // Szybki sweep częstotliwości w górę (od 180 Hz do 960 Hz)
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(960, now + 0.32);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }

      // 3. 'shield': aktywacja legitymacji studenckiej (akord sinusoidalny)
      case 'shield': {
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // Akord C-dur (C5, E5, G5, C6)
        const masterGain = this.ctx.createGain();

        masterGain.gain.setValueAtTime(0.01, now);
        masterGain.gain.linearRampToValueAtTime(0.25, now + 0.08);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        masterGain.connect(this.ctx.destination);

        frequencies.forEach((freq) => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          osc.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.55);
        });
        break;
      }

      // 4. 'freeze': cyber-freeze AI po zadanym pytaniu (fala prostokątna)
      case 'freeze': {
        const tones = [880, 660, 440, 220]; // Cyfrowe stop-klatki staccato
        const stepDuration = 0.06;

        tones.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const startTime = now + idx * stepDuration;

          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.15, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + stepDuration);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + stepDuration);
        });
        break;
      }

      // 5. 'hit': złapanie przez egzaminatora (dramatycznie opadający bas)
      case 'hit': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // Ciężki, dramatycznie opadający bas od 220 Hz do 32 Hz
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.45);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }

      // 6. 'win': krótka, 4-tonowa fanfara sukcesu
      case 'win': {
        // Radosna retro fanfara sukcesu: C5 -> F5 -> G5 -> C6
        const fanfareNotes = [
          { freq: 523.25, time: 0.00, duration: 0.12 }, // C5
          { freq: 698.46, time: 0.12, duration: 0.12 }, // F5
          { freq: 783.99, time: 0.24, duration: 0.14 }, // G5
          { freq: 1046.50, time: 0.38, duration: 0.40 } // C6 (dłuższy wybrzmiewający)
        ];

        fanfareNotes.forEach((note) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const noteStart = now + note.time;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.freq, noteStart);

          gain.gain.setValueAtTime(0.26, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + note.duration);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + note.duration);
        });
        break;
      }

      // 7. 'artillery': potężna salwa artylerii akademickiej (świst + soczysty wybuch retro)
      case 'artillery': {
        // Świst opadającego pocisku
        const whistle = this.ctx.createOscillator();
        const whistleGain = this.ctx.createGain();

        whistle.type = 'sine';
        whistle.frequency.setValueAtTime(1400, now);
        whistle.frequency.exponentialRampToValueAtTime(200, now + 0.22);

        whistleGain.gain.setValueAtTime(0.25, now);
        whistleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        whistle.connect(whistleGain);
        whistleGain.connect(this.ctx.destination);
        whistle.start(now);
        whistle.stop(now + 0.22);

        // Soczyste basowe uderzenie eksplozji
        const boomOsc = this.ctx.createOscillator();
        const boomGain = this.ctx.createGain();

        boomOsc.type = 'sawtooth';
        boomOsc.frequency.setValueAtTime(170, now + 0.18);
        boomOsc.frequency.exponentialRampToValueAtTime(28, now + 0.65);

        boomGain.gain.setValueAtTime(0.001, now);
        boomGain.gain.setValueAtTime(0.45, now + 0.18);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        boomOsc.connect(boomGain);
        boomGain.connect(this.ctx.destination);

        boomOsc.start(now + 0.18);
        boomOsc.stop(now + 0.7);
        break;
      }

      default:
        console.warn(`Nieznany typ dźwięku: "${type}"`);
    }
  }
};

// Eksport globalny obiektu SoundSystem do okna przeglądarki
window.SoundSystem = SoundSystem;
window.soundSystem = SoundSystem;

// Kompatybilność wsteczna z pomocniczym interfejsem gameAudio
window.gameAudio = {
  init: () => SoundSystem.init(),
  toggleMute: () => SoundSystem.toggleMute(),
  playCollectECTS: () => SoundSystem.play('ects'),
  playCoffee: () => SoundSystem.play('coffee'),
  playShield: () => SoundSystem.play('shield'),
  playAlert: () => SoundSystem.play('freeze'),
  playDefeat: () => SoundSystem.play('hit'),
  playVictory: () => SoundSystem.play('win')
};
