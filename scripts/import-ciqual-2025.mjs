import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { XMLParser } from "fast-xml-parser";

const SOURCE_FILES = [
  {
    name: "alim_2025_11_03.xml",
    persistentId: "doi:10.57745/OH8KXC",
    md5: "8e1171d63cee4b6010cfce25dd29243d",
  },
  {
    name: "alim_grp_2025_11_03.xml",
    persistentId: "doi:10.57745/FMNIUZ",
    md5: "c31aeea90349c3aab86f98ef5f4f10da",
  },
  {
    name: "const_2025_11_03.xml",
    persistentId: "doi:10.57745/FWSPCX",
    md5: "d8f2f25fdacb887bc993a6eeaf80f203",
  },
  {
    name: "compo_2025_11_03.xml",
    persistentId: "doi:10.57745/O73GDX",
    md5: "2da725585946434df320d8041631998b",
  },
];

const SOURCE = {
  id: "ciqual-2025",
  sourceVersion: "2025",
  datasetDoi: "10.57745/RDMHWY",
  datasetUrl: "https://doi.org/10.57745/RDMHWY",
  producer: "Anses",
  license: "Etalab Open License 2.0",
  citation:
    "Anses. 2025. Table de composition nutritionnelle des aliments Ciqual 2025. https://doi.org/10.57745/RDMHWY",
  publicationDate: "2025-11-19",
  sourceFileDate: "2025-11-03",
};

const NUTRIENT_CODES = {
  energyKcal: "328",
  proteinsG: "25000",
  carbohydratesG: "31000",
  sugarsG: "32000",
  fatG: "40000",
  saturatedFatG: "40302",
  fiberG: "34100",
  saltG: "10004",
  sodiumMg: "10110",
};

const NUTRIENT_KEYS = Object.keys(NUTRIENT_CODES);
const INDEX_FIELDS = [
  "code",
  "name",
  "groupName",
  "subGroupName",
  "subSubGroupName",
  "normalizedName",
];
const SOURCE_DIR = getArg("--source-dir") ?? "/tmp/ciqual-2025";
const OUT_DIR = getArg("--out-dir") ?? "src/lib/nutrition/generated";
const IMPORT_DATE = getArg("--import-date") ?? SOURCE.sourceFileDate;

if (!/^\d{4}-\d{2}-\d{2}$/.test(IMPORT_DATE)) {
  throw new Error("--import-date must use YYYY-MM-DD format");
}

const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

await mkdir(SOURCE_DIR, { recursive: true });
await mkdir(OUT_DIR, { recursive: true });

const files = {};
for (const file of SOURCE_FILES) {
  const path = join(SOURCE_DIR, file.name);
  files[file.name] = await readVerifiedSourceFile(file, path);
}

const foods = tableRows(files["alim_2025_11_03.xml"], "ALIM");
const groups = tableRows(files["alim_grp_2025_11_03.xml"], "ALIM_GRP");
const constituents = tableRows(files["const_2025_11_03.xml"], "CONST");
const compositions = tableRows(files["compo_2025_11_03.xml"], "COMPO");
const groupLookup = buildGroupLookup(groups);
const nutrientCodeToKey = Object.fromEntries(
  Object.entries(NUTRIENT_CODES).map(([key, code]) => [code, key]),
);
const nutrientNames = buildNutrientNames(constituents);
const nutrientsByFood = initializeNutrients(foods);

for (const row of compositions) {
  const foodCode = text(row.alim_code);
  const nutrientKey = nutrientCodeToKey[text(row.const_code)];
  if (!nutrientKey || !nutrientsByFood.has(foodCode)) continue;
  nutrientsByFood.get(foodCode)[nutrientKey] = parseNumericFoodValue(row.teneur);
}

const metadata = {
  ...SOURCE,
  importDate: IMPORT_DATE,
  foodCount: foods.length,
  nutrientCount: constituents.length,
  sourceFiles: SOURCE_FILES.map((file) => ({
    name: file.name,
    persistentId: file.persistentId,
    url: downloadUrl(file.persistentId),
    md5: file.md5,
  })),
};

const indexFoods = foods
  .map((food) => {
    const code = text(food.alim_code);
    const group = groupLookup.get(groupKey(food.alim_grp_code, food.alim_ssgrp_code, food.alim_ssssgrp_code));
    const name = text(food.alim_nom_fr);
    const groupName = group?.groupName ?? null;
    const subGroupName = group?.subGroupName ?? null;
    const subSubGroupName = group?.subSubGroupName ?? null;
    return {
      code,
      name,
      groupName,
      subGroupName,
      subSubGroupName,
      normalizedName: normalizeFoodLabel(name),
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

const nutrientFoods = indexFoods.map((food) => ({
  code: food.code,
  name: food.name,
  groupName: food.groupName,
  subGroupName: food.subGroupName,
  subSubGroupName: food.subSubGroupName,
  nutrientsPer100g: nutrientsByFood.get(food.code),
}));

await writeJson("ciqual-2025-index.json", {
  metadata,
  fields: INDEX_FIELDS,
  foods: indexFoods.map((food) => INDEX_FIELDS.map((field) => food[field])),
});
await writeJson("ciqual-2025-nutrients.json", {
  metadata: {
    ...metadata,
    nutrientSourceCodes: Object.fromEntries(
      Object.entries(NUTRIENT_CODES).map(([key, code]) => [
        key,
        {
          ciqualCode: code,
          name: nutrientNames.get(code) ?? null,
        },
      ]),
    ),
  },
  foods: nutrientFoods,
});

console.log(
  `Imported ${indexFoods.length} Ciqual foods and ${NUTRIENT_KEYS.length} nutrient fields.`,
);

async function readVerifiedSourceFile(file, path) {
  let buffer;
  try {
    buffer = await readFile(path);
  } catch {
    const response = await fetch(downloadUrl(file.persistentId));
    if (!response.ok) {
      throw new Error(`Unable to download ${file.name}: ${response.status}`);
    }
    buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(path, buffer);
  }

  const actualMd5 = createHash("md5").update(buffer).digest("hex");
  if (actualMd5 !== file.md5) {
    throw new Error(
      `${file.name} MD5 mismatch: expected ${file.md5}, got ${actualMd5}`,
    );
  }

  return parser.parse(buffer.toString("utf8").replace(/^\uFEFF/, ""));
}

function downloadUrl(persistentId) {
  return `https://entrepot.recherche.data.gouv.fr/api/access/datafile/:persistentId?persistentId=${persistentId}`;
}

function tableRows(document, key) {
  const rows = document?.TABLE?.[key];
  if (!Array.isArray(rows)) {
    throw new Error(`Missing TABLE.${key} in source XML`);
  }
  return rows;
}

function buildGroupLookup(groups) {
  const lookup = new Map();
  for (const group of groups) {
    lookup.set(
      groupKey(group.alim_grp_code, group.alim_ssgrp_code, group.alim_ssssgrp_code),
      {
        groupName: dashToNull(text(group.alim_grp_nom_fr)),
        subGroupName: dashToNull(text(group.alim_ssgrp_nom_fr)),
        subSubGroupName: dashToNull(text(group.alim_ssssgrp_nom_fr)),
      },
    );
  }
  return lookup;
}

function buildNutrientNames(constituents) {
  return new Map(
    constituents.map((constituent) => [
      text(constituent.const_code),
      text(constituent.const_nom_fr),
    ]),
  );
}

function initializeNutrients(foods) {
  const empty = Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [
      key,
      {
        value: null,
        qualifier: "unknown",
      },
    ]),
  );

  return new Map(
    foods.map((food) => [
      text(food.alim_code),
      JSON.parse(JSON.stringify(empty)),
    ]),
  );
}

function groupKey(groupCode, subGroupCode, subSubGroupCode) {
  return [groupCode, subGroupCode, subSubGroupCode].map(text).join(":");
}

function text(value) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return "";
}

function dashToNull(value) {
  return value && value !== "-" ? value : null;
}

function parseNumericFoodValue(value) {
  const raw = text(value);
  if (!raw || raw === "-" || raw.toLowerCase() === "traces") {
    return { value: null, qualifier: "unknown" };
  }

  if (raw.startsWith("<")) {
    const parsed = Number(raw.slice(1).trim().replace(",", "."));
    return Number.isFinite(parsed)
      ? { value: parsed, qualifier: "less_than" }
      : { value: null, qualifier: "unknown" };
  }

  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed)
    ? { value: parsed, qualifier: "exact" }
    : { value: null, qualifier: "unknown" };
}

function normalizeFoodLabel(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function writeJson(fileName, payload) {
  await writeFile(
    join(OUT_DIR, basename(fileName)),
    `${JSON.stringify(payload)}\n`,
  );
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}
