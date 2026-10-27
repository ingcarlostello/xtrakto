import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";
import { scrubCapture } from "./posthog-scrub.helpers";

// Invented values that the SDK's defaults, or a careless change, could send.
// None of them may reach PostHog.
const SEARCH = "transf%20a%20ana";
const URL_WITH_SEARCH = `https://xtrakto.site/transactions?q=${SEARCH}#jobs=1`;
const AMOUNT = "150000";
const NAME = "Ana Prueba";
const EMAIL = "ana.prueba@example.com";
const IP = "203.0.113.7";
const USER_AGENT = "Mozilla/5.0 (Macintosh; AnaPruebaBuild)";
const TIME_ZONE = "America/Bogota";
const PAGE_TITLE = "Resumen de tu cuenta de ahorros";
const LEAKS = [
  SEARCH,
  "transactions",
  AMOUNT,
  NAME,
  EMAIL,
  IP,
  USER_AGENT,
  TIME_ZONE,
  PAGE_TITLE,
];

const TIMESTAMP = new Date("2026-10-27T14:00:00Z");

// What PostHog needs to take the event in, and the browser it came from.
const DELIVERY = {
  token: "phc_projectKey",
  distinct_id: "0192d1c4-0000-7000-8000-00000000000a",
  $device_id: "0192d1c4-0000-7000-8000-00000000000b",
  $session_id: "0192d1c4-0000-7000-8000-00000000000c",
  $lib: "web",
  $lib_version: "1.438.21",
  $insert_id: "k3j2h1",
  $time: 1793109600,
  $browser: "Chrome",
  $os: "Mac OS X",
  $device_type: "Desktop",
  $host: "xtrakto.site",
};

const leakyCapture = (event: string): CaptureResult => ({
  uuid: "0192d1c4-0000-7000-8000-000000000001",
  event,
  properties: {
    ...DELIVERY,
    $window_id: "0192d1c4-0000-7000-8000-00000000000d",
    $process_person_profile: true,
    $current_url: URL_WITH_SEARCH,
    $pathname: "/transactions",
    $referrer: URL_WITH_SEARCH,
    $referring_domain: "xtrakto.site",
    $raw_user_agent: USER_AGENT,
    $screen_height: 900,
    $viewport_width: 1440,
    $timezone: TIME_ZONE,
    $ip: IP,
    $config_defaults: "2026-08-30",
    title: PAGE_TITLE,
    amount: AMOUNT,
    description: `TRANSF A ${NAME}`,
    $set: { name: NAME },
  },
  $set: { email: EMAIL },
  $set_once: { $initial_current_url: URL_WITH_SEARCH },
  timestamp: TIMESTAMP,
});

describe("scrubCapture", () => {
  it("keeps an event of the app with only what PostHog needs, no person and no city", () => {
    expect(scrubCapture(leakyCapture("summary_viewed"))).toEqual({
      uuid: "0192d1c4-0000-7000-8000-000000000001",
      event: "summary_viewed",
      properties: {
        ...DELIVERY,
        $process_person_profile: false,
        $geoip_disable: true,
      },
      timestamp: TIMESTAMP,
    });
  });

  it("lets no URL, search, amount, name, email, IP or browser detail through", () => {
    const sent = JSON.stringify(scrubCapture(leakyCapture("summary_viewed")));

    for (const leak of LEAKS) expect(sent).not.toContain(leak);
  });

  it("keeps the properties an event declares, and only those", () => {
    const capture = leakyCapture("statement_uploaded");
    const uploaded = {
      ...capture,
      properties: {
        ...capture.properties,
        format_id: "bancolombia-savings-quarterly",
        movements: "200-499",
        period: "2026-06-30",
        scope: "movement",
      },
    };

    expect(scrubCapture(uploaded)?.properties).toEqual({
      ...DELIVERY,
      format_id: "bancolombia-savings-quarterly",
      movements: "200-499",
      $process_person_profile: false,
      $geoip_disable: true,
    });
  });

  it.each([
    "$pageview",
    "$pageleave",
    "$autocapture",
    "$rageclick",
    "$opt_in",
    "$identify",
    "$set",
    "$exception",
    "$web_vitals",
    "summary_shared",
  ])("drops %s, which isn't one of the app's events", (event) => {
    expect(scrubCapture(leakyCapture(event))).toBeNull();
  });

  it("leaves the event it was given untouched", () => {
    const capture = leakyCapture("summary_viewed");
    const before = structuredClone(capture);

    scrubCapture(capture);

    expect(capture).toEqual(before);
  });
});
