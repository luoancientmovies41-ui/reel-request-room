export function LiquidBackground() {
  return (
    <div className="liquid-bg" aria-hidden>
      <div className="blob" style={{ width: "70vw", height: "70vw", top: "-15%", left: "-20%", background: "var(--blob-1)" }} />
      <div className="blob" style={{ width: "60vw", height: "60vw", top: "30%", right: "-25%", background: "var(--blob-2)", animationDelay: "-6s" }} />
      <div className="blob" style={{ width: "55vw", height: "55vw", bottom: "-20%", left: "10%", background: "var(--blob-3)", animationDelay: "-12s" }} />
      <div className="blob" style={{ width: "35vw", height: "35vw", top: "10%", right: "15%", background: "var(--blob-4)", animationDelay: "-3s" }} />
    </div>
  );
}
