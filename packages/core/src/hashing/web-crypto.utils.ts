// Web Crypto and TextEncoder exist in browsers, workers and Node 22, but their
// types come from the DOM or Node libraries, which core leaves out so platform
// globals can't slip in. Only the subset used here is declared.
type HmacAlgorithm = { readonly name: "HMAC"; readonly hash: "SHA-256" };
type WebPlatform = {
  readonly crypto: {
    readonly subtle: {
      importKey(
        format: "raw",
        keyData: Uint8Array,
        algorithm: HmacAlgorithm,
        extractable: false,
        keyUsages: readonly ["sign"],
      ): Promise<unknown>;
      sign(
        algorithm: "HMAC",
        key: unknown,
        data: Uint8Array,
      ): Promise<ArrayBuffer>;
      digest(algorithm: "SHA-256", data: Uint8Array): Promise<ArrayBuffer>;
    };
  };
  readonly TextEncoder: new () => { encode(input: string): Uint8Array };
};

// Safe: every runtime that runs core provides these globals (see above).
const platform = globalThis as unknown as WebPlatform;

const HMAC_SHA_256: HmacAlgorithm = { name: "HMAC", hash: "SHA-256" };

const encode = (text: string): Uint8Array =>
  new platform.TextEncoder().encode(text);

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

/** SHA-256 of a UTF-8 text, as 64 hex characters. */
export const sha256Hex = async (text: string): Promise<string> =>
  toHex(await platform.crypto.subtle.digest("SHA-256", encode(text)));

/** HMAC-SHA-256 of a UTF-8 text with a secret key, as 64 hex characters. */
export const hmacSha256Hex = async (
  key: string,
  text: string,
): Promise<string> => {
  const { subtle } = platform.crypto;
  const cryptoKey = await subtle.importKey(
    "raw",
    encode(key),
    HMAC_SHA_256,
    false,
    ["sign"],
  );
  return toHex(await subtle.sign("HMAC", cryptoKey, encode(text)));
};
