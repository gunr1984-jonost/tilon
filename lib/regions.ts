/** Shared region constants — no server imports, safe for client and server. */

export const CITY_REGIONS = {
  "tel-aviv":    "תל אביב",
  "givatayim":   "גבעתיים",
  "rehovot":     "רחובות",
  "raanana":     "רעננה",
  "ness-ziyona": "נס ציונה",
} as const;

export type CityScope = keyof typeof CITY_REGIONS;
export type Scope = CityScope | "national";

/** English display labels for the scope selector dropdown. */
export const SCOPE_LABELS: Record<Scope, string> = {
  "tel-aviv":    "Tel Aviv",
  "givatayim":   "Givatayim",
  "rehovot":     "Rehovot",
  "raanana":     "Ra'anana",
  "ness-ziyona": "Ness Ziyona",
  "national":    "Nationwide",
};

/** Short subtitle shown below the logo. */
export const SCOPE_SUBTITLES: Record<Scope, string> = {
  "tel-aviv":    "Tel Aviv · Israel",
  "givatayim":   "Givatayim · Israel",
  "rehovot":     "Rehovot · Israel",
  "raanana":     "Ra'anana · Israel",
  "ness-ziyona": "Ness Ziyona · Israel",
  "national":    "Nationwide · Israel",
};

/** Ordered list for rendering the scope selector. */
export const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "tel-aviv",    label: "Tel Aviv"    },
  { value: "givatayim",   label: "Givatayim"   },
  { value: "rehovot",     label: "Rehovot"     },
  { value: "raanana",     label: "Ra'anana"    },
  { value: "ness-ziyona", label: "Ness Ziyona" },
  { value: "national",    label: "Nationwide"  },
];
