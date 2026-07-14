import type { BoundingBox, Coordinate, Intersection } from "../data/types";

export type MapMarkerKind = "guess" | "correct";

export type MapMarker = {
  id: string;
  coordinate: Coordinate;
  kind: MapMarkerKind;
  label?: string;
};

export type GuessEvent = {
  coordinate: Coordinate;
};

export type MapViewState = {
  bounds: BoundingBox;
  correctGuess?: boolean;
  intersections?: readonly Intersection[];
  correctIntersection?: Intersection;
  markers?: readonly MapMarker[];
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
