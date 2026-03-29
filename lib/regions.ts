/** Shared region constants — no server imports, safe for client and server. */

export const CITY_REGIONS = {
  "ein-hod":            "עין הוד",
  "etz-efraim":         "עץ אפרים",
  "givatayim":          "גבעתיים",
  "kfar-sava":          "כפר סבא",
  "lod":                "לוד",
  "mevaseret-zion":     "מבשרת ציון",
  "netaim":             "נטעים",
  "ness-ziyona":        "נס ציונה",
  "petah-tikva":        "פתח תקווה",
  "raanana":            "רעננה",
  "rehovot":            "רחובות",
  "rishon-lezion-east": "ראשון לציון - מזרח",
  "rishon-lezion-west": "ראשון לציון - מערב",
  "tel-aviv":           "תל אביב",
} as const;

export type CityScope = keyof typeof CITY_REGIONS;
export type Scope = CityScope | "national";

/** English display labels for the scope selector dropdown. */
export const SCOPE_LABELS: Record<Scope, string> = {
  "ein-hod":            "Ein Hod",
  "etz-efraim":         "Etz Efraim",
  "givatayim":          "Givatayim",
  "kfar-sava":          "Kfar Sava",
  "lod":                "Lod",
  "mevaseret-zion":     "Mevaseret Zion",
  "netaim":             "Netaim",
  "ness-ziyona":        "Ness Ziyona",
  "petah-tikva":        "Petah Tikva",
  "raanana":            "Ra'anana",
  "rehovot":            "Rehovot",
  "rishon-lezion-east": "Rishon LeZion East",
  "rishon-lezion-west": "Rishon LeZion West",
  "tel-aviv":           "Tel Aviv",
  "national":           "Nationwide",
};

/** Short subtitle shown below the logo. */
export const SCOPE_SUBTITLES: Record<Scope, string> = {
  "ein-hod":            "Ein Hod · Israel",
  "etz-efraim":         "Etz Efraim · Israel",
  "givatayim":          "Givatayim · Israel",
  "kfar-sava":          "Kfar Sava · Israel",
  "lod":                "Lod · Israel",
  "mevaseret-zion":     "Mevaseret Zion · Israel",
  "netaim":             "Netaim · Israel",
  "ness-ziyona":        "Ness Ziyona · Israel",
  "petah-tikva":        "Petah Tikva · Israel",
  "raanana":            "Ra'anana · Israel",
  "rehovot":            "Rehovot · Israel",
  "rishon-lezion-east": "Rishon LeZion East · Israel",
  "rishon-lezion-west": "Rishon LeZion West · Israel",
  "tel-aviv":           "Tel Aviv · Israel",
  "national":           "Nationwide · Israel",
};

/** Ordered list for rendering the scope selector. */
export const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "ein-hod",            label: "Ein Hod"             },
  { value: "etz-efraim",         label: "Etz Efraim"          },
  { value: "givatayim",          label: "Givatayim"           },
  { value: "kfar-sava",          label: "Kfar Sava"           },
  { value: "lod",                label: "Lod"                 },
  { value: "mevaseret-zion",     label: "Mevaseret Zion"      },
  { value: "netaim",             label: "Netaim"              },
  { value: "ness-ziyona",        label: "Ness Ziyona"         },
  { value: "petah-tikva",        label: "Petah Tikva"         },
  { value: "raanana",            label: "Ra'anana"            },
  { value: "rehovot",            label: "Rehovot"             },
  { value: "rishon-lezion-east", label: "Rishon LeZion East"  },
  { value: "rishon-lezion-west", label: "Rishon LeZion West"  },
  { value: "tel-aviv",           label: "Tel Aviv"            },
  { value: "national",           label: "Nationwide"          },
];
