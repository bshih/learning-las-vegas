import maplibregl, {
  type FilterSpecification,
  type GeoJSONSource,
  type IControl,
  type Map as MapLibreMap,
  type Marker,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { BoundingBox, Coordinate } from "../data/types";
import type {
  MapAdapter,
  MapAdapterOptions,
  MapMarker,
  MapViewState,
} from "./types";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/bright";
const ATLAS_FONT_REQUESTS = [
  '500 16px "Barlow Condensed"',
  '600 16px "Barlow Condensed"',
  '500 16px "Jost"',
  '700 16px "Jost"',
];
const DEFAULT_VIEW_BOUNDS: BoundingBox = {
  southwest: { lat: 35.96, lon: -115.38 },
  northeast: { lat: 36.31, lon: -114.96 },
};
const PAN_LIMIT_BOUNDS: BoundingBox = {
  southwest: { lat: 35.92, lon: -115.42 },
  northeast: { lat: 36.35, lon: -114.9 },
};
const STREET_SOURCE_ID = "melissa-map-streets";
const STREET_BASE_LAYER_ID = "melissa-map-streets-base";
const STREET_NEIGHBOR_LAYER_ID = "melissa-map-streets-neighbor";
const STREET_GUESS_LAYER_ID = "melissa-map-streets-guess";
const STREET_ANSWER_LAYER_ID = "melissa-map-streets-answer";
const STREET_LABEL_LAYER_ID = "melissa-map-streets-label";
const EMPTY_STREET_COLLECTION = {
  type: "FeatureCollection" as const,
  features: [],
};

type LabelVisibility = "none" | "visible";
type MarkerLabelPlacement = "left" | "right";

class ResetMapControl implements IControl {
  private container?: HTMLDivElement;

  constructor(private readonly onReset: () => void) {}

  onAdd(): HTMLElement {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "maplibre-reset-control";
    button.title = "Reset map";
    button.setAttribute("aria-label", "Reset map");
    button.textContent = "\u21bb";
    button.addEventListener("click", this.onReset);

    container.append(button);
    this.container = container;
    return container;
  }

  onRemove(): void {
    this.container?.remove();
    this.container = undefined;
  }
}

export class MapLibreMapAdapter implements MapAdapter {
  private container?: HTMLElement;
  private map?: MapLibreMap;
  private resizeObserver?: ResizeObserver;
  private markers: Marker[] = [];
  private symbolLayers: Array<{
    id: string;
    visibility: LabelVisibility;
  }> = [];
  private minimumZoom?: number;
  private state: MapViewState;

  constructor(private readonly options: MapAdapterOptions) {
    this.state = {
      bounds: options.bounds,
      intersections: [],
      markers: [],
      revealed: false,
    };
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.replaceChildren();
    container.classList.add("maplibre-map", "maplibre-map-loading");

    const map = new maplibregl.Map({
      container,
      bounds: toMapLibreBounds(this.state.bounds),
      fitBoundsOptions: { padding: 16 },
      maxBounds: toMapLibreBounds(PAN_LIMIT_BOUNDS),
      maxZoom: 18,
      dragRotate: false,
      touchPitch: false,
      attributionControl: { compact: false },
      fadeDuration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 180,
    });
    this.map = map;
    map.touchZoomRotate.disableRotation();

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true,
      }),
      "top-left",
    );
    map.addControl(new ResetMapControl(() => this.resetView()), "top-left");

    void this.loadAtlasStyle(map);

    map.on("click", (event) => {
      if (this.state.revealed) return;

      this.options.onGuess({
        coordinate: {
          lat: event.lngLat.lat,
          lon: event.lngLat.lng,
        },
      });
    });

    map.on("style.load", () => {
      this.captureSymbolLayers();
      this.ensureStreetLayers();
      this.renderStreetGeometry();
      this.applyLabelVisibility();
      container.classList.remove("maplibre-map-loading");
      this.renderMarkers();
    });

    map.once("load", () => {
      this.applyLabelVisibility();
      this.renderStreetGeometry();
      this.minimumZoom = map.getZoom();
      map.setMinZoom(this.minimumZoom);
    });

    this.resizeObserver = new ResizeObserver(() => map.resize());
    this.resizeObserver.observe(container);
  }

  private async loadAtlasStyle(map: MapLibreMap): Promise<void> {
    try {
      await Promise.all(ATLAS_FONT_REQUESTS.map((font) => document.fonts.load(font)));
    } catch {
      // The style includes durable platform fallbacks if the web fonts are unavailable.
    }

    if (this.map !== map) return;

    map.setStyle(OPENFREEMAP_STYLE, {
      transformStyle: (_previousStyle, nextStyle) => applyAtlasMapTypography(nextStyle),
    });
  }

  update(state: Partial<MapViewState>): void {
    const wasRevealed = Boolean(this.state.revealed);
    const previousPromptId = this.state.promptId;
    const previousAnswerId = this.state.correctIntersection?.id;
    this.state = {
      ...this.state,
      ...state,
      markers: state.markers ?? this.state.markers,
    };

    if (
      !this.state.revealed &&
      (wasRevealed ||
        (this.state.promptId !== undefined &&
          this.state.promptId !== previousPromptId) ||
        this.state.correctIntersection?.id !== previousAnswerId)
    ) {
      this.resetView();
    }

    if (this.state.revealed !== wasRevealed) {
      this.applyLabelVisibility();
    }

    this.renderStreetGeometry();
    this.renderMarkers();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.clearMarkers();
    this.map?.remove();
    this.container?.replaceChildren();
    this.container?.classList.remove("maplibre-map", "maplibre-map-loading");
    this.map = undefined;
    this.container = undefined;
    this.resizeObserver = undefined;
    this.symbolLayers = [];
    this.minimumZoom = undefined;
  }

  private captureSymbolLayers(): void {
    const map = this.map;
    if (!map) return;

    this.symbolLayers = map
      .getStyle()
      .layers.filter((layer) => layer.type === "symbol")
      .filter((layer) => Boolean(layer.layout && "text-field" in layer.layout))
      .map((layer) => ({
        id: layer.id,
        visibility: layer.layout?.visibility === "none" ? "none" : "visible",
      }));
  }

  private applyLabelVisibility(): void {
    const map = this.map;
    if (!map || this.symbolLayers.length === 0) return;

    for (const layer of this.symbolLayers) {
      map.setLayoutProperty(
        layer.id,
        "visibility",
        this.state.revealed ? layer.visibility : "none",
      );
    }
  }

  private resetView(): void {
    const map = this.map;
    if (!map) return;

    map.setMinZoom(null);
    map.fitBounds(toMapLibreBounds(this.state.bounds), {
      padding: 16,
      duration: 0,
    });
    this.minimumZoom = map.getZoom();
    map.setMinZoom(this.minimumZoom);
  }

  private ensureStreetLayers(): void {
    const map = this.map;
    if (!map || map.getSource(STREET_SOURCE_ID)) return;

    map.addSource(STREET_SOURCE_ID, {
      type: "geojson",
      data: this.state.streetGeometry ?? EMPTY_STREET_COLLECTION,
    });
    map.addLayer({
      id: STREET_BASE_LAYER_ID,
      type: "line",
      source: STREET_SOURCE_ID,
      paint: {
        "line-color": "#19334a",
        "line-opacity": 0.2,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 14, 2.5],
      },
    });
    map.addLayer({
      id: STREET_NEIGHBOR_LAYER_ID,
      type: "line",
      source: STREET_SOURCE_ID,
      filter: streetIdFilter([]),
      paint: {
        "line-color": "#697f62",
        "line-opacity": 0.9,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 14, 5],
      },
    });
    map.addLayer({
      id: STREET_GUESS_LAYER_ID,
      type: "line",
      source: STREET_SOURCE_ID,
      filter: streetIdFilter([]),
      paint: {
        "line-color": "#19334a",
        "line-dasharray": [2, 1.5],
        "line-opacity": 0.95,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 3, 14, 7],
      },
    });
    map.addLayer({
      id: STREET_ANSWER_LAYER_ID,
      type: "line",
      source: STREET_SOURCE_ID,
      filter: streetIdFilter([]),
      paint: {
        "line-color": "#b54132",
        "line-opacity": 1,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 4, 14, 9],
      },
    });
    map.addLayer({
      id: STREET_LABEL_LAYER_ID,
      type: "symbol",
      source: STREET_SOURCE_ID,
      filter: streetIdFilter([]),
      layout: {
        "symbol-placement": "line",
        "text-field": ["coalesce", ["get", "mapLabel"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 13,
        "text-allow-overlap": false,
        "symbol-spacing": 420,
      },
      paint: {
        "text-color": "#19334a",
        "text-halo-color": "#f7f1df",
        "text-halo-width": 2,
      },
    });
  }

  private renderStreetGeometry(): void {
    const map = this.map;
    if (!map) return;

    const source = map.getSource(STREET_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;
    const allHighlights = this.state.highlightedStreets ?? [];
    const labels = new Map(
      allHighlights
        .filter((street) => street.label !== undefined)
        .map((street) => [street.id, street.label]),
    );
    const streetGeometry = this.state.streetGeometry;
    source?.setData(
      streetGeometry
        ? {
            ...streetGeometry,
            features: streetGeometry.features.map((feature) => ({
              ...feature,
              properties: {
                ...feature.properties,
                mapLabel: labels.get(feature.properties.id),
              },
            })),
          }
        : EMPTY_STREET_COLLECTION,
    );

    const highlights = this.state.revealed ? allHighlights : [];
    const idsFor = (kind: "answer" | "guess" | "neighbor") =>
      highlights.filter((street) => street.kind === kind).map((street) => street.id);
    map.setFilter(STREET_ANSWER_LAYER_ID, streetIdFilter(idsFor("answer")));
    map.setFilter(STREET_GUESS_LAYER_ID, streetIdFilter(idsFor("guess")));
    map.setFilter(STREET_NEIGHBOR_LAYER_ID, streetIdFilter(idsFor("neighbor")));
    map.setFilter(
      STREET_LABEL_LAYER_ID,
      streetIdFilter(
        this.state.revealed
          ? highlights
              .filter((street) => street.label !== undefined)
              .map((street) => street.id)
          : [],
      ),
    );
  }

  private renderMarkers(): void {
    const map = this.map;
    if (!map) return;

    this.clearMarkers();
    const correctCoordinate = this.state.correctIntersection?.coordinate;
    const correctGuess = Boolean(this.state.correctGuess);
    const guessMarker = this.state.markers?.find(
      (marker) => marker.kind === "guess",
    );
    const splitLabels = Boolean(
      this.state.revealed &&
        !correctGuess &&
        guessMarker &&
        correctCoordinate &&
        this.areCoordinatesCloseOnScreen(
          guessMarker.coordinate,
          correctCoordinate,
        ),
    );

    if (!correctGuess) {
      for (const marker of this.state.markers ?? []) {
        this.addMarker(marker, splitLabels ? "left" : "right");
      }
    }

    if (!this.state.revealed && this.state.pendingGuess) {
      this.addMarker(
        {
          id: "pending-guess",
          kind: "pending",
          coordinate: this.state.pendingGuess,
          label: "Pending guess",
        },
        "right",
      );
    }

    if (this.state.revealed && correctCoordinate) {
      this.addMarker(
        {
          id: `correct-${this.state.correctIntersection?.id}`,
          kind: "correct",
          coordinate: correctCoordinate,
          label: correctGuess ? "Nailed it" : "Correct",
        },
        "right",
      );
      this.addAnswerCallout(correctCoordinate);
    }
  }

  private addMarker(marker: MapMarker, placement: MarkerLabelPlacement): void {
    const map = this.map;
    if (!map) return;

    const element = document.createElement("div");
    element.className = `tile-map-marker tile-map-marker-${marker.kind}`;
    if (marker.kind === "correct" && this.state.correctGuess) {
      element.classList.add("tile-map-marker-success");
    }
    element.setAttribute("aria-label", marker.label ?? marker.kind);

    const dot = document.createElement("span");
    dot.className = "tile-map-marker-dot";
    element.append(dot);

    if (marker.label) {
      const label = document.createElement("span");
      label.className = `tile-map-marker-label tile-map-marker-label-${placement}`;
      label.textContent = marker.label;
      element.append(label);
    }

    const mapMarker = new maplibregl.Marker({ element, anchor: "center" })
      .setLngLat([marker.coordinate.lon, marker.coordinate.lat])
      .addTo(map);
    element.setAttribute("role", "img");
    element.removeAttribute("tabindex");
    this.markers.push(mapMarker);
  }

  private addAnswerCallout(coordinate: Coordinate): void {
    const map = this.map;
    const intersection = this.state.correctIntersection;
    if (!map || !intersection) return;

    const element = document.createElement("div");
    element.className = "tile-map-answer-callout";
    element.setAttribute(
      "aria-label",
      `Correct intersection: ${intersection.primaryStreet} and ${intersection.crossStreet}`,
    );

    const firstStreet = document.createElement("span");
    firstStreet.textContent = intersection.primaryStreet;
    const secondStreet = document.createElement("span");
    secondStreet.textContent = intersection.crossStreet;
    element.append(firstStreet, secondStreet);

    const screenPoint = map.project([coordinate.lon, coordinate.lat]);
    const placeBelow = screenPoint.y < 120;
    const mapMarker = new maplibregl.Marker({
      element,
      anchor: placeBelow ? "top" : "bottom",
      offset: [0, placeBelow ? 15 : -15],
    })
      .setLngLat([coordinate.lon, coordinate.lat])
      .addTo(map);
    element.setAttribute("role", "note");
    element.removeAttribute("tabindex");
    this.markers.push(mapMarker);
  }

  private areCoordinatesCloseOnScreen(
    first: Coordinate,
    second: Coordinate,
  ): boolean {
    const map = this.map;
    if (!map) return false;

    const firstPoint = map.project([first.lon, first.lat]);
    const secondPoint = map.project([second.lon, second.lat]);
    return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y) < 90;
  }

  private clearMarkers(): void {
    for (const marker of this.markers) marker.remove();
    this.markers = [];
  }
}

function applyAtlasMapTypography(style: StyleSpecification): StyleSpecification {
  const { glyphs: _glyphs, ...styleWithoutHostedGlyphs } = style;

  return {
    ...styleWithoutHostedGlyphs,
    layers: style.layers.map((layer) => {
      if (
        layer.type !== "symbol" ||
        !layer.layout ||
        !("text-field" in layer.layout)
      ) {
        return layer;
      }

      const isRoadLabel =
        layer.id.startsWith("highway-name") ||
        layer.id.includes("shield");
      const isPlaceLabel = layer.id.startsWith("label_");
      const isProminentPlace =
        layer.id.includes("capital") || layer.id.includes("country");
      const isItalicLabel =
        layer.id.startsWith("water") ||
        layer.id.startsWith("poi_") ||
        layer.id === "label_other" ||
        layer.id === "label_state";

      const textFont = isRoadLabel
        ? ["Barlow Condensed Medium", "Barlow Condensed", "Arial Narrow"]
        : isPlaceLabel
          ? [
              isProminentPlace ? "Jost Bold" : "Jost Medium",
              "Jost",
              "Century Gothic",
            ]
          : isItalicLabel
            ? ["Barlow Condensed Italic", "Barlow Condensed", "Arial Narrow"]
            : ["Barlow Condensed Regular", "Barlow Condensed", "Arial Narrow"];

      return {
        ...layer,
        layout: {
          ...layer.layout,
          "text-font": textFont,
          ...(isRoadLabel ? { "text-letter-spacing": 0.035 } : {}),
        },
      };
    }),
  };
}

export function createMapLibreMapAdapter(
  options: Partial<MapAdapterOptions> & Pick<MapAdapterOptions, "onGuess">,
): MapLibreMapAdapter {
  return new MapLibreMapAdapter({
    bounds: options.bounds ?? DEFAULT_VIEW_BOUNDS,
    onGuess: options.onGuess,
  });
}

function toMapLibreBounds(bounds: BoundingBox): maplibregl.LngLatBoundsLike {
  return [
    [bounds.southwest.lon, bounds.southwest.lat],
    [bounds.northeast.lon, bounds.northeast.lat],
  ];
}

function streetIdFilter(ids: readonly string[]): FilterSpecification {
  return ["in", ["get", "id"], ["literal", [...ids]]];
}
