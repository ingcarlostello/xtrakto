// Writes the video's sound effects to public/audio/sfx/ as 16-bit mono WAV.
// They are synthesized here, from plain math and a seeded noise, so no third
// party has rights on them and every run writes the same bytes:
// `pnpm --filter video generate:sfx` makes them again.
import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT_DIR = "public/audio/sfx";
const RATE = 48_000;

/** A seeded PRNG (mulberry32), so the noise is the same on every run. */
const randomFrom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};

/** Pink noise from white noise (Paul Kellet's economy filter). */
const pinkNoise = (length) => {
  const random = randomFrom(7);
  const out = new Float64Array(length);
  let [b0, b1, b2] = [0, 0, 0];
  for (let i = 0; i < length; i += 1) {
    const white = random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    out[i] = b0 + b1 + b2 + white * 0.1848;
  }
  return out;
};

/** A band-pass filter whose center moves over time (RBJ biquad, Q 0.8). */
const sweepingBandPass = (input, centerAt) => {
  const out = new Float64Array(input.length);
  let [x1, x2, y1, y2] = [0, 0, 0, 0];
  for (let i = 0; i < input.length; i += 1) {
    const w0 = (2 * Math.PI * centerAt(i / RATE)) / RATE;
    const alpha = Math.sin(w0) / (2 * 0.8);
    const a0 = 1 + alpha;
    const y =
      (alpha * input[i] -
        alpha * x2 +
        2 * Math.cos(w0) * y1 -
        (1 - alpha) * y2) /
      a0;
    [x2, x1, y2, y1] = [x1, input[i], y1, y];
    out[i] = y;
  }
  return out;
};

/** Air passing by, for the cuts: noise sweeping up, in and out in 0.7 s. */
const whoosh = () => {
  const duration = 0.7;
  const band = sweepingBandPass(
    pinkNoise(Math.round(duration * RATE)),
    (t) => 500 + 1500 * (t / duration),
  );
  return band.map(
    (value, i) => value * Math.sin((Math.PI * i) / band.length) ** 2,
  );
};

/** A soft pop, for things landing: a tone falling from 3 kHz, 0.15 s. */
const pop = () => {
  const out = new Float64Array(Math.round(0.15 * RATE));
  let phase = 0;
  for (let i = 0; i < out.length; i += 1) {
    const t = i / RATE;
    phase += (2 * Math.PI * (520 + 2600 * Math.exp(-30 * t))) / RATE;
    out[i] = Math.sin(phase) * Math.exp(-28 * t) * Math.min(1, t / 0.002);
  }
  return out;
};

/** A small bell, for what checks out: E6 and two overtones, 1.4 s. */
const ding = () => {
  const partials = [
    [1318.51, 0.3, 3.2],
    [2637.02, 0.16, 5],
    [3955.53, 0.08, 7],
  ];
  return Float64Array.from({ length: Math.round(1.4 * RATE) }, (_, i) => {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.004);
    return (
      partials.reduce(
        (sum, [frequency, gain, decay]) =>
          sum +
          gain * Math.sin(2 * Math.PI * frequency * t) * Math.exp(-decay * t),
        0,
      ) * attack
    );
  });
};

/** 16-bit PCM WAV, peak at -3 dBFS so each sound's level is predictable. */
const toWav = (samples) => {
  const peak = samples.reduce(
    (max, value) => Math.max(max, Math.abs(value)),
    0,
  );
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((value, i) => {
    data.writeInt16LE(Math.round((value / peak) * 0.708 * 32_767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, make] of Object.entries({ whoosh, pop, ding })) {
  writeFileSync(`${OUT_DIR}/${name}.wav`, toWav(make()));
}
