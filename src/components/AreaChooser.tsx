import type { AreaOption, PlayAreaId } from "../data";

type AreaChooserProps = {
  areaOptions: readonly AreaOption[];
  selectedAreaId: PlayAreaId;
  onAreaChange: (areaId: PlayAreaId) => void;
};

export function AreaChooser({
  areaOptions,
  selectedAreaId,
  onAreaChange,
}: AreaChooserProps) {
  const selectedOption =
    areaOptions.find((option) => option.id === selectedAreaId) || areaOptions[0];

  return (
    <section className="area-chooser" aria-label="Practice area">
      <label htmlFor="area-select">Area</label>
      <select
        id="area-select"
        value={selectedAreaId}
        onChange={(event) => onAreaChange(event.target.value as PlayAreaId)}
      >
        {areaOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
      <p>{selectedOption.count} intersections</p>
    </section>
  );
}
