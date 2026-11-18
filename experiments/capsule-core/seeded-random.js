const UINT32_MAX = 0x100000000;

export function hashSeed(value) {
  const text = String(value ?? "");
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function createSeededRandom(seed) {
  let state = hashSeed(seed) || 0x6d2b79f5;

  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_MAX;
  };
}

export function pickWithSeed(items, seed) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new RangeError("pickWithSeed requires at least one item.");
  }

  const random = createSeededRandom(seed);
  return items[Math.floor(random() * items.length)];
}

export function shuffleWithSeed(items, seed) {
  const copy = [...items];
  const random = createSeededRandom(seed);

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function createLocalSeed(prefix = "relay") {
  const bytes = new Uint32Array(2);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    bytes[0] = Date.now() >>> 0;
    bytes[1] = Math.floor(Math.random() * UINT32_MAX);
  }

  return `${prefix}-${bytes[0].toString(36)}-${bytes[1].toString(36)}`;
}
