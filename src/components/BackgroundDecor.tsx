export default function BackgroundDecor() {
  return (
    <div className="bg-decor" aria-hidden="true">
      <div className="sky-layer"></div>
      <div className="ground-boundary">
        <svg viewBox="0 0 40 6" preserveAspectRatio="none" shapeRendering="crispEdges">
          <rect x="0" y="4" width="40" height="2" fill="#B08D4E" />
          <rect x="0" y="2" width="4" height="2" fill="#4F6B2E" />
          <rect x="8" y="2" width="4" height="2" fill="#4F6B2E" />
          <rect x="16" y="2" width="4" height="2" fill="#4F6B2E" />
          <rect x="24" y="2" width="4" height="2" fill="#4F6B2E" />
          <rect x="32" y="2" width="4" height="2" fill="#4F6B2E" />
        </svg>
      </div>

      <div className="tunnel-entrance" style={{ left: "2%" }}></div>
      <div className="shaft-deep" style={{ left: "calc(2% + 0px)", bottom: 104 }}></div>
      <svg
        className="tunnel tunnel-branch"
        viewBox="0 0 12 5"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        style={{ left: "2%", bottom: 24 }}
      >
        <rect x="0" y="0" width="7" height="5" fill="#241608" />
        <rect x="0" y="4" width="7" height="1" fill="#140C05" />
        <rect x="9" y="1" width="1" height="1" fill="#F0C860" />
        <rect x="9" y="2" width="1" height="1" fill="#D9A536" />
        <rect x="10" y="2" width="1" height="1" fill="#97730E" />
        <rect x="9" y="3" width="1" height="1" fill="#D9A536" />
        <rect x="3" y="0" width="2" height="1" fill="#C9752B" />
        <rect x="3" y="1" width="2" height="1" fill="#D9A87A" />
        <rect x="4" y="1" width="1" height="1" fill="#F5D77A" />
        <rect x="3" y="2" width="2" height="1" fill="#3A5F7D" />
        <rect x="5" y="2" width="1" height="1" fill="#D9A87A" />
        <rect x="6" y="1" width="1" height="1" fill="#8B5A2B" />
        <rect x="6" y="0" width="1" height="1" fill="#9AA5AE" />
        <rect x="3" y="3" width="1" height="1" fill="#2B2620" />
        <rect x="4" y="3" width="1" height="1" fill="#2B2620" />
      </svg>

      <svg
        className="tunnel"
        viewBox="0 0 8 10"
        shapeRendering="crispEdges"
        style={{ top: 150, right: "4%", width: 76, height: 95 }}
      >
        <rect x="2" y="1" width="4" height="8" fill="#241608" />
        <rect x="2" y="9" width="4" height="1" fill="#140C05" />
        <rect x="1" y="0" width="1" height="2" fill="#8B5A2B" />
        <rect x="6" y="0" width="1" height="2" fill="#8B5A2B" />
        <rect x="1" y="0" width="6" height="1" fill="#6B4220" />
        <rect x="1" y="5" width="6" height="1" fill="#6B4220" />
        <rect x="3" y="8" width="1" height="1" fill="#8B5A2B" />
        <rect x="4" y="9" width="1" height="1" fill="#8B5A2B" />
        <rect x="5" y="8" width="1" height="1" fill="#9AA5AE" />
      </svg>
      <div className="tunnel-entrance" style={{ left: "50%", marginLeft: -32 }}></div>
      <div className="shaft-deep" style={{ left: "50%", marginLeft: -32, bottom: 20 }}></div>
      <div style={{ position: "absolute", left: "50%", marginLeft: -8, bottom: 20, width: 16, height: 32 }}>
        <div style={{ width: 16, height: 16, background: "#3A2A18" }}></div>
        <div style={{ width: 16, height: 16, background: "#F5C24C" }}></div>
      </div>

      <span style={{ top: "32%", left: "5%", transform: "rotate(8deg)", fontSize: 26 }}>💎</span>
      <span style={{ top: "46%", left: "85%", transform: "rotate(-6deg)", fontSize: 34 }}>🪙</span>
      <span style={{ top: "60%", left: "12%", transform: "rotate(15deg)", fontSize: 28 }}>⛏️</span>
      <span style={{ top: "72%", left: "80%", transform: "rotate(-14deg)", fontSize: 24 }}>💎</span>
      <span style={{ top: "86%", left: "6%", transform: "rotate(6deg)", fontSize: 30 }}>🪙</span>
      <span style={{ top: "94%", left: "75%", transform: "rotate(-8deg)", fontSize: 26 }}>⛏️</span>

      <svg className="dot-gem" viewBox="0 0 2 2" style={{ top: "24%", left: "70%", width: 16, height: 16 }}>
        <rect x="0" y="0" width="1" height="1" fill="#F0C860" />
        <rect x="1" y="0" width="1" height="1" fill="#D9A536" />
        <rect x="0" y="1" width="1" height="1" fill="#97730E" />
      </svg>
      <svg className="dot-gem" viewBox="0 0 3 3" style={{ top: "38%", left: "90%", width: 18, height: 18 }}>
        <rect x="1" y="0" width="1" height="1" fill="#9FE3D2" />
        <rect x="0" y="1" width="1" height="1" fill="#4FB3A0" />
        <rect x="2" y="1" width="1" height="1" fill="#4FB3A0" />
        <rect x="1" y="2" width="1" height="1" fill="#2E8A78" />
      </svg>
      <svg className="dot-gem" viewBox="0 0 2 2" style={{ top: "52%", left: "8%", width: 14, height: 14 }}>
        <rect x="0" y="0" width="1" height="1" fill="#F0C860" />
        <rect x="1" y="0" width="1" height="1" fill="#D9A536" />
        <rect x="0" y="1" width="1" height="1" fill="#97730E" />
      </svg>
      <svg className="dot-gem" viewBox="0 0 3 3" style={{ top: "64%", left: "65%", width: 20, height: 20 }}>
        <rect x="1" y="0" width="1" height="1" fill="#E0BEF0" />
        <rect x="0" y="1" width="1" height="1" fill="#B187D9" />
        <rect x="2" y="1" width="1" height="1" fill="#B187D9" />
        <rect x="1" y="2" width="1" height="1" fill="#7C4FAE" />
      </svg>
      <svg className="dot-gem" viewBox="0 0 2 2" style={{ top: "78%", left: "92%", width: 16, height: 16 }}>
        <rect x="0" y="0" width="1" height="1" fill="#F0C860" />
        <rect x="1" y="0" width="1" height="1" fill="#D9A536" />
        <rect x="0" y="1" width="1" height="1" fill="#97730E" />
      </svg>
      <svg className="dot-gem" viewBox="0 0 3 3" style={{ top: "90%", left: "40%", width: 18, height: 18 }}>
        <rect x="1" y="0" width="1" height="1" fill="#9FE3D2" />
        <rect x="0" y="1" width="1" height="1" fill="#4FB3A0" />
        <rect x="2" y="1" width="1" height="1" fill="#4FB3A0" />
        <rect x="1" y="2" width="1" height="1" fill="#2E8A78" />
      </svg>
      <svg className="dot-gem" viewBox="0 0 2 2" style={{ top: "20%", left: "30%", width: 14, height: 14 }}>
        <rect x="0" y="0" width="1" height="1" fill="#F0C860" />
        <rect x="1" y="0" width="1" height="1" fill="#D9A536" />
        <rect x="0" y="1" width="1" height="1" fill="#97730E" />
      </svg>
    </div>
  );
}
