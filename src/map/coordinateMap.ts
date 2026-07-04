import type { BoundingBox, Coordinate, Intersection } from "../data/types";
import { LAS_VEGAS_BOUNDS } from "../lib/geo";
import type {
  MapAdapter,
  MapAdapterOptions,
  MapMarker,
  MapViewState,
} from "./types";

const TILE_SIZE = 256;
const TILE_HOSTS = ["a", "b", "c", "d"];
const BASE_LAYER = "rastertiles/voyager_nolabels";
const LABEL_LAYER = "rastertiles/voyager_only_labels";
const MAP_PADDING = 16;
const INITIAL_ZOOM_BOOST = 0.15;
const MIN_ZOOM_FLOOR = 10;
const MAX_ZOOM = 14.5;
const WHEEL_ZOOM_SPEED = 0.0016;
const MAX_WHEEL_ZOOM_STEP = 0.263;
const WHEEL_LINE_HEIGHT_PX = 16;
const TILE_PRELOAD_DELAY_MS = 80;
const TILE_PRELOAD_PADDING = 1;
const TILE_PRELOAD_LIMIT_PER_LAYER = 48;
const MARKER_LABEL_COLLISION_PX = 78;
const REVEAL_SAFE_PADDING_X = 128;
const REVEAL_SAFE_PADDING_Y = 96;
const ATTRIBUTION_TEXT = "© OpenStreetMap contributors © CARTO";
const processedTileCache = new Map<string, Promise<string>>();
const preloadedTileCache = new Set<string>();

const DEFAULT_VIEW_BOUNDS: BoundingBox = {
  southwest: { lat: 35.96, lon: -115.38 },
  northeast: { lat: 36.31, lon: -114.96 },
};

const PAN_LIMIT_BOUNDS: BoundingBox = {
  southwest: { lat: 35.94, lon: -115.4 },
  northeast: { lat: 36.33, lon: -114.92 },
};

type LabelPlacement = "left" | "right";

type RenderMarker = MapMarker & {
  labelPlacement?: LabelPlacement;
};

type TileLayout = {
  height: number;
  scale: number;
  tileZoom: number;
  topLeft: WorldPoint;
  width: number;
  zoom: number;
};

type TileRenderOptions = {
  processMode?: TileProcessingMode;
};

type TileProcessingMode = "base" | "labels";

type TileRequest = {
  layerName: string;
  processMode?: TileProcessingMode;
  tileX: number;
  tileY: number;
  wrappedTileX: number;
  z: number;
};

type ViewState = {
  center: Coordinate;
  zoom: number;
};

type DragState = {
  centerWorldAtStart: WorldPoint;
  pointerId: number;
  startX: number;
  startY: number;
};

type WorldPoint = {
  x: number;
  y: number;
};

export class CoordinateMapAdapter implements MapAdapter {
  private container?: HTMLElement;
  private viewport?: HTMLDivElement;
  private baseLayer?: HTMLDivElement;
  private labelLayer?: HTMLDivElement;
  private markerLayer?: HTMLDivElement;
  private attribution?: HTMLDivElement;
  private controls?: HTMLDivElement;
  private layout?: TileLayout;
  private view?: ViewState;
  private drag?: DragState;
  private lastRevealKey?: string;
  private resizeObserver?: ResizeObserver;
  private minimumZoom = MIN_ZOOM_FLOOR;
  private pendingWheelZoomDelta = 0;
  private wheelAnimationFrame?: number;
  private wheelFocalPoint?: WorldPoint;
  private tilePreloadTimeout?: number;
  private suppressNextClick = false;
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
    container.classList.add("tile-map");

    this.viewport = document.createElement("div");
    this.viewport.className = "tile-map-viewport";
    this.viewport.setAttribute("role", "img");
    this.viewport.setAttribute("aria-label", "Las Vegas valley map");

    this.baseLayer = document.createElement("div");
    this.baseLayer.className = "tile-map-layer tile-map-layer-base";
    this.baseLayer.setAttribute("data-layer", "base-tiles");

    this.labelLayer = document.createElement("div");
    this.labelLayer.className = "tile-map-layer tile-map-layer-labels";
    this.labelLayer.setAttribute("data-layer", "label-tiles");

    this.markerLayer = document.createElement("div");
    this.markerLayer.className = "tile-map-layer tile-map-layer-markers";
    this.markerLayer.setAttribute("data-layer", "markers");

    this.attribution = document.createElement("div");
    this.attribution.className = "tile-map-attribution";
    this.attribution.textContent = ATTRIBUTION_TEXT;

    this.controls = this.createControls();

    this.viewport.append(
      this.baseLayer,
      this.labelLayer,
      this.markerLayer,
      this.attribution,
      this.controls,
    );
    this.viewport.addEventListener("click", this.handleClick);
    this.viewport.addEventListener("pointerdown", this.handlePointerDown);
    this.viewport.addEventListener("pointermove", this.handlePointerMove);
    this.viewport.addEventListener("pointerup", this.handlePointerEnd);
    this.viewport.addEventListener("pointercancel", this.handlePointerEnd);
    this.viewport.addEventListener("wheel", this.handleWheel, { passive: false });
    container.appendChild(this.viewport);

    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(container);
    this.render();
  }

  update(state: Partial<MapViewState>): void {
    const wasRevealed = Boolean(this.state.revealed);
    const previousAnswerId = this.state.correctIntersection?.id;
    const nextState = {
      ...this.state,
      ...state,
      markers: state.markers ?? this.state.markers,
    };
    this.state = nextState;
    if (
      !this.state.revealed &&
      (wasRevealed || this.state.correctIntersection?.id !== previousAnswerId)
    ) {
      this.setDefaultView();
      this.lastRevealKey = undefined;
    }
    this.keepRevealInViewIfNeeded();
    this.render();
  }

  destroy(): void {
    this.viewport?.removeEventListener("click", this.handleClick);
    this.viewport?.removeEventListener("pointerdown", this.handlePointerDown);
    this.viewport?.removeEventListener("pointermove", this.handlePointerMove);
    this.viewport?.removeEventListener("pointerup", this.handlePointerEnd);
    this.viewport?.removeEventListener("pointercancel", this.handlePointerEnd);
    this.viewport?.removeEventListener("wheel", this.handleWheel);
    this.resizeObserver?.disconnect();
    if (this.wheelAnimationFrame !== undefined) {
      window.cancelAnimationFrame(this.wheelAnimationFrame);
    }
    if (this.tilePreloadTimeout !== undefined) {
      window.clearTimeout(this.tilePreloadTimeout);
    }
    this.container?.replaceChildren();
    this.container?.classList.remove("tile-map");
    this.container = undefined;
    this.viewport = undefined;
    this.baseLayer = undefined;
    this.labelLayer = undefined;
    this.markerLayer = undefined;
    this.attribution = undefined;
    this.controls = undefined;
    this.layout = undefined;
    this.view = undefined;
    this.drag = undefined;
    this.resizeObserver = undefined;
    this.pendingWheelZoomDelta = 0;
    this.wheelAnimationFrame = undefined;
    this.wheelFocalPoint = undefined;
    this.tilePreloadTimeout = undefined;
    this.lastRevealKey = undefined;
  }

  private readonly handleClick = (event: MouseEvent): void => {
    if (!this.viewport || !this.layout) return;

    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }

    if ((event.target as HTMLElement).closest(".tile-map-controls")) {
      return;
    }

    const rect = this.viewport.getBoundingClientRect();
    const coordinate = screenPointToCoordinate(
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      },
      this.layout,
    );

    this.options.onGuess({ coordinate });
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.viewport || !this.view || (event.target as HTMLElement).closest(".tile-map-controls")) {
      return;
    }

    this.viewport.setPointerCapture(event.pointerId);
    this.drag = {
      centerWorldAtStart: coordinateToWorldPoint(this.view.center, this.view.zoom),
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.drag || !this.view || event.pointerId !== this.drag.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.drag.startX;
    const deltaY = event.clientY - this.drag.startY;
    if (Math.hypot(deltaX, deltaY) > 4) {
      this.suppressNextClick = true;
    }

    const nextCenter = worldPointToCoordinate(
      {
        x: this.drag.centerWorldAtStart.x - deltaX,
        y: this.drag.centerWorldAtStart.y - deltaY,
      },
      this.view.zoom,
    );

    this.view = {
      ...this.view,
      center: clampCoordinate(nextCenter, PAN_LIMIT_BOUNDS),
    };
    this.render();
  };

  private readonly handlePointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.drag?.pointerId) return;
    this.drag = undefined;
    if (this.suppressNextClick) {
      window.setTimeout(() => {
        this.suppressNextClick = false;
      }, 0);
    }
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    if (!this.viewport || !this.layout || !this.view) return;

    event.preventDefault();
    const rect = this.viewport.getBoundingClientRect();
    this.wheelFocalPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const normalizedDeltaY = normalizeWheelDeltaY(event, rect.height);
    const zoomDelta = clamp(
      -normalizedDeltaY * WHEEL_ZOOM_SPEED,
      -MAX_WHEEL_ZOOM_STEP,
      MAX_WHEEL_ZOOM_STEP,
    );
    this.pendingWheelZoomDelta += zoomDelta;

    if (this.wheelAnimationFrame === undefined) {
      this.wheelAnimationFrame = window.requestAnimationFrame(this.applyPendingWheelZoom);
    }
  };

  private readonly applyPendingWheelZoom = (): void => {
    this.wheelAnimationFrame = undefined;
    if (!this.view || this.pendingWheelZoomDelta === 0) return;

    const zoomDelta = clamp(
      this.pendingWheelZoomDelta,
      -MAX_WHEEL_ZOOM_STEP,
      MAX_WHEEL_ZOOM_STEP,
    );
    const focalPoint = this.wheelFocalPoint;
    this.pendingWheelZoomDelta = 0;
    this.wheelFocalPoint = undefined;
    this.zoomTo(this.view.zoom + zoomDelta, focalPoint);
  };

  private render(): void {
    if (
      !this.container ||
      !this.baseLayer ||
      !this.labelLayer ||
      !this.markerLayer
    ) {
      return;
    }

    const rect = this.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    this.minimumZoom = getDefaultZoom(rect.width, rect.height, this.state.bounds);
    if (!this.view) {
      this.view = createInitialView(rect.width, rect.height, this.state.bounds);
    } else if (this.view.zoom < this.minimumZoom) {
      this.view = {
        ...this.view,
        zoom: this.minimumZoom,
      };
    }

    this.layout = createTileLayout(rect.width, rect.height, this.view);
    this.renderTiles(this.baseLayer, BASE_LAYER, { processMode: "base" });
    this.renderTiles(this.labelLayer, LABEL_LAYER, { processMode: "labels" });
    this.labelLayer.style.opacity = this.state.revealed ? "1" : "0";

    this.markerLayer.replaceChildren();
    if (this.state.revealed && this.state.correctIntersection) {
      this.markerLayer.appendChild(this.createAnswerCallout(this.state.correctIntersection));
    }
    for (const marker of this.getRenderMarkers()) {
      this.markerLayer.appendChild(this.createMarker(marker));
    }
    this.scheduleFutureTilePreload();
  }

  private renderTiles(
    layerElement: HTMLDivElement,
    layerName: string,
    options: TileRenderOptions = {},
  ): void {
    if (!this.layout) return;

    const processMode = options.processMode;
    const { scale, topLeft } = this.layout;
    const scaledTileSize = TILE_SIZE * scale;
    const fragment = document.createDocumentFragment();
    const tileRequests = collectTileRequests(this.layout, layerName, processMode);

    for (const tileRequest of tileRequests) {
      const image = document.createElement("img");
      image.className = "tile-map-tile";
      image.alt = "";
      image.decoding = "async";
      image.draggable = false;
      const sourceUrl = tileUrl(
        tileRequest.layerName,
        tileRequest.z,
        tileRequest.wrappedTileX,
        tileRequest.tileY,
      );
      image.crossOrigin = "anonymous";
      image.dataset.sourceTile = sourceUrl;
      image.src = sourceUrl;
      image.style.left = `${tileRequest.tileX * scaledTileSize - topLeft.x}px`;
      image.style.top = `${tileRequest.tileY * scaledTileSize - topLeft.y}px`;
      image.style.width = `${scaledTileSize}px`;
      image.style.height = `${scaledTileSize}px`;
      if (processMode) {
        image.classList.add("tile-map-tile-pending");
        void getProcessedTileUrl(sourceUrl, processMode).then((processedUrl) => {
          if (image.dataset.sourceTile !== sourceUrl) return;
          image.src = processedUrl;
          image.classList.remove("tile-map-tile-pending");
        });
      }
      fragment.appendChild(image);
    }

    layerElement.replaceChildren(fragment);
  }

  private scheduleFutureTilePreload(): void {
    if (this.tilePreloadTimeout !== undefined) {
      window.clearTimeout(this.tilePreloadTimeout);
    }

    this.tilePreloadTimeout = window.setTimeout(() => {
      this.tilePreloadTimeout = undefined;
      this.preloadFutureTiles();
    }, TILE_PRELOAD_DELAY_MS);
  }

  private preloadFutureTiles(): void {
    if (!this.layout || !this.view) return;

    const nextTileZoom = Math.min(this.layout.tileZoom + 1, Math.ceil(MAX_ZOOM));
    if (nextTileZoom <= this.layout.tileZoom) return;

    const targetView = {
      center: this.view.center,
      zoom: clamp(nextTileZoom, this.minimumZoom, MAX_ZOOM),
    };
    const targetLayout = createTileLayout(this.layout.width, this.layout.height, targetView);
    const baseRequests = collectTileRequests(
      targetLayout,
      BASE_LAYER,
      "base",
      TILE_PRELOAD_PADDING,
    ).slice(0, TILE_PRELOAD_LIMIT_PER_LAYER);
    const labelRequests = collectTileRequests(
      targetLayout,
      LABEL_LAYER,
      "labels",
      TILE_PRELOAD_PADDING,
    ).slice(0, TILE_PRELOAD_LIMIT_PER_LAYER);

    for (const tileRequest of [...baseRequests, ...labelRequests]) {
      preloadTile(tileRequest);
    }
  }

  private createAnswerCallout(intersection: Intersection): HTMLDivElement {
    if (!this.layout) {
      throw new Error("Map layout must be available before rendering the answer callout.");
    }

    const point = coordinateToScreenPoint(intersection.coordinate, this.layout);
    const maxWidth = Math.min(270, Math.max(168, this.layout.width - 40));
    const x = clamp(point.x, maxWidth / 2 + 12, this.layout.width - maxWidth / 2 - 12);
    const placement = point.y < 122 ? "below" : "above";
    const callout = document.createElement("div");
    callout.className = `tile-map-answer-callout tile-map-answer-callout-${placement}`;
    callout.setAttribute(
      "aria-label",
      `Answer streets: ${intersection.primaryStreet} and ${intersection.crossStreet}`,
    );
    callout.style.left = `${x}px`;
    callout.style.top = `${point.y}px`;
    callout.style.maxWidth = `${maxWidth}px`;

    const primaryStreet = document.createElement("span");
    primaryStreet.className = "tile-map-answer-street";
    primaryStreet.textContent = intersection.primaryStreet;

    const crossStreet = document.createElement("span");
    crossStreet.className = "tile-map-answer-street";
    crossStreet.textContent = intersection.crossStreet;

    callout.append(primaryStreet, crossStreet);
    return callout;
  }

  private createMarker(marker: RenderMarker): HTMLDivElement {
    if (!this.layout) {
      throw new Error("Map layout must be available before rendering markers.");
    }

    const point = coordinateToScreenPoint(marker.coordinate, this.layout);
    const markerElement = document.createElement("div");
    const isGuess = marker.kind === "guess";
    const labelPlacement = marker.labelPlacement ?? "right";

    markerElement.className = `tile-map-marker tile-map-marker-${marker.kind}`;
    markerElement.setAttribute("data-marker-id", marker.id);
    markerElement.style.left = `${point.x}px`;
    markerElement.style.top = `${point.y}px`;
    markerElement.style.setProperty("--marker-size", isGuess ? "20px" : "17px");

    if (marker.label) {
      const label = document.createElement("span");
      label.className = `tile-map-marker-label tile-map-marker-label-${labelPlacement}`;
      label.textContent = marker.label;
      markerElement.appendChild(label);
    }

    return markerElement;
  }

  private createControls(): HTMLDivElement {
    const controls = document.createElement("div");
    controls.className = "tile-map-controls";

    const zoomIn = this.createControlButton("+", "Zoom in", () => {
      if (this.view) this.zoomTo(this.view.zoom + 1);
    });
    const zoomOut = this.createControlButton("-", "Zoom out", () => {
      if (this.view) this.zoomTo(this.view.zoom - 1);
    });
    const reset = this.createControlButton("↺", "Reset map", () => {
      this.resetView();
    });

    controls.append(zoomIn, zoomOut, reset);
    return controls;
  }

  private createControlButton(label: string, title: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile-map-control-button";
    button.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  private getRenderMarkers(): RenderMarker[] {
    if (!this.layout) return [];

    const markers: RenderMarker[] = [];
    const correctMarker: RenderMarker | undefined =
      this.state.revealed && this.state.correctIntersection
        ? {
            id: `correct-${this.state.correctIntersection.id}`,
            coordinate: this.state.correctIntersection.coordinate,
            kind: "correct",
            label: "Correct",
          }
        : undefined;
    const guessMarkers = [...(this.state.markers ?? [])] as RenderMarker[];

    if (correctMarker) markers.push(correctMarker);
    markers.push(...guessMarkers);

    const firstGuess = guessMarkers[0];
    if (correctMarker && firstGuess) {
      const correctPoint = coordinateToScreenPoint(correctMarker.coordinate, this.layout);
      const guessPoint = coordinateToScreenPoint(firstGuess.coordinate, this.layout);
      if (distanceBetweenPoints(correctPoint, guessPoint) < MARKER_LABEL_COLLISION_PX) {
        correctMarker.labelPlacement = "left";
        firstGuess.labelPlacement = "right";
      }
    }

    return markers;
  }

  private resetView(): void {
    this.setDefaultView();
    this.render();
  }

  private setDefaultView(): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    this.minimumZoom = getDefaultZoom(rect.width, rect.height, this.state.bounds);
    this.view = createInitialView(rect.width, rect.height, this.state.bounds);
  }

  private keepRevealInViewIfNeeded(): void {
    if (!this.container || !this.state.revealed || !this.state.correctIntersection) {
      this.lastRevealKey = undefined;
      return;
    }

    const guess = this.state.markers?.find((marker) => marker.kind === "guess");
    if (!guess) return;

    const revealKey = [
      this.state.correctIntersection.id,
      guess.coordinate.lat.toFixed(5),
      guess.coordinate.lon.toFixed(5),
    ].join(":");
    if (revealKey === this.lastRevealKey) return;

    const rect = this.container.getBoundingClientRect();
    if (!this.view) {
      this.view = createInitialView(rect.width, rect.height, this.state.bounds);
    }

    this.view = keepCoordinatesInsideView(
      rect.width,
      rect.height,
      this.view,
      [this.state.correctIntersection.coordinate, guess.coordinate],
    );
    this.lastRevealKey = revealKey;
  }

  private zoomTo(nextZoom: number, focalPoint?: WorldPoint): void {
    if (!this.view || !this.container) return;

    const rect = this.container.getBoundingClientRect();
    this.minimumZoom = getDefaultZoom(rect.width, rect.height, this.state.bounds);
    const zoom = clamp(nextZoom, this.minimumZoom, MAX_ZOOM);
    let center = this.view.center;

    if (focalPoint && this.layout) {
      const focalCoordinate = screenPointToCoordinate(focalPoint, this.layout);
      const focalWorld = coordinateToWorldPoint(focalCoordinate, zoom);
      const centerWorld = {
        x: focalWorld.x - focalPoint.x + rect.width / 2,
        y: focalWorld.y - focalPoint.y + rect.height / 2,
      };
      center = worldPointToCoordinate(centerWorld, zoom);
    }

    this.view = {
      center: clampCoordinate(center, PAN_LIMIT_BOUNDS),
      zoom,
    };
    this.render();
  }
}

export function createCoordinateMapAdapter(
  options: Partial<MapAdapterOptions> & Pick<MapAdapterOptions, "onGuess">,
): CoordinateMapAdapter {
  return new CoordinateMapAdapter({
    bounds: options.bounds ?? DEFAULT_VIEW_BOUNDS,
    onGuess: options.onGuess,
  });
}

function createInitialView(width: number, height: number, bounds = DEFAULT_VIEW_BOUNDS): ViewState {
  const zoom = getDefaultZoom(width, height, bounds);

  return {
    center: clampCoordinate(
      {
        lat: (bounds.southwest.lat + bounds.northeast.lat) / 2,
        lon: (bounds.southwest.lon + bounds.northeast.lon) / 2,
      },
      PAN_LIMIT_BOUNDS,
    ),
    zoom,
  };
}

function getDefaultZoom(width: number, height: number, bounds = DEFAULT_VIEW_BOUNDS): number {
  const southwest = coordinateToWorldPoint(bounds.southwest, 0);
  const northeast = coordinateToWorldPoint(bounds.northeast, 0);
  const boundsWidth = Math.max(0.0001, northeast.x - southwest.x);
  const boundsHeight = Math.max(0.0001, southwest.y - northeast.y);
  const usableWidth = Math.max(1, width - MAP_PADDING * 2);
  const usableHeight = Math.max(1, height - MAP_PADDING * 2);
  const fitZoom = Math.min(
    Math.log2(usableWidth / boundsWidth),
    Math.log2(usableHeight / boundsHeight),
  );

  return clamp(fitZoom + INITIAL_ZOOM_BOOST, MIN_ZOOM_FLOOR, MAX_ZOOM);
}

function keepCoordinatesInsideView(
  width: number,
  height: number,
  view: ViewState,
  coordinates: readonly Coordinate[],
): ViewState {
  const layout = createTileLayout(width, height, view);
  const points = coordinates.map((coordinate) => coordinateToScreenPoint(coordinate, layout));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  let centerDeltaX = 0;
  let centerDeltaY = 0;

  if (minX < REVEAL_SAFE_PADDING_X) {
    centerDeltaX = minX - REVEAL_SAFE_PADDING_X;
  } else if (maxX > width - REVEAL_SAFE_PADDING_X) {
    centerDeltaX = maxX - (width - REVEAL_SAFE_PADDING_X);
  }

  if (minY < REVEAL_SAFE_PADDING_Y) {
    centerDeltaY = minY - REVEAL_SAFE_PADDING_Y;
  } else if (maxY > height - REVEAL_SAFE_PADDING_Y) {
    centerDeltaY = maxY - (height - REVEAL_SAFE_PADDING_Y);
  }

  if (centerDeltaX === 0 && centerDeltaY === 0) {
    return view;
  }

  const centerWorld = coordinateToWorldPoint(view.center, layout.tileZoom);
  const nextCenter = worldPointToCoordinate(
    {
      x: centerWorld.x + centerDeltaX / layout.scale,
      y: centerWorld.y + centerDeltaY / layout.scale,
    },
    layout.tileZoom,
  );

  return {
    center: clampCoordinate(nextCenter, PAN_LIMIT_BOUNDS),
    zoom: view.zoom,
  };
}

function createTileLayout(width: number, height: number, view: ViewState): TileLayout {
  const tileZoom = Math.min(Math.ceil(view.zoom), Math.ceil(MAX_ZOOM));
  const scale = 2 ** (view.zoom - tileZoom);
  const centerAtTileZoom = coordinateToWorldPoint(view.center, tileZoom);
  const centerAtZoom = {
    x: centerAtTileZoom.x * scale,
    y: centerAtTileZoom.y * scale,
  };

  return {
    height,
    scale,
    tileZoom,
    topLeft: {
      x: centerAtZoom.x - width / 2,
      y: centerAtZoom.y - height / 2,
    },
    width,
    zoom: view.zoom,
  };
}

function collectTileRequests(
  layout: TileLayout,
  layerName: string,
  processMode?: TileProcessingMode,
  padding = 0,
): TileRequest[] {
  const { scale, tileZoom, topLeft, width, height } = layout;
  const tileCount = 2 ** tileZoom;
  const startTileX = Math.floor((topLeft.x / scale) / TILE_SIZE) - padding;
  const startTileY = Math.floor((topLeft.y / scale) / TILE_SIZE) - padding;
  const endTileX = Math.floor(((topLeft.x + width) / scale) / TILE_SIZE) + padding;
  const endTileY = Math.floor(((topLeft.y + height) / scale) / TILE_SIZE) + padding;
  const centerTileX = ((topLeft.x + width / 2) / scale) / TILE_SIZE;
  const centerTileY = ((topLeft.y + height / 2) / scale) / TILE_SIZE;
  const requests: TileRequest[] = [];

  for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
    if (tileY < 0 || tileY >= tileCount) continue;

    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      requests.push({
        layerName,
        processMode,
        tileX,
        tileY,
        wrappedTileX: modulo(tileX, tileCount),
        z: tileZoom,
      });
    }
  }

  return requests.sort((a, b) => {
    const distanceA = Math.hypot(a.tileX + 0.5 - centerTileX, a.tileY + 0.5 - centerTileY);
    const distanceB = Math.hypot(b.tileX + 0.5 - centerTileX, b.tileY + 0.5 - centerTileY);
    return distanceA - distanceB;
  });
}

function coordinateToScreenPoint(coordinate: Coordinate, layout: TileLayout): WorldPoint {
  const world = coordinateToWorldPoint(coordinate, layout.tileZoom);
  return {
    x: world.x * layout.scale - layout.topLeft.x,
    y: world.y * layout.scale - layout.topLeft.y,
  };
}

function screenPointToCoordinate(point: WorldPoint, layout: TileLayout): Coordinate {
  const world = {
    x: (layout.topLeft.x + point.x) / layout.scale,
    y: (layout.topLeft.y + point.y) / layout.scale,
  };

  return worldPointToCoordinate(world, layout.tileZoom);
}

function coordinateToWorldPoint(coordinate: Coordinate, zoom: number): WorldPoint {
  const sinLat = Math.sin((coordinate.lat * Math.PI) / 180);
  const worldSize = TILE_SIZE * 2 ** zoom;

  return {
    x: ((coordinate.lon + 180) / 360) * worldSize,
    y:
      (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
      worldSize,
  };
}

function worldPointToCoordinate(point: WorldPoint, zoom: number): Coordinate {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const lon = (point.x / worldSize) * 360 - 180;
  const mercatorY = Math.PI * (1 - (2 * point.y) / worldSize);
  const lat = (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI;

  return { lat, lon };
}

function tileUrl(layerName: string, z: number, x: number, y: number): string {
  const host = TILE_HOSTS[Math.abs(x + y) % TILE_HOSTS.length];
  return `https://${host}.basemaps.cartocdn.com/${layerName}/${z}/${x}/${y}@2x.png`;
}

function preloadTile(tileRequest: TileRequest): void {
  const sourceUrl = tileUrl(
    tileRequest.layerName,
    tileRequest.z,
    tileRequest.wrappedTileX,
    tileRequest.tileY,
  );
  const cacheKey = `${tileRequest.processMode ?? "raw"}:${sourceUrl}`;
  if (preloadedTileCache.has(cacheKey)) return;

  preloadedTileCache.add(cacheKey);
  if (tileRequest.processMode) {
    void getProcessedTileUrl(sourceUrl, tileRequest.processMode);
    return;
  }

  preloadImage(sourceUrl);
}

function preloadImage(sourceUrl: string): void {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.loading = "eager";
  image.src = sourceUrl;
}

function getProcessedTileUrl(
  sourceUrl: string,
  mode: TileProcessingMode,
): Promise<string> {
  const cacheKey = `${mode}:${sourceUrl}`;
  const cached = processedTileCache.get(cacheKey);
  if (cached) return cached;

  const promise = processTileImage(sourceUrl, mode).catch(() => sourceUrl);
  processedTileCache.set(cacheKey, promise);
  return promise;
}

function processTileImage(
  sourceUrl: string,
  mode: TileProcessingMode,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        reject(new Error("Could not create tile processing context."));
        return;
      }

      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      if (mode === "base") {
        recolorBaseTilePixels(imageData.data, canvas.width, canvas.height);
      } else {
        recolorLabelTilePixels(imageData.data, canvas.width, canvas.height);
      }
      context.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error(`Could not load tile: ${sourceUrl}`));
    image.src = sourceUrl;
  });
}

function recolorBaseTilePixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  const source = new Uint8ClampedArray(pixels);
  const yellowMask = createYellowRoadMask(source);

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = source[index + 3];
    if (alpha === 0) continue;

    const red = source[index];
    const green = source[index + 1];
    const blue = source[index + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    const yellowStrength = getYellowStrength(red, green, blue);
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const neighborCount = countMaskedNeighbors(yellowMask, width, height, x, y, 4);
    const isMajorRoad =
      yellowMask[pixel] === 1 &&
      neighborCount >= 16 &&
      yellowStrength > 0.12;

    if (isMajorRoad) {
      const roadTone = clamp(
        178 - yellowStrength * 112 - neighborCount * 1.35,
        62,
        154,
      );
      const blend = clamp(0.68 + yellowStrength * 0.22, 0, 0.9);
      pixels[index] = mix(red, roadTone, blend);
      pixels[index + 1] = mix(green, roadTone + 1, blend);
      pixels[index + 2] = mix(blue, roadTone + 3, blend);
      continue;
    }

    const neutral = clamp(231 + (luminance - 225) * 1.05, 200, 250);
    const blend = luminance > 210 ? 0.64 : 0.44;
    pixels[index] = mix(red, neutral, blend);
    pixels[index + 1] = mix(green, neutral, blend);
    pixels[index + 2] = mix(blue, neutral, blend);
  }
}

function recolorLabelTilePixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  const source = new Uint8ClampedArray(pixels);
  const labelMask = createLabelMask(source);

  pixels.fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const index = pixel * 4;
      const haloAlpha = maxMaskedNeighbor(labelMask, width, height, x, y, 2);

      if (haloAlpha > 0) {
        pixels[index] = 255;
        pixels[index + 1] = 255;
        pixels[index + 2] = 255;
        pixels[index + 3] = Math.max(
          pixels[index + 3],
          Math.min(220, haloAlpha * 0.82),
        );
      }

      const alpha = source[index + 3];
      if (alpha < 12) continue;

      const red = source[index];
      const green = source[index + 1];
      const blue = source[index + 2];
      const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
      if (luminance > 235) continue;

      const ink = clamp(luminance * 0.45, 22, 108);
      pixels[index] = Math.min(red * 0.45, ink);
      pixels[index + 1] = Math.min(green * 0.45, ink + 4);
      pixels[index + 2] = Math.min(blue * 0.5, ink + 12);
      pixels[index + 3] = clamp(alpha * 1.45, 160, 255);
    }
  }
}

function createYellowRoadMask(pixels: Uint8ClampedArray): Uint8Array {
  const mask = new Uint8Array(pixels.length / 4);

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha === 0) continue;

    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    const yellowStrength = getYellowStrength(red, green, blue);
    const isYellowRoad =
      yellowStrength > 0.09 &&
      red > 170 &&
      green > 154 &&
      luminance > 142;

    if (isYellowRoad) {
      mask[index / 4] = 1;
    }
  }

  return mask;
}

function createLabelMask(pixels: Uint8ClampedArray): Uint8Array {
  const mask = new Uint8Array(pixels.length / 4);

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha < 18) continue;

    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    if (luminance < 230) {
      mask[index / 4] = alpha;
    }
  }

  return mask;
}

function getYellowStrength(red: number, green: number, blue: number): number {
  const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
  const yellowBias = Math.max(0, Math.min(red, green) - blue);
  const yellowBalance = 1 - clamp(Math.abs(red - green) / 64, 0, 1);
  return (
    clamp((yellowBias - 10) / 48, 0, 1) *
    yellowBalance *
    clamp((luminance - 142) / 90, 0, 1)
  );
}

function countMaskedNeighbors(
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): number {
  let count = 0;

  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    const sampleY = y + offsetY;
    if (sampleY < 0 || sampleY >= height) continue;

    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      const sampleX = x + offsetX;
      if (sampleX < 0 || sampleX >= width) continue;
      count += mask[sampleY * width + sampleX];
    }
  }

  return count;
}

function maxMaskedNeighbor(
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): number {
  let max = 0;

  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    const sampleY = y + offsetY;
    if (sampleY < 0 || sampleY >= height) continue;

    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      const sampleX = x + offsetX;
      if (sampleX < 0 || sampleX >= width) continue;
      max = Math.max(max, mask[sampleY * width + sampleX]);
    }
  }

  return max;
}

function clampCoordinate(coordinate: Coordinate, bounds: BoundingBox = LAS_VEGAS_BOUNDS): Coordinate {
  return {
    lat: clamp(coordinate.lat, bounds.southwest.lat, bounds.northeast.lat),
    lon: clamp(coordinate.lon, bounds.southwest.lon, bounds.northeast.lon),
  };
}

function distanceBetweenPoints(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizeWheelDeltaY(event: WheelEvent, viewportHeight: number): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * WHEEL_LINE_HEIGHT_PX;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * Math.max(viewportHeight, TILE_SIZE);
  }

  return event.deltaY;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function mix(from: number, to: number, amount: number): number {
  return Math.round(from + (to - from) * amount);
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
