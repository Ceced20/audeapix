import { useState, useRef, useEffect, useCallback } from "react";
 
/* ═══════════════════════════════════════════════════════════════════
   PACKAGES
   shots     = total kesempatan foto
   slots     = berapa foto yang masuk ke strip (user pilih)
═══════════════════════════════════════════════════════════════════ */
const PACKAGES = [
  {
    id: "double", name: "Double Snap", shots: 3, slots: 2, prints: 1,
    label: "Rp 25.000", price: 25000, icon: "✦",
    perks: ["3x kesempatan foto", "Pilih 2 foto terbaik", "Soft file (PNG)", "1x lembar print"],
  },
  {
    id: "quatre", name: "Quatre Snap", shots: 5, slots: 4, prints: 1,
    label: "Rp 40.000", price: 40000, icon: "✦✦", popular: true,
    perks: ["5x kesempatan foto", "Pilih 4 foto terbaik", "Soft file (PNG)", "1x lembar print"],
  },
  {
    id: "six", name: "Six Snap", shots: 7, slots: 6, prints: 2,
    label: "Rp 60.000", price: 60000, icon: "✦✦✦",
    perks: ["7x kesempatan foto", "Pilih 6 foto terbaik", "Soft file (PNG)", "2x lembar print"],
  },
];
 
/* ═══════════════════════════════════════════════════════════════════
   TEMPLATES
   slots    = berapa slot foto di template ini
   slotDefs = posisi slot foto dalam koordinat relatif (0-1) terhadap PNG
              { x, y, w, h } semua dalam fraksi 0-1 dari ukuran PNG
   Untuk template PNG yang diberikan (Double Snap / 2 slot):
   PNG dimensi ≈ 530×1120
   Slot 1: kira2 x=55px,y=240px  w=420px,h=360px  → x=0.104, y=0.214, w=0.792, h=0.321
   Slot 2: kira2 x=55px,y=628px  w=420px,h=360px  → x=0.104, y=0.560, h=0.321
═══════════════════════════════════════════════════════════════════ */
const TEMPLATES = [
  /* ── 2-SLOT (Double Snap) ── */
  {
    id: "t2_foculus", slots: 2, name: "Foculus 2026",
    accent: "#EB4233", labelBg: "#8b1a10", stripBg: "#1a0400",
    overlay: "/templates/2TAKETEMPLATE.png",
    slotDefs: [
      { x: 0.095, y: 0.215, w: 0.81, h: 0.285 },
      { x: 0.095, y: 0.555, w: 0.81, h: 0.285 },
    ],
    pngW: 530, pngH: 1120,
  },
  {
    id: "t2_plain", slots: 2, name: "Classic Red",
    accent: "#EB4233", labelBg: "#5a0a06", stripBg: "#0d0100",
    overlay: null,
    slotDefs: null,
    pngW: null, pngH: null,
  },
 
  /* ── 4-SLOT (Quatre Snap) ── */
  {
    id: "t4_ppg", slots: 4, name: "Powerpuff",
    accent: "#ff70b0", labelBg: "#1a0010", stripBg: "#0d0008",
    overlay: "/templates/4TAKETEMPLATE.png",
    slotDefs: null, // update setelah upload PNG 4slot
    pngW: null, pngH: null,
  },
  {
    id: "t4_plain", slots: 4, name: "Amber Glow",
    accent: "#E5B41E", labelBg: "#7a5a00", stripBg: "#110d00",
    overlay: null, slotDefs: null, pngW: null, pngH: null,
  },
 
  /* ── 6-SLOT (Six Snap) ── */
  {
    id: "t6_foculus", slots: 6, name: "Foculus 2026",
    accent: "#EB4233", labelBg: "#7a1208", stripBg: "#110200",
    overlay: "/templates/6TAKETEMPLATE.png",
    slotDefs: null, pngW: null, pngH: null,
  },
  {
    id: "t6_plain", slots: 6, name: "Mahogany",
    accent: "#c07050", labelBg: "#2a100e", stripBg: "#0d0200",
    overlay: null, slotDefs: null, pngW: null, pngH: null,
  },
];
 
/* ═══════════════════════════════════════════════════════════════════
   FILTERS
═══════════════════════════════════════════════════════════════════ */
const FILTERS = [
  { id: "none",     name: "Original",  emoji: "🎞️", css: "none",                                       overlayEmoji: null },
  { id: "bw",       name: "B&W",       emoji: "⬛", css: "grayscale(100%)",                             overlayEmoji: null },
  { id: "warm",     name: "Warm",      emoji: "🌅", css: "sepia(60%) saturate(140%) brightness(1.05)",  overlayEmoji: null },
  { id: "cool",     name: "Cool",      emoji: "🧊", css: "hue-rotate(180deg) saturate(80%)",            overlayEmoji: null },
  { id: "vintage",  name: "Vintage",   emoji: "📷", css: "sepia(80%) contrast(90%) brightness(0.9)",    overlayEmoji: null },
  { id: "vivid",    name: "Vivid",     emoji: "🌈", css: "saturate(200%) contrast(110%)",               overlayEmoji: null },
  { id: "mustache", name: "Kumis",     emoji: "🥸", css: "none",                                       overlayEmoji: "mustache" },
  { id: "glasses",  name: "Kacamata",  emoji: "🕶️", css: "none",                                       overlayEmoji: "glasses" },
  { id: "crown",    name: "Mahkota",   emoji: "👑", css: "none",                                       overlayEmoji: "crown" },
  { id: "bunny",    name: "Bunny",     emoji: "🐰", css: "none",                                       overlayEmoji: "bunny" },
  { id: "fire",     name: "Fire",      emoji: "🔥", css: "saturate(150%) contrast(110%)",               overlayEmoji: "fire" },
];
 
/* ═══════════════════════════════════════════════════════════════════
   QUEUE
═══════════════════════════════════════════════════════════════════ */
function getNextQueue() {
  const n = parseInt(localStorage.getItem("foculus_queue") || "0", 10) + 1;
  localStorage.setItem("foculus_queue", String(n));
  return String(n).padStart(3, "0");
}
function resetQueue() { localStorage.setItem("foculus_queue", "0"); }
 
/* ═══════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════ */
const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Raleway:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html,body { width:100%; min-height:100vh; background:#000; }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-thumb { background:#EB4233; border-radius:2px; }
 
    @keyframes emberRise { 0%{transform:translateY(0) scale(1);opacity:.8} 100%{transform:translateY(-110vh) scale(.2);opacity:0} }
    @keyframes pulseGlow { 0%,100%{box-shadow:0 0 18px #EB423366,0 0 50px #EB423322} 50%{box-shadow:0 0 36px #EB4233aa,0 0 90px #EB423344} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
    @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
    @keyframes flashWhite { 0%{opacity:0} 25%{opacity:1} 100%{opacity:0} }
    @keyframes cntPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:.6} }
    @keyframes queuePop { 0%{transform:scale(.5);opacity:0} 70%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
    @keyframes selectedPulse { 0%,100%{box-shadow:0 0 0 3px #EB4233,0 0 20px #EB423366} 50%{box-shadow:0 0 0 3px #ff6644,0 0 30px #EB423388} }
 
    .fade-up  {animation:fadeUp .55s ease both}
    .fade-up2 {animation:fadeUp .55s .12s ease both}
    .fade-up3 {animation:fadeUp .55s .24s ease both}
    .fade-up4 {animation:fadeUp .55s .36s ease both}
 
    .glow-btn { animation:pulseGlow 2.5s ease-in-out infinite; cursor:pointer; border:none; outline:none; transition:transform .18s; }
    .glow-btn:hover  { transform:scale(1.04); }
    .glow-btn:active { transform:scale(.96); }
 
    .pkg-card { cursor:pointer; border-radius:16px; position:relative; background:linear-gradient(155deg,#160400,#0a0000); border:1.5px solid #2a0e00; padding:26px 22px; transition:transform .22s,box-shadow .22s,border-color .22s; }
    .pkg-card:hover { transform:translateY(-5px); border-color:#EB4233; box-shadow:0 8px 36px #EB423328; }
    .pkg-card.sel   { border-color:#EB4233; box-shadow:0 0 0 3px #EB423344,0 8px 36px #EB423338; }
 
    .tmpl-wrap { cursor:pointer; border-radius:10px; border:2px solid transparent; transition:transform .2s; display:flex; flex-direction:column; align-items:center; gap:8px; }
    .tmpl-wrap:hover { transform:scale(1.03); }
    .tmpl-wrap.sel   { outline:3px solid #fff; outline-offset:4px; border-radius:12px; }
 
    .filter-btn { cursor:pointer; border:2px solid #2a0e00; border-radius:10px; background:#0d0000; padding:8px 6px; text-align:center; transition:border-color .2s,transform .15s,background .2s; min-width:58px; }
    .filter-btn:hover  { border-color:#EB4233; transform:scale(1.06); }
    .filter-btn.active { border-color:#EB4233; background:#2a0400; box-shadow:0 0 12px #EB423344; }
 
    .photo-thumb { cursor:pointer; border-radius:8px; overflow:hidden; border:2px solid #2a0e00; transition:border-color .2s,transform .15s; position:relative; }
    .photo-thumb:hover   { border-color:#EB4233; transform:scale(1.04); }
    .photo-thumb.chosen  { border-color:#EB4233; animation:selectedPulse 1.5s ease infinite; }
    .photo-thumb.full    { opacity:.5; cursor:default; }
    .photo-thumb.full:hover { transform:none; border-color:#2a0e00; }
 
    .ember-particle { position:fixed; bottom:-10px; border-radius:50%; background:radial-gradient(circle,#ffaa00,#ff2200); pointer-events:none; animation:emberRise linear infinite; }
    .flash-overlay  { position:fixed; inset:0; background:white; pointer-events:none; z-index:9999; animation:flashWhite .45s ease forwards; }
    .shimmer-text   { background:linear-gradient(90deg,#EB4233,#E5B41E,#EB4233,#fff5e0,#EB4233); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:shimmer 3s linear infinite; }
    .queue-display  { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  `}</style>
);
 
/* ═══════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════ */
function Embers({ count = 12 }) {
  const ps = Array.from({ length: count }, (_, i) => ({
    id: i, left: `${5 + Math.random() * 90}%`,
    delay: `${Math.random() * 9}s`, duration: `${6 + Math.random() * 8}s`,
    size: `${4 + Math.random() * 5}px`,
  }));
  return <>{ps.map(p => <div key={p.id} className="ember-particle" style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.duration }} />)}</>;
}
 
function Screen({ children, style = {} }) {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% -5%,#3a0800 0%,#110000 50%,#000 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative", overflow: "hidden", ...style }}>
      <Embers />
      {children}
    </div>
  );
}
 
function drawEmojiOverlay(ctx, type, w, h) {
  const cx = w / 2;
  ctx.save(); ctx.textAlign = "center";
  switch (type) {
    case "mustache": ctx.font = `${w * 0.22}px serif`; ctx.fillText("🥸", cx, h * 0.68); break;
    case "glasses":  ctx.font = `${w * 0.25}px serif`; ctx.fillText("🕶️", cx, h * 0.42); break;
    case "crown":    ctx.font = `${w * 0.28}px serif`; ctx.fillText("👑", cx, h * 0.14); break;
    case "bunny":    ctx.font = `${w * 0.22}px serif`; ctx.fillText("🐰", cx - w * 0.18, h * 0.08); ctx.fillText("🐰", cx + w * 0.18, h * 0.08); break;
    case "fire":     ctx.font = `${w * 0.14}px serif`; ["0.05,0.95","0.88,0.95","0.05,0.12","0.88,0.12"].forEach(s => { const [x, y] = s.split(",").map(Number); ctx.fillText("🔥", w * x, h * y); }); break;
    default: break;
  }
  ctx.restore();
}
 
/* ═══════════════════════════════════════════════════════════════════
   LIVE FEED — renders filtered webcam to canvas
═══════════════════════════════════════════════════════════════════ */
function LiveFeed({ videoRef, filter, aspectRatio = "4/3" }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    let raf;
    const draw = () => {
      const v = videoRef.current, c = canvasRef.current;
      if (v && c && v.readyState >= 2) {
        // maintain aspect ratio of slot
        const [aw, ah] = aspectRatio.split("/").map(Number);
        c.width = v.videoWidth || 640;
        c.height = Math.round(c.width * ah / aw);
        const ctx = c.getContext("2d");
        ctx.filter = filter?.css !== "none" ? filter.css : "none";
        ctx.save(); ctx.translate(c.width, 0); ctx.scale(-1, 1);
        // crop video to fill slot aspect ratio
        const vRatio = v.videoWidth / v.videoHeight;
        const cRatio = aw / ah;
        let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
        if (vRatio > cRatio) { sw = v.videoHeight * cRatio; sx = (v.videoWidth - sw) / 2; }
        else { sh = v.videoWidth / cRatio; sy = (v.videoHeight - sh) / 2; }
        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
        ctx.restore();
        ctx.filter = "none";
        if (filter?.overlayEmoji) drawEmojiOverlay(ctx, filter.overlayEmoji, c.width, c.height);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [videoRef, filter, aspectRatio]);
 
  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
}
 
/* ═══════════════════════════════════════════════════════════════════
   STRIP PREVIEW — template-aware
   If template has slotDefs, renders photo slots at exact positions on PNG
   Otherwise falls back to generic vertical strip
═══════════════════════════════════════════════════════════════════ */
function StripPreview({ pkg, template, photos = [], liveVideoRef = null, activeSlot = null, filter = null, scale = 1 }) {
  const slots = pkg.slots;
 
  // ── Template-based preview (PNG with exact slot positions) ──
  if (template.overlay && template.slotDefs) {
    const W = (template.pngW || 530) * scale;
    const H = (template.pngH || 1120) * scale;
 
    return (
      <div style={{ width: W, height: H, position: "relative", flexShrink: 0, borderRadius: 8 * scale, overflow: "hidden", boxShadow: `0 8px 40px ${template.accent}55` }}>
        {/* Photo slots BEHIND the PNG overlay */}
        {template.slotDefs.map((slot, i) => {
          const captured = photos[i] != null;
          const active   = activeSlot === i;
          const slotW    = slot.w * W;
          const slotH    = slot.h * H;
          const aspectRatio = `${slotW}/${slotH}`;
          return (
            <div key={i} style={{
              position: "absolute",
              left:   slot.x * W,
              top:    slot.y * H,
              width:  slotW,
              height: slotH,
              overflow: "hidden",
              background: "#000",
            }}>
              {captured && (
                <img src={photos[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
              {!captured && active && liveVideoRef?.current && (
                <LiveFeed videoRef={liveVideoRef} filter={filter} aspectRatio={aspectRatio} />
              )}
              {!captured && !active && (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.15)", fontFamily: "'Cinzel',serif", fontSize: 14 * scale }}>{i + 1}</div>
              )}
            </div>
          );
        })}
        {/* PNG template overlay on top */}
        <img src={template.overlay} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none" }} />
      </div>
    );
  }
 
  // ── Generic vertical strip fallback ──
  const SW = 160, PH = 100, GAP = 6, PAD = 10, HH = 36, FH = 28;
  const SH = HH + PAD + slots * (PH + GAP) - GAP + PAD + FH;
  return (
    <div style={{ width: SW * scale, height: SH * scale, background: template.stripBg, borderRadius: 6 * scale, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", flexShrink: 0, boxShadow: `0 8px 40px ${template.accent}55` }}>
      <div style={{ width: "100%", height: HH * scale, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: template.labelBg, flexShrink: 0 }}>
        <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 12 * scale, color: "#fff", letterSpacing: "0.25em" }}>FOCULUS</span>
        <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: 7 * scale, color: "rgba(255,255,255,.65)", textTransform: "uppercase", letterSpacing: "0.2em" }}>{template.name}</span>
      </div>
      <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: `${PAD * scale}px ${PAD * scale}px 0`, gap: GAP * scale }}>
        {Array.from({ length: slots }).map((_, i) => {
          const captured = photos[i] != null, active = activeSlot === i;
          return (
            <div key={i} style={{ width: "100%", height: PH * scale, borderRadius: 3 * scale, overflow: "hidden", background: captured ? "transparent" : "rgba(0,0,0,.35)", border: `${1.5 * scale}px solid ${captured ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
              {captured && <img src={photos[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              {!captured && active && liveVideoRef?.current && <LiveFeed videoRef={liveVideoRef} filter={filter} />}
              {!captured && !active && <span style={{ fontFamily: "'Cinzel',serif", fontSize: 10 * scale, color: "rgba(255,255,255,.2)" }}>{i + 1}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ width: "100%", height: FH * scale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: "'Raleway',sans-serif", fontSize: 6 * scale, color: "rgba(255,255,255,.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>foculus.photobooth · {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   FILTER PICKER
═══════════════════════════════════════════════════════════════════ */
function FilterPicker({ active, onChange }) {
  return (
    <div>
      <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 10, color: "#664422", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Filter Foto</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {FILTERS.map(f => (
          <button key={f.id} className={`filter-btn${active?.id === f.id ? " active" : ""}`} onClick={() => onChange(f)}>
            <div style={{ fontSize: 18 }}>{f.emoji}</div>
            <div style={{ fontFamily: "'Raleway',sans-serif", fontSize: 9, color: active?.id === f.id ? "#EB4233" : "#664422", marginTop: 3 }}>{f.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   PAGE 1 — LANDING
═══════════════════════════════════════════════════════════════════ */
function LandingPage({ onStart }) {
  return (
    <Screen>
      <div style={{ textAlign: "center", maxWidth: 620, zIndex: 1 }}>
        <p className="fade-up" style={{ fontFamily: "'Raleway',sans-serif", fontWeight: 300, letterSpacing: "0.4em", fontSize: 12, color: "#EB4233", marginBottom: 22, textTransform: "uppercase" }}>FOCULUS PHOTOBOOTH · EST. 2024</p>
        <h1 className="fade-up2 shimmer-text" style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: "clamp(56px,11vw,100px)", lineHeight: 1, marginBottom: 18 }}>FOCULUS</h1>
        <p className="fade-up3" style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 22, color: "#c9a07a", marginBottom: 16, fontWeight: 300 }}>Where every moment becomes a masterpiece</p>
        <div className="fade-up3" style={{ width: 56, height: 1, background: "linear-gradient(90deg,transparent,#EB4233,transparent)", margin: "0 auto 42px" }} />
        <div className="fade-up4" style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
          {["Professional Setup", "Instant Prints", "Premium Frames"].map(f => <span key={f} style={{ fontFamily: "'Raleway',sans-serif", fontSize: 11, color: "#EB4233", letterSpacing: "0.2em", borderBottom: "1px solid #EB423333", paddingBottom: 3 }}>{f}</span>)}
        </div>
        <button className="glow-btn fade-up4" onClick={onStart} style={{ background: "linear-gradient(135deg,#EB4233,#a02818)", color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 15, letterSpacing: "0.25em", padding: "18px 58px", borderRadius: 4, textTransform: "uppercase" }}>Mulai Sesi Foto</button>
      </div>
      {[260, 400, 540].map((s, i) => <div key={i} style={{ position: "absolute", width: s, height: s, border: `1px solid rgba(235,66,51,${0.07 - i * 0.02})`, borderRadius: "50%", pointerEvents: "none", animation: `spin ${18 + i * 9}s linear infinite` }} />)}
    </Screen>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   PAGE 2 — PILIH PAKET
═══════════════════════════════════════════════════════════════════ */
function PackagePage({ onSelect }) {
  const [sel, setSel] = useState(null);
  return (
    <Screen>
      <div style={{ width: "100%", maxWidth: 900, zIndex: 1 }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 44 }}>
          <p style={{ fontFamily: "'Raleway',sans-serif", letterSpacing: "0.3em", fontSize: 11, color: "#EB4233", textTransform: "uppercase", marginBottom: 10 }}>Langkah 1 dari 4</p>
          <h2 style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: "clamp(26px,5vw,42px)", color: "#f5e6d0" }}>Pilih Paket</h2>
          <div style={{ width: 36, height: 1, background: "#EB4233", margin: "14px auto 0" }} />
        </div>
        <div className="fade-up2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, marginBottom: 38 }}>
          {PACKAGES.map(pkg => (
            <div key={pkg.id} className={`pkg-card${sel?.id === pkg.id ? " sel" : ""}`} onClick={() => setSel(pkg)}>
              {pkg.popular && <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg,#EB4233,#E5B41E)", color: "#fff", fontFamily: "'Raleway',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", padding: "3px 14px", borderRadius: 20, textTransform: "uppercase", whiteSpace: "nowrap" }}>★ Terpopuler</div>}
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: "#EB4233", marginBottom: 6 }}>{pkg.icon}</div>
              <h3 style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 20, color: "#f5e6d0", marginBottom: 6 }}>{pkg.name}</h3>
              <div style={{ fontFamily: "'Raleway',sans-serif", fontSize: 26, fontWeight: 600, color: "#EB4233", marginBottom: 14 }}>{pkg.label}</div>
              {pkg.perks.map(p => <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ color: "#EB4233", fontSize: 10 }}>✦</span><span style={{ fontFamily: "'Raleway',sans-serif", fontSize: 13, color: "#c09070" }}>{p}</span></div>)}
              {sel?.id === pkg.id && <p style={{ marginTop: 14, textAlign: "center", color: "#EB4233", fontFamily: "'Raleway',sans-serif", fontSize: 11, letterSpacing: "0.15em" }}>✓ DIPILIH</p>}
            </div>
          ))}
        </div>
        <div className="fade-up3" style={{ textAlign: "center" }}>
          <button className="glow-btn" disabled={!sel} onClick={() => sel && onSelect(sel)} style={{ background: sel ? "linear-gradient(135deg,#EB4233,#a02818)" : "#200800", color: sel ? "#fff" : "#4a1a0a", fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 13, letterSpacing: "0.2em", padding: "15px 46px", borderRadius: 4, textTransform: "uppercase", cursor: sel ? "pointer" : "not-allowed", animation: sel ? undefined : "none" }}>Lanjut ke Pembayaran →</button>
        </div>
      </div>
    </Screen>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   PAGE 3 — PEMBAYARAN
═══════════════════════════════════════════════════════════════════ */
function PaymentPage({ pkg, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <Screen>
      <div style={{ width: "100%", maxWidth: 500, zIndex: 1, textAlign: "center" }}>
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: "'Raleway',sans-serif", letterSpacing: "0.3em", fontSize: 11, color: "#EB4233", textTransform: "uppercase", marginBottom: 10 }}>Langkah 2 dari 4</p>
          <h2 style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 34, color: "#f5e6d0", marginBottom: 6 }}>Pembayaran</h2>
          <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 13, color: "#a07060" }}>Scan QRIS · Tunjukkan bukti ke kasir</p>
        </div>
        <div className="fade-up2" style={{ background: "linear-gradient(135deg,#1a0400,#0d0000)", border: "1px solid #2a0e00", borderRadius: 10, padding: "14px 22px", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "#f5e6d0", marginBottom: 6 }}>{pkg.name}</p>
              {pkg.perks.map(p => <p key={p} style={{ fontFamily: "'Raleway',sans-serif", fontSize: 11, color: "#a07060" }}>· {p}</p>)}
            </div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: "#EB4233", fontWeight: 700, flexShrink: 0, marginLeft: 12 }}>{pkg.label}</div>
          </div>
        </div>
        <div className="fade-up3" style={{ marginBottom: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, display: "inline-block", boxShadow: "0 0 50px #EB423322" }}>
            <img src="/assets/qris.png" alt="QRIS" width={220} height={220} style={{ display: "block", borderRadius: 6, objectFit: "contain" }}
              onError={e => { e.target.style.display = "none"; e.target.insertAdjacentHTML("afterend", '<div style="width:220px;height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#aaa;font-size:12px;text-align:center;font-family:sans-serif"><div style=\'font-size:36px\'>📱</div><div>Taruh QRIS di<br/>/public/assets/qris.png</div></div>'); }}
            />
            <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 10, color: "#333", marginTop: 7, textAlign: "center" }}>FOCULUS PHOTOBOOTH</p>
          </div>
        </div>
        <p className="fade-up3" style={{ fontFamily: "'Raleway',sans-serif", fontSize: 12, color: "#a07060", marginBottom: 24, lineHeight: 1.8 }}>Setelah bayar, tunjukkan bukti ke kasir.<br />Admin konfirmasi lalu sesi dilanjutkan.</p>
        {!confirmed ? (
          <div className="fade-up4" style={{ background: "#0d0000", border: "1px dashed #EB4233", borderRadius: 10, padding: "18px 22px" }}>
            <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 10, color: "#EB4233", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>🔐 Admin Panel</p>
            <button className="glow-btn" onClick={() => { setConfirmed(true); setTimeout(onConfirm, 1000); }} style={{ background: "linear-gradient(135deg,#EB4233,#a02818)", color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 12, letterSpacing: "0.15em", padding: "11px 30px", borderRadius: 4, textTransform: "uppercase" }}>✓ Konfirmasi Pembayaran</button>
          </div>
        ) : (
          <div style={{ padding: 18, background: "#001800", border: "1px solid #00aa44", borderRadius: 10, color: "#00ff66", fontFamily: "'Cinzel',serif", fontSize: 15 }}>✓ Dikonfirmasi — Melanjutkan...</div>
        )}
      </div>
    </Screen>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   PAGE 4 — PILIH TEMPLATE
═══════════════════════════════════════════════════════════════════ */
function TemplatePage({ pkg, onSelect }) {
  const [sel, setSel] = useState(null);
  const available = TEMPLATES.filter(t => t.slots === pkg.slots);
  return (
    <Screen>
      <div style={{ width: "100%", maxWidth: 960, zIndex: 1 }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ fontFamily: "'Raleway',sans-serif", letterSpacing: "0.3em", fontSize: 11, color: "#EB4233", textTransform: "uppercase", marginBottom: 10 }}>Langkah 3 dari 4</p>
          <h2 style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: "clamp(22px,5vw,38px)", color: "#f5e6d0" }}>Pilih Template Strip</h2>
          <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 13, color: "#a07060", marginTop: 8 }}>Paket <strong style={{ color: "#EB4233" }}>{pkg.name}</strong> — {pkg.slots} foto masuk ke strip</p>
          <div style={{ width: 36, height: 1, background: "#EB4233", margin: "14px auto 0" }} />
        </div>
        <div className="fade-up2" style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap", marginBottom: 40, alignItems: "flex-start" }}>
          {available.map(t => (
            <div key={t.id} className={`tmpl-wrap${sel?.id === t.id ? " sel" : ""}`} onClick={() => setSel(t)}>
              <StripPreview pkg={pkg} template={t} photos={[]} scale={0.28} />
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: sel?.id === t.id ? "#fff" : "#a07060", textAlign: "center" }}>
                {t.name}{sel?.id === t.id && <span style={{ color: "#EB4233", marginLeft: 6 }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="fade-up3" style={{ textAlign: "center" }}>
          <button className="glow-btn" disabled={!sel} onClick={() => sel && onSelect(sel)} style={{ background: sel ? "linear-gradient(135deg,#EB4233,#a02818)" : "#200800", color: sel ? "#fff" : "#4a1a0a", fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 13, letterSpacing: "0.2em", padding: "15px 46px", borderRadius: 4, textTransform: "uppercase", cursor: sel ? "pointer" : "not-allowed", animation: sel ? undefined : "none" }}>Mulai Foto →</button>
        </div>
      </div>
    </Screen>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   PAGE 5 — KAMERA
═══════════════════════════════════════════════════════════════════ */
function CameraPage({ pkg, template, queueNum, onDone }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
 
  const [takenPhotos, setTakenPhotos] = useState([]); // semua foto yang sudah diambil
  const [countdown,   setCountdown]   = useState(null);
  const [flash,       setFlash]       = useState(false);
  const [camError,    setCamError]    = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
 
  // slot aspect ratio dari template
  const slotAspect = template.slotDefs
    ? (() => { const s = template.slotDefs[0]; const w = s.w * (template.pngW || 530); const h = s.h * (template.pngH || 1120); return `${w}/${h}`; })()
    : "4/3";
 
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 1280, height: 720 }, audio: false })
      .then(s => { streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setCamError(true));
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);
 
  const captureFrame = useCallback(() => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return null;
    const [aw, ah] = slotAspect.split("/").map(Number);
    c.width = 1280; c.height = Math.round(1280 * ah / aw);
    const ctx = c.getContext("2d");
    ctx.filter = activeFilter.css !== "none" ? activeFilter.css : "none";
    ctx.save(); ctx.translate(c.width, 0); ctx.scale(-1, 1);
    const vRatio = v.videoWidth / v.videoHeight;
    const cRatio = aw / ah;
    let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
    if (vRatio > cRatio) { sw = v.videoHeight * cRatio; sx = (v.videoWidth - sw) / 2; }
    else { sh = v.videoWidth / cRatio; sy = (v.videoHeight - sh) / 2; }
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
    ctx.restore(); ctx.filter = "none";
    if (activeFilter.overlayEmoji) drawEmojiOverlay(ctx, activeFilter.overlayEmoji, c.width, c.height);
    return c.toDataURL("image/png");
  }, [activeFilter, slotAspect]);
 
  const startCapture = useCallback(() => {
    if (countdown !== null || takenPhotos.length >= pkg.shots) return;
    let cnt = 3; setCountdown(cnt);
    const iv = setInterval(() => {
      cnt--;
      if (cnt > 0) { setCountdown(cnt); }
      else {
        clearInterval(iv);
        setCountdown("📸"); setFlash(true); setTimeout(() => setFlash(false), 400);
        const url = captureFrame();
        if (url) setTakenPhotos(prev => [...prev, url]);
        setTimeout(() => setCountdown(null), 500);
      }
    }, 1000);
  }, [countdown, takenPhotos.length, pkg.shots, captureFrame]);
 
  const remaining = pkg.shots - takenPhotos.length;
  const doneCapturing = takenPhotos.length >= pkg.shots;
 
  return (
    <Screen style={{ justifyContent: "flex-start", paddingTop: 24 }}>
      {flash && <div className="flash-overlay" />}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div style={{ width: "100%", maxWidth: 960, zIndex: 1 }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 18 }}>
          <p style={{ fontFamily: "'Raleway',sans-serif", letterSpacing: "0.3em", fontSize: 11, color: "#EB4233", textTransform: "uppercase", marginBottom: 6 }}>Antrian <strong>{queueNum}</strong> · Sesi Foto</p>
          <h2 style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 24, color: "#f5e6d0" }}>
            {doneCapturing ? `Pilih ${pkg.slots} foto terbaik ↓` : `${remaining} kesempatan foto tersisa`}
          </h2>
        </div>
 
        {!doneCapturing ? (
          // ── SHOOTING MODE ──
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" }}>
            {/* Camera */}
            <div style={{ flex: "1 1 340px", minWidth: 280, maxWidth: 520 }}>
              {camError ? (
                <div style={{ width: "100%", aspectRatio: slotAspect, background: "#0d0000", border: "1px solid #2a0e00", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <div style={{ fontSize: 40 }}>📷</div>
                  <p style={{ fontFamily: "'Raleway',sans-serif", color: "#a07060", fontSize: 12, textAlign: "center", padding: "0 20px" }}>Kamera tidak terdeteksi.</p>
                </div>
              ) : (
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: `3px solid ${template.accent}` }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", display: "block", opacity: 0, position: "absolute", pointerEvents: "none" }} />
                  <div style={{ width: "100%", aspectRatio: slotAspect, position: "relative", overflow: "hidden" }}>
                    <LiveFeed videoRef={videoRef} filter={activeFilter} aspectRatio={slotAspect} />
                  </div>
                  {countdown !== null && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#00000088" }}>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 110, lineHeight: 1, color: template.accent, textShadow: `0 0 60px ${template.accent}99`, animation: "cntPulse .85s ease infinite" }}>{countdown}</div>
                    </div>
                  )}
                </div>
              )}
              {/* Filters */}
              <div style={{ marginTop: 12 }}><FilterPicker active={activeFilter} onChange={setActiveFilter} /></div>
              {/* Capture */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                <button className="glow-btn" onClick={startCapture} disabled={countdown !== null} style={{ background: countdown !== null ? "#200800" : `linear-gradient(135deg,${template.accent},${template.labelBg})`, color: countdown !== null ? "#4a1a0a" : "#fff", fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 14, letterSpacing: "0.2em", padding: "14px", borderRadius: 8, textTransform: "uppercase", width: "100%", cursor: countdown !== null ? "not-allowed" : "pointer", animation: countdown !== null ? "none" : undefined }}>
                  {countdown !== null ? "Bersiap..." : `📸 Ambil Foto  ·  ${remaining} tersisa`}
                </button>
                <button onClick={() => setTakenPhotos(prev => [...prev, ...Array(pkg.shots - prev.length).fill(null)].slice(0, pkg.shots))} style={{ background: "transparent", border: "1px dashed #2a0e00", color: "#4a1a0a", fontFamily: "'Raleway',sans-serif", fontSize: 11, letterSpacing: "0.15em", padding: "9px", borderRadius: 8, cursor: "pointer", textTransform: "uppercase", transition: "border-color .2s,color .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#EB4233"; e.currentTarget.style.color = "#EB4233"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a0e00"; e.currentTarget.style.color = "#4a1a0a"; }}
                >⏭ Skip (Testing)</button>
              </div>
            </div>
 
            {/* Thumbnail row of captured photos */}
            {takenPhotos.length > 0 && (
              <div style={{ flexShrink: 0 }}>
                <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 10, color: "#664422", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Diambil ({takenPhotos.length}/{pkg.shots})</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {takenPhotos.filter(Boolean).map((p, i) => (
                    <div key={i} style={{ width: 80, height: 60, borderRadius: 6, overflow: "hidden", border: "1px solid #3a1500" }}>
                      <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // ── SELECTION MODE ──
          <PhotoSelectionMode
            takenPhotos={takenPhotos.filter(Boolean)}
            pkg={pkg}
            template={template}
            queueNum={queueNum}
            onDone={onDone}
          />
        )}
      </div>
    </Screen>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   PHOTO SELECTION MODE
   User pilih mana saja yang masuk ke strip
═══════════════════════════════════════════════════════════════════ */
function PhotoSelectionMode({ takenPhotos, pkg, template, queueNum, onDone }) {
  const [chosen, setChosen] = useState([]); // indices of chosen photos
  const [processing, setProcessing] = useState(false);
 
  const toggle = (idx) => {
    if (chosen.includes(idx)) {
      setChosen(chosen.filter(i => i !== idx));
    } else if (chosen.length < pkg.slots) {
      setChosen([...chosen, idx]);
    }
  };
 
  const selectedPhotos = chosen.map(i => takenPhotos[i]);
  const ready = chosen.length === pkg.slots;
 
  const buildAndSave = useCallback(async () => {
    setProcessing(true);
    const photos = selectedPhotos;
 
    // ── If template has slotDefs, composite onto PNG ──
    if (template.overlay && template.slotDefs) {
      const PW = template.pngW || 530;
      const PH = template.pngH || 1120;
      const oc = document.createElement("canvas");
      oc.width = PW; oc.height = PH;
      const ctx = oc.getContext("2d");
 
      // draw photos into slots
      for (let i = 0; i < photos.length && i < template.slotDefs.length; i++) {
        const s = template.slotDefs[i];
        const im = await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = photos[i]; });
        ctx.save();
        ctx.beginPath();
        ctx.rect(s.x * PW, s.y * PH, s.w * PW, s.h * PH);
        ctx.clip();
        // cover fit
        const slotW = s.w * PW, slotH = s.h * PH;
        const ir = im.width / im.height, sr = slotW / slotH;
        let sw = im.width, sh = im.height, sx = 0, sy = 0;
        if (ir > sr) { sw = im.height * sr; sx = (im.width - sw) / 2; }
        else { sh = im.width / sr; sy = (im.height - sh) / 2; }
        ctx.drawImage(im, sx, sy, sw, sh, s.x * PW, s.y * PH, slotW, slotH);
        ctx.restore();
      }
 
      // overlay PNG template on top
      try {
        const ov = await new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = template.overlay; });
        ctx.drawImage(ov, 0, 0, PW, PH);
      } catch (_) {}
 
      // footer
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, PH - 36, PW, 36);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`FOCULUS · ${pkg.name} · No.${queueNum} · ${new Date().toLocaleDateString("id-ID")}`, PW / 2, PH - 14);
 
      const link = document.createElement("a");
      link.href = oc.toDataURL("image/png");
      link.download = `photostrip-${queueNum}.png`;
      link.click();
 
    } else {
      // ── Generic strip ──
      const SW = 500, PH2 = 320, GAP = 10, PAD = 18, HH = 72, FH = 44;
      const SH = HH + PAD + photos.length * (PH2 + GAP) - GAP + PAD + FH;
      const oc = document.createElement("canvas"); oc.width = SW; oc.height = SH;
      const ctx = oc.getContext("2d");
      const bg = ctx.createLinearGradient(0, 0, 0, SH);
      bg.addColorStop(0, template.stripBg); bg.addColorStop(1, template.labelBg);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, SW, SH);
      ctx.fillStyle = template.labelBg; ctx.fillRect(0, 0, SW, HH);
      ctx.fillStyle = "#fff"; ctx.font = "bold 28px serif"; ctx.textAlign = "center";
      ctx.fillText("FOCULUS", SW / 2, 38);
      ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.font = "12px sans-serif";
      ctx.fillText(`${template.name.toUpperCase()} · ${pkg.name.toUpperCase()}`, SW / 2, 58);
      ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 3; ctx.strokeRect(4, 4, SW - 8, SH - 8);
      for (let i = 0; i < photos.length; i++) {
        const y = HH + PAD + i * (PH2 + GAP), PW3 = SW - PAD * 2;
        const im = await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = photos[i]; });
        ctx.save(); ctx.beginPath(); ctx.roundRect(PAD, y, PW3, PH2, 4); ctx.clip();
        ctx.drawImage(im, PAD, y, PW3, PH2); ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(PAD, y, PW3, PH2, 4); ctx.stroke();
      }
      const FY = SH - FH;
      ctx.fillStyle = template.labelBg; ctx.fillRect(0, FY, SW, FH);
      ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`foculus.photobooth · ${new Date().toLocaleDateString("id-ID")}`, SW / 2, FY + 17);
      ctx.fillText(`${pkg.name} · No.${queueNum}`, SW / 2, FY + 33);
      const link = document.createElement("a");
      link.href = oc.toDataURL("image/png");
      link.download = `photostrip-${queueNum}.png`;
      link.click();
    }
 
    setProcessing(false);
    onDone(selectedPhotos);
  }, [selectedPhotos, template, pkg, queueNum, onDone]);
 
  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
      {/* Left: photo grid to pick from */}
      <div style={{ flex: "1 1 420px", maxWidth: 600 }}>
        <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 13, color: "#c09070", marginBottom: 16, lineHeight: 1.7 }}>
          Pilih <strong style={{ color: "#EB4233" }}>{pkg.slots} foto</strong> yang masuk ke strip ({chosen.length}/{pkg.slots} dipilih)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
          {takenPhotos.map((photo, i) => {
            const isChosen = chosen.includes(i);
            const isFull   = !isChosen && chosen.length >= pkg.slots;
            return (
              <div key={i} className={`photo-thumb${isChosen ? " chosen" : ""}${isFull ? " full" : ""}`} onClick={() => !isFull && toggle(i)} style={{ aspectRatio: "4/3" }}>
                <img src={photo} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {/* Order badge */}
                {isChosen && (
                  <div style={{ position: "absolute", top: 6, left: 6, background: "#EB4233", color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: 13, width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {chosen.indexOf(i) + 1}
                  </div>
                )}
                {isFull && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#664422", fontSize: 11, fontFamily: "'Raleway',sans-serif" }}>Sudah penuh</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <button className="glow-btn" disabled={!ready || processing} onClick={buildAndSave} style={{ flex: 1, background: ready ? "linear-gradient(135deg,#EB4233,#a02818)" : "#200800", color: ready ? "#fff" : "#4a1a0a", fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 13, letterSpacing: "0.15em", padding: "14px", borderRadius: 8, textTransform: "uppercase", cursor: ready ? "pointer" : "not-allowed", animation: ready ? undefined : "none" }}>
            {processing ? "Menyimpan..." : ready ? `✓ Simpan & Lanjut` : `Pilih ${pkg.slots - chosen.length} foto lagi`}
          </button>
        </div>
      </div>
 
      {/* Right: live strip preview with chosen photos */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 10, color: "#664422", letterSpacing: "0.2em", textTransform: "uppercase" }}>Preview Strip</p>
        <StripPreview pkg={pkg} template={template} photos={selectedPhotos} scale={0.38} />
      </div>
    </div>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   PAGE 6 — TIKET ANTRIAN
═══════════════════════════════════════════════════════════════════ */
function QueueTicketPage({ queueNum, pkg, template, onHome }) {
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, "");
  const displayUrl = `${baseUrl}#/queue/${queueNum}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(displayUrl)}`;
  return (
    <Screen>
      <div style={{ width: "100%", maxWidth: 480, zIndex: 1, textAlign: "center" }}>
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "'Raleway',sans-serif", letterSpacing: "0.3em", fontSize: 11, color: "#EB4233", textTransform: "uppercase", marginBottom: 10 }}>Sesi Selesai ✓</p>
          <h2 style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: "clamp(22px,5vw,36px)", color: "#f5e6d0", marginBottom: 6 }}>Tiket Antrian</h2>
          <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 12, color: "#a07060" }}>Tunjukkan halaman ini atau scan QR ke kasir</p>
        </div>
        <div className="fade-up2" style={{ background: "linear-gradient(135deg,#1a0400,#0d0000)", border: `2px solid ${template.accent}`, borderRadius: 20, padding: "32px 28px", marginBottom: 24, boxShadow: `0 0 60px ${template.accent}44` }}>
          <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 11, color: "#a07060", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8 }}>No. Antrian</p>
          <div className="queue-num" style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: 96, lineHeight: 1, color: template.accent, textShadow: `0 0 40px ${template.accent}99` }}>{queueNum}</div>
          <div style={{ width: 40, height: 1, background: template.accent + "55", margin: "16px auto" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Raleway',sans-serif", fontSize: 12, color: "#a07060" }}>
            <span>Paket: <strong style={{ color: "#f5e6d0" }}>{pkg.name}</strong></span>
            <span>{pkg.prints}x lembar print</span>
          </div>
        </div>
        <div className="fade-up3" style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 11, color: "#a07060", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Scan QR untuk Kasir</p>
          <div style={{ background: "#fff", display: "inline-block", borderRadius: 12, padding: 12, boxShadow: `0 0 30px ${template.accent}33` }}>
            <img src={qrUrl} alt="QR" width={160} height={160} style={{ display: "block", borderRadius: 6 }} />
          </div>
          <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 10, color: "#4a1a0a", marginTop: 8 }}>Strip: <strong>photostrip-{queueNum}.png</strong> sudah tersimpan</p>
        </div>
        <div className="fade-up4">
          <button className="glow-btn" onClick={onHome} style={{ background: "linear-gradient(135deg,#EB4233,#a02818)", color: "#fff", fontFamily: "'Cinzel',serif", fontWeight: 600, fontSize: 12, letterSpacing: "0.2em", padding: "13px 38px", borderRadius: 4, textTransform: "uppercase" }}>← Kembali ke Home</button>
          <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 10, color: "#2a0e00", marginTop: 10 }}>Admin: tekan tombol di atas untuk sesi berikutnya</p>
          <button onClick={() => { if (window.confirm("Reset antrian ke 001?")) resetQueue(); }} style={{ marginTop: 10, background: "transparent", border: "1px dashed #2a0e00", color: "#3a1200", fontFamily: "'Raleway',sans-serif", fontSize: 10, padding: "6px 18px", borderRadius: 4, cursor: "pointer", textTransform: "uppercase" }}>🔄 Reset Antrian (Admin)</button>
        </div>
      </div>
    </Screen>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   PAGE 7 — QUEUE DISPLAY (kasir/TV)
═══════════════════════════════════════════════════════════════════ */
function QueueDisplayPage({ number }) {
  return (
    <div className="queue-display" style={{ background: "radial-gradient(ellipse at 50% 30%,#1a0400,#000)" }}>
      <G /><Embers count={18} />
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <p style={{ fontFamily: "'Raleway',sans-serif", letterSpacing: "0.5em", fontSize: 14, color: "#EB4233", textTransform: "uppercase", marginBottom: 24 }}>FOCULUS PHOTOBOOTH · NOMOR ANTRIAN</p>
        <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 900, fontSize: "clamp(120px,25vw,220px)", lineHeight: 1, color: "#EB4233", textShadow: "0 0 80px #EB423399", animation: "queuePop .7s cubic-bezier(.34,1.56,.64,1) both" }}>{number}</div>
        <div style={{ width: 80, height: 2, background: "linear-gradient(90deg,transparent,#EB4233,transparent)", margin: "32px auto" }} />
        <p style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: "#f5e6d0", letterSpacing: "0.2em" }}>Silakan ke kasir untuk mengambil hasil print</p>
        <p style={{ fontFamily: "'Raleway',sans-serif", fontSize: 14, color: "#664422", marginTop: 12, letterSpacing: "0.1em" }}>FOCULUS PHOTOBOOTH · {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
    </div>
  );
}
 
/* ═══════════════════════════════════════════════════════════════════
   ROUTER + MAIN
═══════════════════════════════════════════════════════════════════ */
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const h = () => setHash(window.location.hash);
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return hash;
}
 
export default function App() {
  const hash = useHashRoute();
  const m = hash.match(/^#\/queue\/(\d+)$/);
  if (m) return <QueueDisplayPage number={m[1].padStart(3, "0")} />;
  return <MainFlow />;
}
 
function MainFlow() {
  const [step,     setStep]     = useState("landing");
  const [pkg,      setPkg]      = useState(null);
  const [template, setTemplate] = useState(null);
  const [photos,   setPhotos]   = useState([]);
  const [queueNum, setQueueNum] = useState(null);
 
  const reset = () => { setStep("landing"); setPkg(null); setTemplate(null); setPhotos([]); setQueueNum(null); window.location.hash = ""; };
  const goToCamera = t => { const n = getNextQueue(); setTemplate(t); setQueueNum(n); setStep("camera"); };
 
  return (
    <>
      <G />
      {step === "landing"  && <LandingPage  onStart={() => setStep("package")} />}
      {step === "package"  && <PackagePage  onSelect={p => { setPkg(p); setStep("payment"); }} />}
      {step === "payment"  && <PaymentPage  pkg={pkg} onConfirm={() => setStep("template")} />}
      {step === "template" && <TemplatePage pkg={pkg} onSelect={goToCamera} />}
      {step === "camera"   && <CameraPage   pkg={pkg} template={template} queueNum={queueNum} onDone={p => { setPhotos(p); setStep("queue"); }} />}
      {step === "queue"    && <QueueTicketPage queueNum={queueNum} pkg={pkg} template={template} onHome={reset} />}
    </>
  );
}