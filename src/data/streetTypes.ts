import type { AreaBucketId } from "./types";

export type StreetId = string;

export type StreetAxis = "north-south" | "east-west" | "regional";

export type StreetDifficulty = "easy" | "medium" | "hard";

export type StreetDefinition = {
  id: StreetId;
  name: string;
  aliases: string[];
  axis: StreetAxis;
  areaIds: AreaBucketId[];
  difficulty: StreetDifficulty;
  teachingNote: string;
};

export type OrderedStreetGroup = {
  id: string;
  kind: "ordered";
  label: string;
  axis: Exclude<StreetAxis, "regional">;
  orderedDirection: "west-to-east" | "north-to-south";
  streetIds: StreetId[];
};

export type ShapeStreetGroup = {
  id: string;
  kind: "shape";
  label: string;
  axis: StreetAxis;
  streetIds: StreetId[];
};

export type StreetGroup = OrderedStreetGroup | ShapeStreetGroup;

export type StreetGeometryProperties = {
  id: StreetId;
  name: string;
};

export type StreetLineString = {
  type: "LineString";
  coordinates: [number, number][];
};

export type StreetMultiLineString = {
  type: "MultiLineString";
  coordinates: [number, number][][];
};

export type StreetFeature = {
  type: "Feature";
  properties: StreetGeometryProperties;
  geometry: StreetLineString | StreetMultiLineString;
};

export type StreetFeatureCollection = {
  type: "FeatureCollection";
  features: StreetFeature[];
};

export type StreetDataCatalog = {
  streets: StreetDefinition[];
  groups: StreetGroup[];
};
