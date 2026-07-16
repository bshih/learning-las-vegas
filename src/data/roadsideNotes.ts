import rawRoadsideNotes from "./roadsideNotes.json";

export type RoadsideNoteCategory = "corridor" | "history" | "landmark" | "name-origin" | "navigation";

export type RoadsideNote = {
  streetId: string;
  category: RoadsideNoteCategory;
  title: string;
  body: string;
  sourceLabel: string;
  sourceUrl: string;
};

export const roadsideNotes = rawRoadsideNotes as RoadsideNote[];

const notesByStreetId = new Map(roadsideNotes.map((note) => [note.streetId, note]));

export function getRoadsideNote(streetId: string): RoadsideNote | undefined {
  return notesByStreetId.get(streetId);
}
