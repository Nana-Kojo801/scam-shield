import type { Signal } from "./types";

type Rule = (text: string) => Signal[];

const MAX_EVIDENCE = 6;

/** All matches of `re` in the original text (case-insensitive). Returns exact substrings. */
function findAll(text: string, re: RegExp): string[] {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const rx = new RegExp(re.source, flags.includes("i") ? flags : flags + "i");
  return Array.from(text.matchAll(rx), (m) => m[0]);
}

/** Drops case-insensitive duplicates and any item contained in a longer item. */
function dedupe(items: string[]): string[] {
  const unique = Array.from(new Map(items.map((i) => [i.toLowerCase(), i])).values());
  const kept = unique.filter(
    (item) => !unique.some((other) => other !== item && other.toLowerCase().includes(item.toLowerCase())),
  );
  return kept.slice(0, MAX_EVIDENCE);
}

function signal(id: string, label: string, weight: number, evidence: string[]): Signal[] {
  const ev = dedupe(evidence);
  return ev.length ? [{ id, label, weight, evidence: ev }] : [];
}

function anyOf(text: string, patterns: RegExp[]): string[] {
  return patterns.flatMap((p) => findAll(text, p));
}

const NEGATION = /\b(?:never|not|don['’]?t|dont|won['’]?t|will not|do not)\b/i;

/** True when the 30 characters before `index` negate the phrase ("never share your PIN"). */
function isNegated(text: string, index: number): boolean {
  return NEGATION.test(text.slice(Math.max(0, index - 30), index));
}

// ---------------------------------------------------------------------------
// Message-text rules
// ---------------------------------------------------------------------------

export const urgency: Rule = (text) =>
  signal(
    "urgency",
    "Urgency or pressure",
    3,
    anyOf(text, [
      /\bact (?:now|immediately|fast|quickly|today)\b/,
      /\bwithin (?:the next )?\d+\s*(?:hours?|hrs?|minutes?|mins?)\b/,
      /\bwithin (?:1|2|3|one|two|three) days?\b/,
      /\bimmediately\b/,
      /\burgent(?:ly)?\b/,
      /\bright away\b/,
      /\b(?:last|final) (?:warning|notice|chance|reminder)\b/,
      /\b(?:offer|link|access) expires?\b/,
      /\b(?:account|card|access|service|profile)\b[^.!?\n]{0,40}\b(?:will be|has been|is being|is about to be)\s+(?:closed|suspended|locked|terminated|deactivated|disabled|blocked|restricted)\b/,
    ]),
  );

export const threats: Rule = (text) =>
  signal(
    "threats",
    "Threats or penalties",
    4,
    anyOf(text, [
      /\blegal action\b/,
      /\b(?:arrest(?:ed)?|arrest warrant|warrant (?:for|out for) your)\b/,
      /\b(?:lawsuit|prosecut\w*|criminal charges?)\b/,
      /\b(?:pay|face|incur)\b[^.!?\n]{0,20}\b(?:a )?fines?\b/,
      /\bdeactivat(?:ed|ion|e)\b/,
      /\b(?:package|parcel|delivery|order)\b[^.!?\n]{0,30}\bwill be (?:returned|destroyed|discarded)\b/,
      /\b(?:frozen|seized|confiscated)\b/,
    ]),
  );

export const unusualPayment: Rule = (text) => {
  const evidence = anyOf(text, [
    /\b(?:gift ?cards?|itunes cards?|google play cards?|steam cards?|prepaid cards?)\b/,
    /\b(?:bitcoin|btc|ethereum|usdt|crypto(?:currency)?|bitcoin atm)\b/,
    /\b(?:wire (?:transfer|the money|funds)|western union|moneygram)\b/,
    /\b(?:send|pay|transfer|deposit)\b[^.!?\n]{0,40}\b(?:zelle|cash ?app|venmo|mobile money|momo)\b/,
    /\b(?:small|processing|handling|customs|clearance|release|redelivery|delivery|unlock)\s+fee\b/,
    /\bpay\b[^.!?\n]{0,30}\bfee\b/,
  ]);
  return signal("unusual_payment", "Unusual payment method or fee", 5, evidence);
};

export const credentialRequest: Rule = (text) => {
  const asks = new RegExp(
    String.raw`\b(?:send|share|reply with|provide|give|tell|read out|enter|submit|text)\b[^.!?\n]{0,40}\b(?:password|passcode|pin(?: number| code)?|otp|one[- ]time (?:code|password|passcode)|verification code|security code|authenticat(?:ion|or) code|cvv|card number|account number|ssn|social security number)\b`,
    "gi",
  );
  const evidence = Array.from(text.matchAll(asks))
    .filter((m) => !isNegated(text, m.index ?? 0))
    .map((m) => m[0]);
  evidence.push(
    ...anyOf(text, [
      /\bconfirm your (?:details|identity|account|information|password|card)\b/,
      /\bverify your (?:account|identity|details|information|card)\b/,
      /\bupdate your (?:payment|billing|card|account|bank) (?:details|information)\b/,
      /\blog ?in to (?:confirm|verify|restore|unlock)\b/,
    ]),
  );
  return signal("credential_request", "Asks for codes, passwords or personal details", 5, evidence);
};

export const impersonation: Rule = (text) =>
  signal(
    "impersonation",
    "Claims to be an institution or someone you know",
    2,
    anyOf(text, [
      /\b(?:your|the) bank\b/,
      /\b(?:fraud|security) (?:department|team|alert|desk)\b/,
      /\b(?:tax|revenue|immigration|customs) (?:authority|office|service|agency|department)\b/,
      /\b(?:police|government|court) (?:department|office|notice|order)\b/,
      /\btech(?:nical)? support\b|\bhelp ?desk\b|\bit department\b/,
      /\b(?:post office|courier|delivery company)\b/,
      /\b(?:human resources|hr department|your employer)\b/,
      /\bhi (?:mum|mom|dad|mama|papa)\b/,
      /\b(?:this is my new number|i lost my phone|i['’]?m in (?:trouble|jail|hospital))\b/,
      /\bneed (?:money|help) (?:urgently|asap|now)\b/,
    ]),
  );

export const tooGoodToBeTrue: Rule = (text) =>
  signal(
    "too_good_to_be_true",
    "Prize, refund or too-good offer",
    3,
    anyOf(text, [
      /\byou(?:['’]ve| have)? (?:won|been selected|been chosen)\b/,
      /\b(?:lottery|jackpot|sweepstakes?)\b/,
      /\bcongratulations\b/,
      /\bunclaimed (?:funds|refund|prize|package)\b/,
      /\b(?:tax |unexpected )?refund\b/,
      /\bguaranteed (?:returns?|profits?|income)\b/,
      /\bearn \$?€?£?\d[\d,]*\s*(?:per|a|\/)\s*(?:day|hour|week)\b/,
      /\b(?:no experience (?:needed|required)|work from home)\b/,
      /\bdouble your (?:money|investment)\b/,
    ]),
  );

export const secrecy: Rule = (text) =>
  signal(
    "secrecy",
    "Asks for secrecy or isolation",
    4,
    anyOf(text, [
      /\b(?:do not|don['’]?t|dont) (?:tell|mention|share this with|let) (?:anyone|anybody|your (?:family|bank|friends?)|them)\b/,
      /\bkeep (?:this|it) (?:between us|secret|confidential|quiet|private)\b/,
      /\bour (?:little )?secret\b/,
    ]),
  );

export const genericGreeting: Rule = (text) =>
  signal(
    "generic_greeting",
    "Generic greeting",
    1,
    anyOf(text, [
      /\bdear (?:customer|user|client|member|valued\s+\w+|account holder|sir\/madam|sir or madam|sir|madam|beneficiary|friend)\b/,
    ]),
  );

/** Text aimed at an AI model rather than a human reader. A real message has no reason to contain it. */
export const promptInjection: Rule = (text) =>
  signal(
    "prompt_injection",
    "Contains instructions aimed at an AI checker",
    3,
    anyOf(text, [
      /\bignore (?:all |any )?(?:the )?(?:previous|prior|above|earlier) (?:instructions|rules|prompts?)\b/,
      /\bdisregard (?:all |any )?(?:the )?(?:previous|prior|above|earlier|your) (?:instructions|rules|prompts?)\b/,
      /\b(?:system prompt|developer message|test mode|jailbreak)\b/,
      /\byou are now (?:a|an|in)\b/,
      /\b(?:respond|reply|answer|output) with (?:the )?(?:verdict|json|likely_legit|likely_scam)\b/,
    ]),
  );

export const wrongNumberRapport: Rule = (text) => {
  const opener = anyOf(text, [
    /\b(?:hi|hello|hey)[,!.]?\s+is this \w+\s*\?/,
    /\bsorry,? (?:wrong|I got the wrong) number\b/,
    /\bwrong number\b/,
    /\bdid I (?:get|reach) the right number\b/,
    /\b(?:we met|met you) (?:at|through|via|on)\b/,
  ]);
  if (!opener.length) return [];
  const pivot = anyOf(text, [
    /\b(?:invest(?:ing|ment|ments)?|crypto(?:currency)?|forex|trading platform|trading|profits?|returns on|passive income)\b/,
  ]);
  return signal(
    "wrong_number_rapport",
    pivot.length ? "Friendly opener that pivots to money or investing" : "Wrong-number or rapport opener",
    pivot.length ? 4 : 2,
    [...opener, ...pivot],
  );
};

// ---------------------------------------------------------------------------
// Link rules (string analysis only; URLs are never fetched or resolved)
// ---------------------------------------------------------------------------

const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly",
  "rb.gy", "shorturl.at", "tiny.cc", "rebrand.ly", "t.ly", "s.id", "lnkd.in",
];

const ODD_TLDS = [
  "xyz", "top", "click", "zip", "mov", "icu", "buzz", "work", "cam", "loan", "gq", "tk",
  "ml", "cf", "ga", "rest", "monster", "sbs", "cyou", "vip", "support", "country", "men",
];

const COMMON_TLDS = [
  "com", "net", "org", "io", "co", "info", "biz", "me", "app", "dev", "online", "site",
  "shop", "store", "ly", "link", "page", "us", "uk", "de", "fr", "in", "ng", "gh", "za", "ke",
];

/** Widely impersonated brand names, used only for domain-vs-text mismatch checks. */
const BRANDS = [
  "paypal", "amazon", "apple", "microsoft", "google", "netflix", "dhl", "fedex", "ups", "usps",
  "whatsapp", "facebook", "instagram", "coinbase", "binance", "dropbox", "docusign", "linkedin",
  "chase", "wellsfargo", "hsbc", "barclays", "santander", "citibank",
];

const SECURITY_WORDS = ["secure", "login", "signin", "verify", "verification", "account", "update", "support", "billing", "alert", "confirm", "unlock", "recover"];

const SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "ac", "edu"]);

const URL_RE = new RegExp(
  String.raw`\b(?:https?:\/\/|www\.)[^\s<>"'\])]+|\b(?:[a-z0-9-]+\.)+(?:${[...SHORTENERS.map((s) => s.split(".").pop()!), ...ODD_TLDS, ...COMMON_TLDS].join("|")})\b(?:\/[^\s<>"'\])]*)?`,
  "gi",
);

type ParsedUrl = { raw: string; host: string; registrable: string; tld: string };

function stripTrailingPunct(s: string): string {
  return s.replace(/[.,;:!?]+$/, "");
}

function parseHost(raw: string): string {
  let rest = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  rest = rest.split(/[/?#]/)[0];
  const at = rest.lastIndexOf("@");
  if (at !== -1) rest = rest.slice(at + 1);
  return rest.replace(/:\d+$/, "").toLowerCase();
}

function registrableDomain(host: string): string {
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const last = labels[labels.length - 1];
  const second = labels[labels.length - 2];
  if (last.length === 2 && SECOND_LEVEL.has(second)) return labels.slice(-3).join(".");
  return labels.slice(-2).join(".");
}

export function extractUrls(text: string): ParsedUrl[] {
  const seen = new Set<string>();
  const out: ParsedUrl[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const raw = stripTrailingPunct(m[0]);
    if (seen.has(raw.toLowerCase())) continue;
    seen.add(raw.toLowerCase());
    const host = parseHost(raw);
    if (!host.includes(".")) continue;
    out.push({ raw, host, registrable: registrableDomain(host), tld: host.split(".").pop()! });
  }
  return out;
}

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export const linkRedFlags: Rule = (text) => {
  const urls = extractUrls(text);
  if (!urls.length) return [];

  const shortened = urls.filter((u) => SHORTENERS.includes(u.registrable));
  const rawIp = urls.filter((u) => IPV4.test(u.host));
  const atSign = urls.filter((u) => /^(?:[a-z][a-z0-9+.-]*:\/\/)?[^/?#]*@/i.test(u.raw));
  const oddTld = urls.filter((u) => ODD_TLDS.includes(u.tld));

  const lookalike = urls.filter((u) => {
    if (IPV4.test(u.host) || SHORTENERS.includes(u.registrable)) return false;
    const base = u.registrable.split(".")[0];
    const brandInHost = BRANDS.find((b) => u.host.includes(b));
    if (brandInHost && base !== brandInHost) return true; // brand plus extra words or subdomain trick
    const parts = base.split("-");
    return parts.length >= 2 && parts.some((p) => SECURITY_WORDS.includes(p));
  });

  const lower = text.toLowerCase();
  const mentioned = BRANDS.filter((b) => new RegExp(`\\b${b}\\b`).test(lower));
  const mismatch = mentioned.length
    ? urls.filter(
        (u) =>
          !IPV4.test(u.host) &&
          !SHORTENERS.includes(u.registrable) &&
          !mentioned.some((b) => u.host.includes(b)) &&
          !lookalike.includes(u),
      )
    : [];

  return [
    ...signal("link_shortener", "Shortened link hides the real destination", 3, shortened.map((u) => u.raw)),
    ...signal("link_raw_ip", "Link points to a raw IP address", 4, rawIp.map((u) => u.raw)),
    ...signal("link_at_sign", "Link contains @, which can disguise the real site", 4, atSign.map((u) => u.raw)),
    ...signal("link_odd_tld", "Link uses an unusual domain ending", 2, oddTld.map((u) => u.raw)),
    ...signal("link_lookalike", "Link looks like a known brand but is not its real domain", 4, lookalike.map((u) => u.raw)),
    ...signal("link_brand_mismatch", "Message names a brand but the link goes elsewhere", 3, mismatch.map((u) => u.raw)),
  ];
};

// ---------------------------------------------------------------------------

export const RULES: Rule[] = [
  urgency,
  threats,
  unusualPayment,
  credentialRequest,
  linkRedFlags,
  impersonation,
  tooGoodToBeTrue,
  secrecy,
  genericGreeting,
  wrongNumberRapport,
  promptInjection,
];

export function runRules(text: string): Signal[] {
  return RULES.flatMap((rule) => rule(text));
}

export function totalWeight(signals: Signal[]): number {
  return signals.reduce((sum, s) => sum + s.weight, 0);
}
