import type { PlayAreaId } from "../data";

export type ProgressState = {
  answered: number;
  areaId: PlayAreaId;
  missed: number;
  streak: number;
  questionIndex: number;
};
