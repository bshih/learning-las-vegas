import type { BoundingBox, Coordinate, Intersection } from "../data/types";

export type MapMarkerKind = "guess" | "pending" | "correct";

export type MapMarker = {
  id: string;
  coordinate: Coordinate;
  kind: MapMarkerKind;
  label?: string;
};

export type GuessEvent = {
  coordinate: Coordinate;
};

export type StreetLineGeometry =
  | {
      type: "LineString";
      coordinates: number[][];
    }
  | {
      type: "MultiLineString";
      coordinates: number[][][];
    };

export type StreetFeature = {
  type: "Feature";
  properties: {
    id: string;
    name: string;
  };
  geometry: StreetLineGeometry;
};

export type StreetFeatureCollection = {
  type: "FeatureCollection";
  features: StreetFeature[];
};

export type HighlightedStreet = {
  id: string;
  kind: "answer" | "guess" | "neighbor";
  label?: string;
};

export type MapViewState = {
  bounds: BoundingBox;
  promptId?: string;
  correctGuess?: boolean;
  intersections?: readonly Intersection[];
  correctIntersection?: Intersection;
  markers?: readonly MapMarker[];
  pendingGuess?: Coordinate;
  streetGeometry?: StreetFeatureCollection;
  highlightedStreets?: readonly HighlightedStreet[];
  revealed?: boolean;
};

export type MapAdapter = {
  mount(container: HTMLElement): void;
  update(state: Partial<MapViewState>): void;
  destroy(): void;
};

export type MapAdapterOptions = {
  bounds: BoundingBox;
  onGuess: (event: GuessEvent) => void;
};
