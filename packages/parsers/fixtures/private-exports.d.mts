/**
 * The bytes of each real export (`.xlsx`) in `fixtures/private/` and its
 * folders but the cards', in path order; empty when there are none.
 */
export declare const readPrivateExports: () => Promise<Uint8Array[]>;

/**
 * The bytes of each real PDF in `fixtures/private/` and its folders but the
 * cards', in path order; empty when there are none.
 */
export declare const readPrivatePdfs: () => Promise<Uint8Array[]>;

/**
 * The bytes of each real Bancolombia card statement in Excel, in
 * `fixtures/private/tarjeta/` (Stage 12), in path order; empty when there
 * are none.
 */
export declare const readPrivateCardExports: () => Promise<Uint8Array[]>;

/**
 * The bytes of each real Bancolombia card statement in PDF, in
 * `fixtures/private/tarjeta/` (Stage 12), in path order; empty when there
 * are none.
 */
export declare const readPrivateCardPdfs: () => Promise<Uint8Array[]>;
