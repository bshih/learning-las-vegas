export type Coordinate = {
  lat: number;
  lon: number;
};

export type BoundingBox = {
  southwest: Coordinate;
  northeast: Coordinate;
};

export type IntersectionId = string;

export type IntersectionDifficulty = "easy" | "medium" | "hard";

export type AreaBucketId =
  | "spring-valley-southwest"
  | "summerlin-west"
  | "strip-paradise"
  | "north-las-vegas-northwest"
  | "henderson-green-valley"
  | "downtown-central-east";

export type PlayAreaId = "all" | AreaBucketId;

export type Intersection = {
  id: IntersectionId;
  streetA?: string;
  streetB?: string;
  lat?: number;
  lon?: number;
  region?: string;
  difficulty?: IntersectionDifficulty;
  aliases?: string[];
  teachingNote?: string;
  primaryStreet: string;
  crossStreet: string;
  coordinate: Coordinate;
  area?: AreaBucketId;
  notes?: string;
};

export type IntersectionQuestion = {
  id: string;
  prompt: string;
  intersectionId: IntersectionId;
  answer: Intersection;
  sequence: number;
};

export type Guess = {
  coordinate: Coordinate;
  distanceMeters: number;
  closenessScore: 0 | 1 | 2 | 3 | 4 | 5;
  nearestIntersection: Intersection;
  nearestDistanceMeters: number;
  isCorrect: boolean;
  result: "correct" | "near" | "miss";
};

export type RevealState = {
  question: IntersectionQuestion;
  guess?: Guess;
  revealed: boolean;
};
