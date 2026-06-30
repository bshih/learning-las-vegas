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
  area?: string;
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
  score: number;
};

export type RevealState = {
  question: IntersectionQuestion;
  guess?: Guess;
  revealed: boolean;
};
