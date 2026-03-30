/** Shared region constants — no server imports, safe for client and server. */

export const CITY_REGIONS = {
  "bitzaron":           "ביצרון",
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
  "rosh-haein":         "ראש העין",
  "tel-aviv-center":   "תל אביב - מרכז העיר",
  "tel-aviv-east":     "תל אביב - מזרח",
  "tel-aviv-north":    "תל אביב - עבר הירקון",
  "tel-aviv-south":    "תל אביב - דרום העיר ויפו",
} as const;

export type CityScope = keyof typeof CITY_REGIONS;
export type Scope = CityScope | "national";

/** English display labels for the scope selector dropdown. */
export const SCOPE_LABELS: Record<Scope, string> = {
  "bitzaron":           "Bitzaron",
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
  "rosh-haein":         "Rosh HaEin",
  "tel-aviv-center":   "Tel Aviv - Center",
  "tel-aviv-east":     "Tel Aviv - East",
  "tel-aviv-north":    "Tel Aviv - North",
  "tel-aviv-south":    "Tel Aviv - South & Jaffa",
  "national":           "Nationwide",
};

/** Short subtitle shown below the logo. */
export const SCOPE_SUBTITLES: Record<Scope, string> = {
  "bitzaron":           "Bitzaron · Israel",
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
  "rosh-haein":         "Rosh HaEin · Israel",
  "tel-aviv-center":   "Tel Aviv Center · Israel",
  "tel-aviv-east":     "Tel Aviv East · Israel",
  "tel-aviv-north":    "Tel Aviv North · Israel",
  "tel-aviv-south":    "Tel Aviv South & Jaffa · Israel",
  "national":           "Nationwide · Israel",
};

/** Ordered list for rendering the scope selector. */
export const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: "bitzaron",           label: "Bitzaron"            },
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
  { value: "rishon-lezion-west", label: "Rishon LeZion West"      },
  { value: "rosh-haein",         label: "Rosh HaEin"              },
  { value: "tel-aviv-center",   label: "Tel Aviv - Center"        },
  { value: "tel-aviv-east",     label: "Tel Aviv - East"          },
  { value: "tel-aviv-north",    label: "Tel Aviv - North"         },
  { value: "tel-aviv-south",    label: "Tel Aviv - South & Jaffa" },
  { value: "national",           label: "Nationwide"              },
];
