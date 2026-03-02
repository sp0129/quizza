export type SoundMood = 'excited' | 'happy' | 'sad';

interface Syllable { freq: number; dur: number; }

function playSyllables(syllables: Syllable[], gap: number): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    let t = ctx.currentTime + 0.05;

    for (const { freq, dur } of syllables) {
      const osc    = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();

      // Sawtooth gives a rich, voice-like timbre
      osc.type = 'sawtooth';
      // Slight pitch rise then fall — vowel-like shape
      osc.frequency.setValueAtTime(freq * 0.9, t);
      osc.frequency.linearRampToValueAtTime(freq, t + dur * 0.25);
      osc.frequency.linearRampToValueAtTime(freq * 0.85, t + dur);

      // Bandpass narrows the spectrum to a nasal/voice range
      filter.type = 'bandpass';
      filter.frequency.value = freq * 1.6;
      filter.Q.value = 3.5;

      // Percussive amplitude envelope
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.015);
      gain.gain.setValueAtTime(0.28, t + dur * 0.5);
      gain.gain.linearRampToValueAtTime(0, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + dur + 0.01);

      t += dur + gap;
    }

    const totalMs = syllables.reduce((s, { dur }) => s + dur + gap, 0) * 1000 + 400;
    setTimeout(() => ctx.close(), totalMs);
  } catch {
    // Audio blocked or unsupported — silently ignore
  }
}

export function playGibberish(mood: SoundMood): void {
  if (mood === 'excited') {
    // Fast, high-pitched — like "bello! papagena! keloke!"
    playSyllables([
      { freq: 640, dur: 0.09 },
      { freq: 690, dur: 0.07 },
      { freq: 620, dur: 0.10 },
      { freq: 710, dur: 0.08 },
      { freq: 660, dur: 0.11 },
      { freq: 730, dur: 0.07 },
    ], 0.04);
  } else if (mood === 'happy') {
    // Medium pace, ascending — celebratory
    playSyllables([
      { freq: 520, dur: 0.13 },
      { freq: 560, dur: 0.11 },
      { freq: 540, dur: 0.14 },
      { freq: 600, dur: 0.12 },
      { freq: 620, dur: 0.14 },
    ], 0.06);
  } else {
    // Slow, descending — defeated
    playSyllables([
      { freq: 440, dur: 0.20 },
      { freq: 400, dur: 0.22 },
      { freq: 370, dur: 0.24 },
      { freq: 330, dur: 0.28 },
    ], 0.09);
  }
}
