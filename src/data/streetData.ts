import rawStreetGeometry from "./streets.geojson";
import rawStreetCatalog from "./streetGroups.json";
import type {
  StreetDataCatalog,
  StreetDefinition,
  StreetFeature,
  StreetFeatureCollection,
  StreetGroup,
} from "./streetTypes";

export type {
  OrderedStreetGroup,
  ShapeStreetGroup,
  StreetAxis,
  StreetDataCatalog,
  StreetDefinition,
  StreetDifficulty,
  StreetFeature,
  StreetFeatureCollection,
  StreetGeometryProperties,
  StreetGroup,
  StreetId,
  StreetLineString,
  StreetMultiLineString,
} from "./streetTypes";

export const streetDataCatalog = rawStreetCatalog as StreetDataCatalog;
export const streetDefinitions = streetDataCatalog.streets;
export const streetGroups = streetDataCatalog.groups;
export const streetGeometry = rawStreetGeometry as StreetFeatureCollection;

const definitionsById = new Map(streetDefinitions.map((street) => [street.id, street]));
const groupsById = new Map(streetGroups.map((group) => [group.id, group]));
const geometryById = new Map(
  streetGeometry.features.map((feature) => [feature.properties.id, feature]),
);
const definitionsByNormalizedName = new Map<string, StreetDefinition>();

for (const street of streetDefinitions) {
  for (const name of [street.name, ...street.aliases]) {
    definitionsByNormalizedName.set(normalizeStreetName(name), street);
  }
}

export function normalizeStreetName(value: string): string {
  const suffixes: Record<string, string> = {
    ave: "avenue",
    blvd: "boulevard",
    dr: "drive",
    hwy: "highway",
    pkwy: "parkway",
    rd: "road",
  };

  const words = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (["north", "south", "east", "west"].includes(words[0])) words.shift();
  if (words.length > 0) {
    words[words.length - 1] = suffixes[words.at(-1) || ""] || words.at(-1)!;
  }
  return words.join(" ");
}

export function getStreetDefinition(streetId: string): StreetDefinition | undefined {
  return definitionsById.get(streetId);
}

export function findStreetDefinition(nameOrAlias: string): StreetDefinition | undefined {
  return definitionsByNormalizedName.get(normalizeStreetName(nameOrAlias));
}

export function getStreetGroup(groupId: string): StreetGroup | undefined {
  return groupsById.get(groupId);
}

export function getStreetGeometry(streetId: string): StreetFeature | undefined {
  return geometryById.get(streetId);
}
