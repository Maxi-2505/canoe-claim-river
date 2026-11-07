import water from "@/assets/pencil-water.jpg";
import canoe from "@/assets/pencil-canoe.png";

/** Pencil lake with a canoe that rides the swell. Decorative only. */
export function PencilBackdrop() {
  return (
    <div aria-hidden="true" className="pencil-scene">
      <div className="pencil-water" style={{ backgroundImage: `url(${water})` }} />
      <div className="pencil-water pencil-water--near" style={{ backgroundImage: `url(${water})` }} />
      <div className="pencil-canoe">
        <img src={canoe} alt="" width={1600} height={640} />
      </div>
    </div>
  );
}
