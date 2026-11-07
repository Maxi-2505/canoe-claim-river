import chatBoatUrl from "@/assets/chat-canoe-3d.png";

/** A transparent wooden canoe, with its bow angled toward the viewer. */
export function ChatBoatMark({ className }: { className?: string }) {
  return (
    <img src={chatBoatUrl} alt="" aria-hidden="true" draggable={false} className={className} />
  );
}
