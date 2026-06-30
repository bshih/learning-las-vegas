import type { Intersection, IntersectionQuestion } from "../data/types";

export type QuestionDeckOptions = {
  seed?: string;
  limit?: number;
};

export function buildQuestion(
  intersection: Intersection,
  sequence: number,
): IntersectionQuestion {
  return {
    id: `q-${sequence}-${intersection.id}`,
    prompt: `${intersection.primaryStreet} & ${intersection.crossStreet}`,
    intersectionId: intersection.id,
    answer: intersection,
    sequence,
  };
}

export function createQuestionDeck(
  intersections: readonly Intersection[],
  options: QuestionDeckOptions = {},
): IntersectionQuestion[] {
  const { seed = "melissa-map-v1", limit = intersections.length } = options;
  const shuffled = [...intersections].sort((a, b) => {
    const aRank = seededRank(`${seed}:${a.id}`);
    const bRank = seededRank(`${seed}:${b.id}`);
    return aRank - bRank || a.id.localeCompare(b.id);
  });

  return shuffled.slice(0, limit).map(buildQuestion);
}

export function getQuestionAt(
  intersections: readonly Intersection[],
  index: number,
  options: QuestionDeckOptions = {},
): IntersectionQuestion | undefined {
  if (intersections.length === 0) return undefined;

  const deck = createQuestionDeck(intersections, options);
  return deck[index % deck.length];
}

function seededRank(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
