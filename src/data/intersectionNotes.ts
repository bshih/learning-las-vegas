import rawIntersectionNotes from "./intersectionNotes.json";

export type IntersectionNoteCategory = "boundary" | "casino-history" | "history" | "landmark" | "name-origin";

export type IntersectionNote = {
  intersectionId: string;
  category: IntersectionNoteCategory;
  title: string;
  body: string;
  sourceLabel: string;
  sourceUrl: string;
};

export const intersectionNotes = rawIntersectionNotes as IntersectionNote[];

const notesByIntersectionId = new Map(
  intersectionNotes.map((note) => [note.intersectionId, note]),
);

export function getIntersectionNote(intersectionId: string): IntersectionNote | undefined {
  return notesByIntersectionId.get(intersectionId);
}
