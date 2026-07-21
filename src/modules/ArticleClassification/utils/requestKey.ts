const toUuid = (bytes: Uint8Array): string => {
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
};

const fillWithLegacyRandomness = (bytes: Uint8Array): void => {
  let timestamp = Date.now();
  for (let index = 0; index < bytes.length; index += 1) {
    const timeByte = timestamp & 0xff;
    bytes[index] = (Math.floor(Math.random() * 256) ^ timeByte) & 0xff;
    timestamp = Math.floor(timestamp / 256);
    if (timestamp === 0) timestamp = Date.now();
  }
};

/**
 * Genera la llave de idempotencia aceptada por la API incluso cuando la UI se
 * sirve por HTTP y randomUUID no esta disponible por falta de contexto seguro.
 */
export const createRequestKey = (cryptoProvider?: Crypto | null): string => {
  const provider = cryptoProvider === undefined
    ? (typeof globalThis.crypto === 'undefined' ? null : globalThis.crypto)
    : cryptoProvider;

  if (typeof provider?.randomUUID === 'function') return provider.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof provider?.getRandomValues === 'function') {
    provider.getRandomValues(bytes);
  } else {
    fillWithLegacyRandomness(bytes);
  }

  return toUuid(bytes);
};
