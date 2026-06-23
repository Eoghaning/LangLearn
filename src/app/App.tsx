import { useState, useRef, useEffect } from "react";
import {
  LayoutGrid, CreditCard, GitBranch, BookOpen, Plus, X, Save,
  Trash2, ChevronLeft, ChevronRight, RotateCcw, Link2, Globe,
  ArrowRight, FlipHorizontal, AlignVerticalJustifyCenter,
  Trophy, Languages, Search, Maximize2, Eye, EyeOff,
  Copy, ArrowLeftRight, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type SetType   = "flashcard" | "grid" | "flowchart";
type ViewType  = "dashboard" | SetType | "games" | "translate";
type GameMode  = "quiz" | "reverse" | "type";
type NodeShape = "rect" | "ellipse" | "diamond";
type EdgeStyle = "solid" | "dotted" | "dashed";
type SplitDir  = "horizontal" | "vertical";

interface LangOption   { code: string; name: string; flag: string }
interface FlashCard    { id: string; native: string; target: string }
interface GridRow      { id: string; native: string; target: string }
interface FlowNode     { id: string; x: number; y: number; w: number; h: number; native: string; target: string; splitDir: SplitDir; shape: NodeShape }
interface FlowEdge     { id: string; from: string; to: string; style: EdgeStyle }
interface StudySet     {
  id: string; name: string; type: SetType;
  nativeLang: string; targetLang: string; createdAt: string;
  cards?: FlashCard[]; rows?: GridRow[];
  nodes?: FlowNode[]; edges?: FlowEdge[];
}
interface QuizQuestion { prompt: string; answer: string; choices: string[]; mode: GameMode }

// ─── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES: LangOption[] = [
  { code: "en", name: "English",    flag: "🇺🇸" },
  { code: "es", name: "Spanish",    flag: "🇪🇸" },
  { code: "fr", name: "French",     flag: "🇫🇷" },
  { code: "de", name: "German",     flag: "🇩🇪" },
  { code: "ja", name: "Japanese",   flag: "🇯🇵" },
  { code: "zh", name: "Chinese",    flag: "🇨🇳" },
  { code: "ko", name: "Korean",     flag: "🇰🇷" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "it", name: "Italian",    flag: "🇮🇹" },
  { code: "ru", name: "Russian",    flag: "🇷🇺" },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

async function autoTranslate(text: string, from: string, to: string): Promise<string> {
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
    const d = await r.json();
    return d.responseData?.translatedText ?? "";
  } catch { return ""; }
}

function migrateSets(raw: any[]): StudySet[] {
  return raw.map((s: any) => {
    if (s.type === "flowchart" && s.nodes) {
      const edges: FlowEdge[] = s.edges ?? [];
      if (!s.edges) {
        s.nodes.forEach((n: any) => {
          (n.connections ?? []).forEach((tid: string) => edges.push({ id: uid(), from: n.id, to: tid, style: "solid" }));
        });
      }
      return {
        ...s,
        nodes: s.nodes.map((n: any) => ({
          id: n.id, x: n.x, y: n.y, w: n.w ?? 240, h: n.h ?? 160,
          native: n.native ?? "", target: n.target ?? "",
          splitDir: n.splitDir ?? "horizontal", shape: n.shape ?? "rect",
        })),
        edges,
      };
    }
    return s;
  });
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]   = useState<ViewType>("dashboard");
  const [nativeLang, setNativeLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [sets, setSets]   = useState<StudySet[]>(() => {
    try { return migrateSets(JSON.parse(localStorage.getItem("langnotes_v2") || "[]")); }
    catch { return []; }
  });
  const [editingSet, setEditingSet] = useState<StudySet | null>(null);

  const persist = (u: StudySet[]) => { setSets(u); localStorage.setItem("langnotes_v2", JSON.stringify(u)); };
  const openNew = (type: SetType) => {
    const s: StudySet = {
      id: uid(), name: type === "flashcard" ? "Flashcard Set" : type === "grid" ? "Grid Set" : "Conversation Flow",
      type, nativeLang, targetLang, createdAt: new Date().toISOString(),
      cards: type === "flashcard" ? [{ id: uid(), native: "", target: "" }] : undefined,
      rows:  type === "grid"      ? [{ id: uid(), native: "", target: "" }] : undefined,
      nodes: type === "flowchart" ? [{ id: uid(), x: 120, y: 100, w: 240, h: 160, native: "", target: "", splitDir: "horizontal", shape: "rect" }] : undefined,
      edges: type === "flowchart" ? [] : undefined,
    };
    setEditingSet(s); setView(type);
  };
  const openExisting = (s: StudySet) => { setEditingSet(s); setView(s.type); };
  const saveSet = (s: StudySet) => { persist(sets.some(x => x.id === s.id) ? sets.map(x => x.id === s.id ? s : x) : [...sets, s]); setView("dashboard"); setEditingSet(null); };
  const deleteSet = (id: string) => persist(sets.filter(s => s.id !== id));
  const back = () => { setView("dashboard"); setEditingSet(null); };
  const nLO = LANGUAGES.find(l => l.code === nativeLang)!;
  const tLO = LANGUAGES.find(l => l.code === targetLang)!;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <Navbar view={view} nativeLang={nativeLang} setNativeLang={setNativeLang} targetLang={targetLang} setTargetLang={setTargetLang}
        onNav={v => { if (v === "dashboard" || v === "games" || v === "translate") { setView(v as ViewType); setEditingSet(null); } else openNew(v as SetType); }} />
      <main className="flex-1 overflow-hidden">
        {view === "dashboard" && <Dashboard sets={sets} onOpen={openExisting} onDelete={deleteSet} onNew={openNew} />}
        {view === "flashcard" && editingSet && <FlashcardEditor set={editingSet} onSave={saveSet} onBack={back} nLO={nLO} tLO={tLO} />}
        {view === "grid"      && editingSet && <GridEditor      set={editingSet} onSave={saveSet} onBack={back} nLO={nLO} tLO={tLO} />}
        {view === "flowchart" && editingSet && <FlowchartEditor set={editingSet} onSave={saveSet} onBack={back} nLO={nLO} tLO={tLO} />}
        {view === "games"     && <GamesView sets={sets} />}
        {view === "translate" && <TranslateView />}
      </main>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Navbar({ view, nativeLang, setNativeLang, targetLang, setTargetLang, onNav }: {
  view: ViewType; nativeLang: string; setNativeLang: (v: string) => void;
  targetLang: string; setTargetLang: (v: string) => void; onNav: (v: string) => void;
}) {
  return (
    <nav className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-5 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm tracking-tight">LangNotes</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground leading-none">10 Languages!</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 bg-muted p-1 rounded-xl">
          <NTab active={view === "dashboard"} onClick={() => onNav("dashboard")} icon={<BookOpen className="w-3.5 h-3.5" />} label="Dashboard" />
          <NTab active={view === "flashcard"} onClick={() => onNav("flashcard")} icon={<CreditCard className="w-3.5 h-3.5" />} label="Flashcards" />
          <NTab active={view === "grid"}      onClick={() => onNav("grid")}      icon={<LayoutGrid className="w-3.5 h-3.5" />}  label="Grid" />
          <NTab active={view === "flowchart"} onClick={() => onNav("flowchart")} icon={<GitBranch className="w-3.5 h-3.5" />}  label="Flowchart" />
          <div className="w-px h-4 bg-border mx-0.5" />
          <NTab active={view === "games"}     onClick={() => onNav("games")}     icon={<Trophy className="w-3.5 h-3.5" />}      label="Games" />
          <NTab active={view === "translate"} onClick={() => onNav("translate")} icon={<Languages className="w-3.5 h-3.5" />}   label="Translate" />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <LangSel value={nativeLang} onChange={setNativeLang} />
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <LangSel value={targetLang} onChange={setTargetLang} />
        </div>
      </div>
    </nav>
  );
}

function NTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
      {icon}{label}
    </button>
  );
}
function LangSel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="bg-muted border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer">
      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
    </select>
  );
}
function TypeBadge({ type }: { type: SetType }) {
  const m = {
    flashcard: { label: "Flashcards", cls: "bg-blue-50 text-blue-700 border-blue-200",    icon: <CreditCard className="w-3 h-3" /> },
    grid:      { label: "Grid",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <LayoutGrid className="w-3 h-3" /> },
    flowchart: { label: "Flowchart",  cls: "bg-violet-50 text-violet-700 border-violet-200",   icon: <GitBranch className="w-3 h-3" /> },
  }[type];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${m.cls}`}>{m.icon}{m.label}</span>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ sets, onOpen, onDelete, onNew }: { sets: StudySet[]; onOpen: (s: StudySet) => void; onDelete: (id: string) => void; onNew: (t: SetType) => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | SetType>("all");
  const visible = sets.filter(s => (filter === "all" || s.type === filter) && (!search || s.name.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="max-w-screen-xl mx-auto px-5 py-8">
      <div className="flex items-end gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Sets</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{sets.length} saved {sets.length === 1 ? "set" : "sets"}</p>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sets…" className="pl-8 pr-3 py-1.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 w-44" />
        </div>
        {(["flashcard", "grid", "flowchart"] as SetType[]).map(t => (
          <button key={t} onClick={() => onNew(t)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-card border border-border rounded-lg hover:bg-muted transition-colors">
            <Plus className="w-3.5 h-3.5" />{t === "flashcard" ? "Flashcards" : t === "grid" ? "Grid" : "Flowchart"}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "flashcard", "grid", "flowchart"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
            {f === "all" ? "All" : f === "flashcard" ? "Flashcards" : f === "grid" ? "Grid" : "Flowchart"}
          </button>
        ))}
        {search && <button onClick={() => setSearch("")} className="px-3 py-1 rounded-full text-xs border border-border text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" />Clear</button>}
      </div>

      {sets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-muted-foreground">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4"><BookOpen className="w-8 h-8 opacity-30" /></div>
          <p className="font-semibold text-foreground">No study sets yet</p>
          <p className="text-sm mt-1">Create one using the buttons above</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No sets match your search.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map(s => {
            const nL = LANGUAGES.find(l => l.code === s.nativeLang);
            const tL = LANGUAGES.find(l => l.code === s.targetLang);
            const count = s.cards?.length ?? s.rows?.length ?? s.nodes?.length ?? 0;
            return (
              <div key={s.id} onClick={() => onOpen(s)} className="group relative bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all">
                <button onClick={e => { e.stopPropagation(); onDelete(s.id); }} className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-white text-muted-foreground transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                <TypeBadge type={s.type} />
                <h3 className="font-semibold text-sm mt-3 mb-1 pr-7 leading-snug">{s.name}</h3>
                <p className="text-xs text-muted-foreground">{nL?.flag} {nL?.name} → {tL?.flag} {tL?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{count} {count === 1 ? "item" : "items"} · {new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Flashcard Editor ─────────────────────────────────────────────────────────
function FlashcardEditor({ set, onSave, onBack, nLO, tLO }: { set: StudySet; onSave: (s: StudySet) => void; onBack: () => void; nLO: LangOption; tLO: LangOption }) {
  const [name, setName]     = useState(set.name);
  const [cards, setCards]   = useState<FlashCard[]>(set.cards ?? []);
  const [idx, setIdx]       = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null);
  const [learnMode, setLearnMode] = useState(false);

  const update = (id: string, f: "native" | "target", v: string) => setCards(prev => prev.map(c => c.id === id ? { ...c, [f]: v } : c));
  const addCard = () => { const c = { id: uid(), native: "", target: "" }; setCards(p => [...p, c]); setIdx(cards.length); setFlipped(false); };
  const removeCard = (id: string) => { const next = cards.filter(c => c.id !== id); setCards(next); setIdx(i => Math.min(i, next.length - 1)); setFlipped(false); };
  const doTranslate = async (card: FlashCard) => {
    if (!card.native) return;
    setTranslating(card.id);
    const t = await autoTranslate(card.native, nLO.code, tLO.code);
    if (t) update(card.id, "target", t);
    setTranslating(null);
  };
  const current = cards[idx];

  return (
    <>
      {learnMode && <LearnMode cards={cards} nLO={nLO} tLO={tLO} onClose={() => setLearnMode(false)} />}
      <div className="max-w-screen-xl mx-auto px-5 py-6">
        <div className="flex items-center gap-3 mb-7">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <input value={name} onChange={e => setName(e.target.value)} className="text-xl font-bold bg-transparent border-b-2 border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 transition-colors" />
          <div className="flex-1" />
          <button onClick={() => setLearnMode(true)} disabled={cards.filter(c => c.native).length === 0} className="flex items-center gap-2 px-4 py-2 border border-border bg-card rounded-xl text-sm font-semibold hover:bg-muted disabled:opacity-40 transition-all">
            <Maximize2 className="w-4 h-4" /> Learn
          </button>
          <button onClick={() => onSave({ ...set, name, nativeLang: nLO.code, targetLang: tLO.code, cards })} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <Save className="w-4 h-4" /> Save Set
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div className="flex flex-col items-center gap-5">
            {current ? (
              <>
                <div style={{ perspective: "1200px", width: "100%", maxWidth: 448, height: 224 }} className="cursor-pointer" onClick={() => setFlipped(f => !f)}>
                  <div className="relative w-full h-full transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0)" }}>
                    <div className="absolute inset-0 bg-card border-2 border-border rounded-3xl flex flex-col items-center justify-center p-8 gap-2" style={{ backfaceVisibility: "hidden" }}>
                      <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase">{nLO.flag} {nLO.name}</span>
                      <p className="text-2xl font-bold text-center">{current.native || <span className="text-muted-foreground font-normal italic text-base">No text yet</span>}</p>
                      <span className="text-xs text-muted-foreground mt-1">tap to flip</span>
                    </div>
                    <div className="absolute inset-0 bg-primary text-primary-foreground rounded-3xl flex flex-col items-center justify-center p-8 gap-2" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                      <span className="text-xs font-mono opacity-60 tracking-widest uppercase">{tLO.flag} {tLO.name}</span>
                      <p className="text-2xl font-bold text-center">{current.target || <span className="opacity-50 font-normal italic text-base">No translation</span>}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={idx === 0} className="p-2 rounded-full border border-border hover:bg-muted disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm font-mono text-muted-foreground tabular-nums">{idx + 1} / {cards.length}</span>
                  <button onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }} disabled={idx === cards.length - 1} className="p-2 rounded-full border border-border hover:bg-muted disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="w-full max-w-md bg-card border border-border rounded-2xl p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-muted-foreground tracking-widest uppercase mb-1.5">{nLO.flag} {nLO.name}</label>
                    <input value={current.native} onChange={e => update(current.id, "native", e.target.value)} className="w-full bg-muted rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={`Type in ${nLO.name}…`} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">{tLO.flag} {tLO.name}</label>
                      <button onClick={() => doTranslate(current)} disabled={!current.native || translating === current.id} className="text-[11px] px-2 py-0.5 bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-40 hover:opacity-85">
                        {translating === current.id ? "Translating…" : "Auto-translate →"}
                      </button>
                    </div>
                    <input value={current.target} onChange={e => update(current.id, "target", e.target.value)} className="w-full bg-muted rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={`Type in ${tLO.name}…`} />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                <CreditCard className="w-10 h-10 opacity-25" /><p className="text-sm">No cards yet — add one!</p>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">All Cards</h3>
              <button onClick={addCard} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-muted border border-border rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /> Add</button>
            </div>
            <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
              {cards.map((card, i) => (
                <div key={card.id} onClick={() => { setIdx(i); setFlipped(false); }} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer group transition-all ${i === idx ? "bg-primary/8 border border-primary/25" : "hover:bg-muted border border-transparent"}`}>
                  <span className="text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{card.native || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{card.target || "—"}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeCard(card.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive text-muted-foreground transition-all"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Learn Mode ───────────────────────────────────────────────────────────────
function LearnMode({ cards, nLO, tLO, onClose }: { cards: FlashCard[]; nLO: LangOption; tLO: LangOption; onClose: () => void }) {
  const [idx, setIdx]       = useState(0);
  const [flipped, setFlipped] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown")  { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }
      else if (e.key === " ") { e.preventDefault(); setFlipped(f => !f); }
      else if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cards.length]);

  const card = cards[idx];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border flex-shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        <span className="text-sm font-medium">{nLO.flag} {nLO.name} → {tLO.flag} {tLO.name}</span>
        <div className="flex-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((idx + 1) / cards.length) * 100}%` }} />
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">{idx + 1} / {cards.length}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-8">
        <div style={{ perspective: "1200px", width: "100%", maxWidth: 600, height: 340 }} className="cursor-pointer" onClick={() => setFlipped(f => !f)}>
          <div className="relative w-full h-full transition-transform duration-500" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0)" }}>
            <div className="absolute inset-0 bg-card border-2 border-border rounded-3xl flex flex-col items-center justify-center p-10 gap-3 shadow-lg" style={{ backfaceVisibility: "hidden" }}>
              <span className="text-sm font-mono text-muted-foreground tracking-widest uppercase">{nLO.flag} {nLO.name}</span>
              <p className="text-4xl font-bold text-center leading-tight">{card.native}</p>
              <span className="text-xs text-muted-foreground mt-2">Space or tap to flip</span>
            </div>
            <div className="absolute inset-0 bg-primary text-primary-foreground rounded-3xl flex flex-col items-center justify-center p-10 gap-3 shadow-lg" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <span className="text-sm font-mono opacity-60 tracking-widest uppercase">{tLO.flag} {tLO.name}</span>
              <p className="text-4xl font-bold text-center leading-tight">{card.target || "—"}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={idx === 0} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-muted disabled:opacity-30 text-sm font-medium"><ChevronLeft className="w-4 h-4" /> Prev</button>
          <button onClick={() => setFlipped(f => !f)} className="px-6 py-2.5 rounded-xl bg-muted hover:bg-secondary text-sm font-medium border border-border">Flip</button>
          <button onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }} disabled={idx === cards.length - 1} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-muted disabled:opacity-30 text-sm font-medium">Next <ChevronRight className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground">← → to navigate · Space to flip · Esc to exit</p>
      </div>
    </div>
  );
}

// ─── Grid Editor ──────────────────────────────────────────────────────────────
function GridEditor({ set, onSave, onBack, nLO, tLO }: { set: StudySet; onSave: (s: StudySet) => void; onBack: () => void; nLO: LangOption; tLO: LangOption }) {
  const [name, setName]   = useState(set.name);
  const [rows, setRows]   = useState<GridRow[]>(set.rows ?? []);
  const [translating, setTranslating] = useState<string | null>(null);
  const [fullscreen, setFullscreen]   = useState(false);

  const update = (id: string, f: "native" | "target", v: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, [f]: v } : r));
  const doTranslate = async (row: GridRow) => {
    if (!row.native) return;
    setTranslating(row.id);
    const t = await autoTranslate(row.native, nLO.code, tLO.code);
    if (t) update(row.id, "target", t);
    setTranslating(null);
  };
  const translateAll = async () => {
    for (const row of rows) {
      if (row.native && !row.target) {
        setTranslating(row.id);
        const t = await autoTranslate(row.native, nLO.code, tLO.code);
        if (t) setRows(prev => prev.map(r => r.id === row.id ? { ...r, target: t } : r));
        setTranslating(null);
      }
    }
  };

  return (
    <>
      {fullscreen && <GridFullscreen rows={rows} nLO={nLO} tLO={tLO} onClose={() => setFullscreen(false)} />}
      <div className="max-w-screen-xl mx-auto px-5 py-6">
        <div className="flex items-center gap-3 mb-7">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><ChevronLeft className="w-5 h-5" /></button>
          <input value={name} onChange={e => setName(e.target.value)} className="text-xl font-bold bg-transparent border-b-2 border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 transition-colors" />
          <div className="flex-1" />
          <button onClick={() => setFullscreen(true)} disabled={rows.filter(r => r.native).length === 0} className="flex items-center gap-2 px-4 py-2 border border-border bg-card rounded-xl text-sm font-semibold hover:bg-muted disabled:opacity-40 transition-all">
            <Maximize2 className="w-4 h-4" /> Full View
          </button>
          <button onClick={translateAll} disabled={!!translating} className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted disabled:opacity-50">
            <RotateCcw className={`w-3.5 h-3.5 ${translating ? "animate-spin" : ""}`} /> Translate all
          </button>
          <button onClick={() => onSave({ ...set, name, nativeLang: nLO.code, targetLang: tLO.code, rows })} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90">
            <Save className="w-4 h-4" /> Save Set
          </button>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex border-b-2 border-border bg-muted/40">
            <div className="w-10 flex-shrink-0 flex items-center justify-center border-r border-border/40"><span className="text-xs font-mono text-muted-foreground">#</span></div>
            <div className="flex-1 px-4 py-3 flex items-center gap-2"><span className="text-base">{nLO.flag}</span><span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{nLO.name}</span></div>
            <div className="w-12 flex-shrink-0 flex items-center justify-center border-l-4 border-r-4 border-primary/30 bg-primary/5"><span className="text-primary/40 text-lg leading-none">⇄</span></div>
            <div className="flex-1 px-4 py-3 flex items-center gap-2"><span className="text-base">{tLO.flag}</span><span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{tLO.name}</span></div>
            <div className="w-10 flex-shrink-0" />
          </div>
          {rows.length === 0 && <div className="py-12 text-center text-muted-foreground text-sm">No rows yet.</div>}
          {rows.map((row, i) => (
            <div key={row.id} className={`flex items-stretch group hover:bg-muted/20 transition-colors ${i < rows.length - 1 ? "border-b border-border/50" : ""}`}>
              <div className="w-10 flex-shrink-0 flex items-center justify-center border-r border-border/40"><span className="text-xs font-mono text-muted-foreground/50">{i + 1}</span></div>
              <div className="flex-1 px-4 py-2.5"><input value={row.native} onChange={e => update(row.id, "native", e.target.value)} className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40" placeholder={`${nLO.name}…`} /></div>
              <div className="w-12 flex-shrink-0 flex items-center justify-center border-l-4 border-r-4 border-primary/30 bg-primary/5">
                <button onClick={() => doTranslate(row)} disabled={!row.native || !!translating} className="p-1 rounded-md hover:bg-primary hover:text-primary-foreground disabled:opacity-30 text-primary/60 transition-all">
                  {translating === row.id ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex-1 px-4 py-2.5"><input value={row.target} onChange={e => update(row.id, "target", e.target.value)} className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40" placeholder={`${tLO.name}…`} /></div>
              <div className="w-10 flex-shrink-0 flex items-center justify-center">
                <button onClick={() => setRows(prev => prev.filter(r => r.id !== row.id))} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:text-destructive text-muted-foreground transition-all"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          <div className="px-4 py-3 border-t border-border">
            <button onClick={() => setRows(prev => [...prev, { id: uid(), native: "", target: "" }])} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><Plus className="w-4 h-4" /> Add row</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Grid Fullscreen ──────────────────────────────────────────────────────────
function GridFullscreen({ rows, nLO, tLO, onClose }: { rows: GridRow[]; nLO: LangOption; tLO: LangOption; onClose: () => void }) {
  const [hideTarget, setHideTarget] = useState(false);
  const [revealed, setRevealed]     = useState<Set<string>>(new Set());
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border flex-shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        <span className="text-sm font-semibold">{nLO.flag} {nLO.name} → {tLO.flag} {tLO.name}</span>
        <span className="text-xs text-muted-foreground">{rows.length} rows</span>
        <div className="flex-1" />
        <button onClick={() => { setHideTarget(h => !h); setRevealed(new Set()); }} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
          {hideTarget ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {hideTarget ? `Show ${tLO.name}` : `Hide ${tLO.name}`}
        </button>
      </div>
      <div className="flex-1 overflow-auto py-6 px-6">
        <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex border-b-2 border-border bg-muted/50">
            <div className="w-12 flex items-center justify-center py-3 border-r border-border/40"><span className="text-xs font-mono text-muted-foreground">#</span></div>
            <div className="flex-1 px-5 py-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">{nLO.flag} {nLO.name}</div>
            <div className="w-px bg-border" />
            <div className="flex-1 px-5 py-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">{tLO.flag} {tLO.name}</div>
          </div>
          {rows.map((row, i) => (
            <div key={row.id} className={`flex items-center ${i < rows.length - 1 ? "border-b border-border/50" : ""} hover:bg-muted/20`}>
              <div className="w-12 flex items-center justify-center py-3.5 border-r border-border/40"><span className="text-xs font-mono text-muted-foreground/50">{i + 1}</span></div>
              <div className="flex-1 px-5 py-3.5 text-sm font-medium">{row.native || "—"}</div>
              <div className="w-px self-stretch bg-border/60" />
              <div className="flex-1 px-5 py-3.5 text-sm">
                {hideTarget && !revealed.has(row.id)
                  ? <button onClick={() => setRevealed(r => new Set([...r, row.id]))} className="text-xs px-3 py-1 rounded-lg bg-muted border border-border text-muted-foreground hover:bg-secondary transition-colors">Reveal</button>
                  : (row.target || "—")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Flowchart Editor ─────────────────────────────────────────────────────────
type MoveDrag   = { kind: "move";   nodeId: string; sX: number; sY: number; nX: number; nY: number };
type ResizeDrag = { kind: "resize"; nodeId: string; sX: number; sY: number; nW: number; nH: number };

function FlowchartEditor({ set, onSave, onBack, nLO, tLO }: { set: StudySet; onSave: (s: StudySet) => void; onBack: () => void; nLO: LangOption; tLO: LangOption }) {
  const [name, setName]     = useState(set.name);
  const [nodes, setNodes]   = useState<FlowNode[]>(set.nodes ?? []);
  const [edges, setEdges]   = useState<FlowEdge[]>(set.edges ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSrc, setConnectSrc]   = useState<string | null>(null);
  const [edgeStyle, setEdgeStyle]     = useState<EdgeStyle>("solid");
  const [translating, setTranslating] = useState<string | null>(null);
  const dragRef = useRef<MoveDrag | ResizeDrag | null>(null);

  const createNode = (x: number, y: number, shape: NodeShape = "rect") => {
    const n: FlowNode = { id: uid(), x, y, w: 240, h: 160, native: "", target: "", splitDir: "horizontal", shape };
    setNodes(p => [...p, n]); setSelectedId(n.id);
  };
  const addNode = () => createNode(120 + Math.random() * 200, 80 + Math.random() * 120, "rect");
  const addNodeAt = (x: number, y: number, shape: NodeShape) => createNode(Math.max(0, x), Math.max(0, y), shape);
  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes(p => p.filter(n => n.id !== selectedId));
    setEdges(p => p.filter(e => e.from !== selectedId && e.to !== selectedId));
    setSelectedId(null);
  };
  const startMove = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    const n = nodes.find(x => x.id === nodeId)!;
    dragRef.current = { kind: "move", nodeId, sX: e.clientX, sY: e.clientY, nX: n.x, nY: n.y };
    setSelectedId(nodeId);
  };
  const startResize = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault(); e.stopPropagation();
    const n = nodes.find(x => x.id === nodeId)!;
    dragRef.current = { kind: "resize", nodeId, sX: e.clientX, sY: e.clientY, nW: n.w, nH: n.h };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current; if (!d) return;
    if (d.kind === "move") setNodes(p => p.map(n => n.id === d.nodeId ? { ...n, x: Math.max(0, d.nX + e.clientX - d.sX), y: Math.max(0, d.nY + e.clientY - d.sY) } : n));
    else setNodes(p => p.map(n => n.id === d.nodeId ? { ...n, w: Math.max(180, d.nW + e.clientX - d.sX), h: Math.max(110, d.nH + e.clientY - d.sY) } : n));
  };
  const onMouseUp = () => { dragRef.current = null; };
  const onTextChange = (id: string, f: "native" | "target", v: string) => setNodes(p => p.map(n => n.id === id ? { ...n, [f]: v } : n));
  const onToggleSplit = (id: string) => setNodes(p => p.map(n => n.id === id ? { ...n, splitDir: n.splitDir === "horizontal" ? "vertical" : "horizontal" } : n));
  const onSetShape = (id: string, shape: NodeShape) => setNodes(p => p.map(n => n.id === id ? { ...n, shape } : n));
  const onNodeClick = (nodeId: string) => {
    setSelectedEdgeId(null);
    if (!connectMode) { setSelectedId(nodeId); return; }
    if (!connectSrc) { setConnectSrc(nodeId); return; }
    if (connectSrc === nodeId) { setConnectSrc(null); return; }
    if (!edges.some(e => e.from === connectSrc && e.to === nodeId))
      setEdges(p => [...p, { id: uid(), from: connectSrc, to: nodeId, style: edgeStyle }]);
    setConnectSrc(null);
  };
  const deleteEdge = (id: string) => setEdges(p => p.filter(e => e.id !== id));
  const cycleEdge  = (id: string) => {
    const c: EdgeStyle[] = ["solid", "dotted", "dashed"];
    setEdges(p => p.map(e => e.id === id ? { ...e, style: c[(c.indexOf(e.style) + 1) % 3] } : e));
  };
  const doTranslate = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId); if (!node?.native) return;
    setTranslating(nodeId);
    const t = await autoTranslate(node.native, nLO.code, tLO.code);
    if (t) setNodes(p => p.map(n => n.id === nodeId ? { ...n, target: t } : n));
    setTranslating(null);
  };
  const botMid = (n: FlowNode) => ({ x: n.x + n.w / 2, y: n.y + n.h });
  const topMid = (n: FlowNode) => ({ x: n.x + n.w / 2, y: n.y });

  const ESTYLES = [{ v: "solid" as EdgeStyle, lbl: "──" }, { v: "dotted" as EdgeStyle, lbl: "···" }, { v: "dashed" as EdgeStyle, lbl: "╌╌" }];

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-card flex-shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><ChevronLeft className="w-5 h-5" /></button>
        <input value={name} onChange={e => setName(e.target.value)} className="text-base font-bold bg-transparent border-b-2 border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5 transition-colors" />
        <div className="flex-1" />
        {selectedId && !connectMode && (
          <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
        )}
        <button onClick={() => onSave({ ...set, name, nativeLang: nLO.code, targetLang: tLO.code, nodes, edges })} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90"><Save className="w-3.5 h-3.5" /> Save</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative overflow-auto" style={{ background: "var(--background)", backgroundImage: "radial-gradient(circle, rgba(26,86,219,0.15) 1px, transparent 1px)", backgroundSize: "28px 28px", cursor: connectMode ? "crosshair" : "default" }}
          onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onClick={() => { if (!connectMode) setSelectedId(null); setSelectedEdgeId(null); }}
          onDragOver={e => e.preventDefault()} onDrop={e => {
            e.preventDefault();
            const shape = e.dataTransfer.getData("text/plain") as NodeShape;
            if (!shape) return;
            const bounds = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            addNodeAt(e.clientX - bounds.left, e.clientY - bounds.top, shape);
          }}>

          <svg className="absolute inset-0" style={{ width: "100%", height: "100%", minWidth: 1400, minHeight: 900, pointerEvents: "none" }}>
          <defs>
            <marker id="arr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="var(--primary)" fillOpacity="0.7" />
            </marker>
          </defs>
          {edges.map(edge => {
            const fn = nodes.find(n => n.id === edge.from);
            const tn = nodes.find(n => n.id === edge.to);
            if (!fn || !tn) return null;
            const f = botMid(fn); const t = topMid(tn);
            const cy = f.y + (t.y - f.y) * 0.6;
            const mX = (f.x + t.x) / 2; const mY = (f.y + t.y) / 2;
            const dash = edge.style === "solid" ? undefined : edge.style === "dotted" ? "4 5" : "12 6";
            const selected = edge.id === selectedEdgeId;
            return (
              <g key={edge.id} style={{ pointerEvents: "all" }}>
                <path d={`M ${f.x} ${f.y} C ${f.x} ${cy}, ${t.x} ${cy}, ${t.x} ${t.y}`} fill="none" stroke="transparent" strokeWidth="20" style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); setSelectedEdgeId(edge.id); cycleEdge(edge.id); }} />
                <path d={`M ${f.x} ${f.y} C ${f.x} ${cy}, ${t.x} ${cy}, ${t.x} ${t.y}`} fill="none" stroke={selected ? "var(--accent)" : "var(--primary)"} strokeWidth={selected ? 3.5 : 2.5} strokeOpacity={selected ? 0.95 : 0.65} strokeDasharray={dash} markerEnd="url(#arr)" style={{ pointerEvents: "none" }} />
                <circle cx={mX} cy={mY} r={9} fill="white" stroke="var(--destructive)" strokeWidth="1.5" style={{ cursor: "pointer" }} onClick={e => { e.stopPropagation(); setSelectedEdgeId(edge.id); deleteEdge(edge.id); }} />
                <text x={mX} y={mY + 4.5} textAnchor="middle" fontSize="13" fill="var(--destructive)" fontWeight="800" style={{ pointerEvents: "none", userSelect: "none" }}>×</text>
              </g>
            );
          })}
        </svg>

        <div style={{ position: "relative", minWidth: 1400, minHeight: 900 }}>
          {nodes.map(node => (
            <NodeCard key={node.id} node={node} isSelected={selectedId === node.id} onMoveStart={startMove} onResizeStart={startResize}
              onTextChange={onTextChange} onToggleSplit={onToggleSplit}
              nLO={nLO} tLO={tLO} translating={translating} onTranslate={doTranslate}
              connectMode={connectMode} isConnectSrc={connectSrc === node.id} onNodeClick={onNodeClick} />
          ))}
        </div>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <GitBranch className="w-14 h-14 mx-auto mb-3 opacity-15" />
              <p className="text-sm font-semibold">Build a conversation flow</p>
              <p className="text-xs mt-1 opacity-50">Add nodes → connect → save</p>
            </div>
          </div>
        )}
        {connectMode && <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-4 py-1.5 rounded-full font-medium shadow pointer-events-none">{connectSrc ? "Click target node · same node to cancel" : "Click source node to start arrow"}</div>}
        {!connectMode && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground px-3 py-1 bg-card/80 rounded-full border border-border pointer-events-none">Drag to move · ↘ corner to resize · click line to cycle style · × to remove</div>}
      </div>
      <aside className="w-96 border-l border-border bg-card/90 overflow-y-auto">
        <div className="sticky top-0 z-20 bg-card/95 border-b border-border px-4 py-4">
          <h2 className="text-sm font-semibold">Flow Inspector</h2>
          <p className="text-xs text-muted-foreground mt-1">Select nodes or arrows from here.</p>
        </div>
        <div className="px-4 py-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Node palette</p>
              <span className="text-xs text-muted-foreground">Drag to add</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["rect", "ellipse", "diamond"] as NodeShape[]).map(shape => (
                <button key={shape}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("text/plain", shape)}
                  onClick={() => addNodeAt(120 + Math.random() * 200, 80 + Math.random() * 120, shape)}
                  className="rounded-3xl border border-border bg-card px-3 py-3 text-center text-xs font-medium transition hover:border-primary/50 hover:bg-primary/5">
                  <div className="text-base mb-1">{shape === "rect" ? "□" : shape === "ellipse" ? "○" : "◇"}</div>
                  <div className="text-[11px] text-muted-foreground">{shape}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Arrow palette</p>
              <span className="text-xs text-muted-foreground">Pick style</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ESTYLES.map(style => (
                <button key={style.v} onClick={() => { setConnectMode(true); setConnectSrc(null); setEdgeStyle(style.v); }} className={`rounded-3xl border border-border bg-card px-3 py-3 text-center text-xs font-medium transition ${edgeStyle === style.v ? "border-primary bg-primary/10" : "hover:border-primary/50 hover:bg-primary/5"}`}>
                  <div className="text-base mb-1">{style.lbl}</div>
                  <div className="text-[11px] text-muted-foreground">Make {style.v}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Arrows</p>
              <span className="text-xs text-muted-foreground">{edges.length}</span>
            </div>
            <div className="space-y-2">
              {edges.map(edge => {
                const from = nodes.find(n => n.id === edge.from);
                const to = nodes.find(n => n.id === edge.to);
                return (
                  <button key={edge.id} onClick={() => { setSelectedEdgeId(edge.id); setSelectedId(null); setConnectMode(false); }} className={`w-full text-left rounded-2xl border px-3 py-3 transition-all ${selectedEdgeId === edge.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{from?.native || "source"} → {to?.native || "target"}</span>
                      <span className="text-xs text-muted-foreground uppercase">{edge.style}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">Click to select, then delete or edit.</p>
                  </button>
                );
              })}
            </div>
          </div>
          {(selectedId || selectedEdgeId) && (
            <div className="rounded-3xl border border-border bg-muted/50 p-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Inspector</p>
                {selectedId && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold">Selected node</div>
                    <div className="grid gap-2 text-xs text-muted-foreground">
                      <div>ID: {selectedId}</div>
                      <div>Shape: {nodes.find(n => n.id === selectedId)?.shape}</div>
                      <div>Layout: {nodes.find(n => n.id === selectedId)?.splitDir}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {(["rect", "ellipse", "diamond"] as NodeShape[]).map(shape => (
                        <button key={shape} onClick={() => onSetShape(selectedId, shape)}
                          className={`rounded-2xl border px-3 py-2 text-left transition ${nodes.find(n => n.id === selectedId)?.shape === shape ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                          <div className="font-semibold">{shape}</div>
                          <div className="text-muted-foreground">Swap shape</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedEdgeId && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold">Selected arrow</div>
                    <div className="grid gap-2 text-xs text-muted-foreground">
                      <div>ID: {selectedEdgeId}</div>
                      <div>Style: {edges.find(e => e.id === selectedEdgeId)?.style}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {ESTYLES.map(style => (
                        <button key={style.v} onClick={() => setEdges(p => p.map(e => e.id === selectedEdgeId ? { ...e, style: style.v } : e))}
                          className={`rounded-2xl border px-3 py-2 text-left transition ${edges.find(e => e.id === selectedEdgeId)?.style === style.v ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}>
                          <div className="font-semibold">{style.lbl}</div>
                          <div className="text-muted-foreground">Swap style</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  </div>
    );
}

// ─── Node Card ────────────────────────────────────────────────────────────────
function NodeCard({ node, isSelected, onMoveStart, onResizeStart, onTextChange, onToggleSplit, nLO, tLO, translating, onTranslate, connectMode, isConnectSrc, onNodeClick }: {
  node: FlowNode; isSelected: boolean;
  onMoveStart: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string) => void;
  onTextChange: (id: string, f: "native" | "target", v: string) => void;
  onToggleSplit: (id: string) => void;
  nLO: LangOption; tLO: LangOption; translating: string | null;
  onTranslate: (id: string) => void;
  connectMode: boolean; isConnectSrc: boolean; onNodeClick: (id: string) => void;
}) {
  const sp = (e: React.MouseEvent) => e.stopPropagation();
  const onMD = (e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "TEXTAREA" || tag === "INPUT" || tag === "BUTTON") return;
    onMoveStart(e, node.id);
  };

  const bColor = isConnectSrc ? "var(--accent)" : isSelected ? "var(--primary)" : "var(--border)";
  const bWidth = isSelected || isConnectSrc ? "2.5px" : "2px";
  const ring   = isSelected ? "0 0 0 3px rgba(26,86,219,0.15)" : isConnectSrc ? "0 0 0 3px rgba(234,108,0,0.2)" : "none";
  const shadow = `${ring}, 0 2px 8px rgba(0,0,0,0.06)`;

  const LLabel = ({ lang, short }: { lang: LangOption; short?: boolean }) => (
    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1 flex-shrink-0 select-none">{lang.flag}{!short && ` ${lang.name}`}</p>
  );

  const TrBtn = ({ small }: { small?: boolean }) => (
    <button onClick={e => { sp(e); onTranslate(node.id); }} disabled={!node.native || translating === node.id}
      className={`absolute bottom-1 right-1 bg-primary text-primary-foreground rounded font-medium disabled:opacity-30 hover:opacity-80 transition-opacity ${small ? "text-[8px] px-1 py-0.5" : "text-[9px] px-1.5 py-0.5"}`}>
      {translating === node.id ? "…" : node.splitDir === "horizontal" ? "↓" : "→"}
    </button>
  );

  const ShapeControls = ({ style }: { style?: React.CSSProperties }) => (
    <div style={style} className="flex items-center gap-1 px-2 py-0.5 bg-card/95 rounded-full border border-border shadow-sm" onClick={sp}>
      <button onClick={() => onToggleSplit(node.id)} className="text-[9px] px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
        {node.splitDir === "horizontal" ? "→ Side" : "↕ Stack"}
      </button>
    </div>
  );

  const ResizeHandle = () => (
    <div style={{ position: "absolute", right: 0, bottom: 0, width: 18, height: 18, cursor: "se-resize", zIndex: 10 }}
      onMouseDown={e => { sp(e); onResizeStart(e, node.id); }} onClick={sp}
      className="flex items-end justify-end pr-1 pb-1">
      <svg width="9" height="9" viewBox="0 0 9 9" className="opacity-25 pointer-events-none">
        <line x1="2" y1="9" x2="9" y2="2" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="5" y1="9" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    </div>
  );

  const base = { position: "absolute" as const, left: node.x, top: node.y, width: node.w, height: node.h };
  const clickProps = { onClick: (e: React.MouseEvent) => { sp(e); onNodeClick(node.id); }, onMouseDown: onMD };

  // ── RECT ──
  if (node.shape === "rect") {
    return (
      <div style={{ ...base, border: `${bWidth} solid ${bColor}`, boxShadow: shadow, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", cursor: connectMode ? "pointer" : "move", background: "white", userSelect: "none" }} {...clickProps}>
        {node.splitDir === "horizontal" ? (
          <>
            <div className="flex-1 flex flex-col p-3 border-b-2 border-primary/15 bg-blue-50/30 min-h-0">
              <LLabel lang={nLO} />
              <textarea value={node.native} onChange={e => onTextChange(node.id, "native", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-sm resize-none focus:outline-none leading-snug min-h-0" placeholder={`${nLO.name}…`} />
            </div>
            <div className="flex-1 flex flex-col p-3 bg-orange-50/20 min-h-0 relative">
              <LLabel lang={tLO} />
              <textarea value={node.target} onChange={e => onTextChange(node.id, "target", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-sm resize-none focus:outline-none leading-snug min-h-0" placeholder={`${tLO.name}…`} style={{ paddingBottom: 18 }} />
              <TrBtn />
            </div>
          </>
        ) : (
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col p-3 border-r-2 border-primary/15 bg-blue-50/30 min-h-0">
              <LLabel lang={nLO} short />
              <textarea value={node.native} onChange={e => onTextChange(node.id, "native", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-xs resize-none focus:outline-none leading-snug min-h-0" placeholder={nLO.name} />
            </div>
            <div className="flex-1 flex flex-col p-3 bg-orange-50/20 min-h-0 relative">
              <LLabel lang={tLO} short />
              <textarea value={node.target} onChange={e => onTextChange(node.id, "target", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-xs resize-none focus:outline-none leading-snug min-h-0" placeholder={tLO.name} style={{ paddingBottom: 18 }} />
              <TrBtn small />
            </div>
          </div>
        )}
        {isSelected && !connectMode && (
          <div className="flex items-center px-2 py-1 border-t border-border/40 bg-muted/20 flex-shrink-0" onClick={sp}>
            <ShapeControls />
          </div>
        )}
        <ResizeHandle />
      </div>
    );
  }

  // ── ELLIPSE ──
  if (node.shape === "ellipse") {
    const px = node.w * 0.16; const py = node.h * 0.13;
    return (
      <div style={{ ...base, border: `${bWidth} solid ${bColor}`, boxShadow: shadow, borderRadius: "50%", overflow: "hidden", cursor: connectMode ? "pointer" : "move", background: "white", userSelect: "none" }} {...clickProps}>
        <div style={{ position: "absolute", left: px, right: px, top: py, bottom: py, display: "flex", flexDirection: node.splitDir === "horizontal" ? "column" : "row", overflow: "hidden", gap: 2 }}>
          {node.splitDir === "horizontal" ? (
            <>
              <div className="flex-1 flex flex-col min-h-0 items-center text-center">
                <LLabel lang={nLO} short />
                <textarea value={node.native} onChange={e => onTextChange(node.id, "native", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-xs resize-none focus:outline-none leading-snug min-h-0 text-center" placeholder={nLO.flag} />
              </div>
              <div className="h-px bg-primary/20 flex-shrink-0" />
              <div className="flex-1 flex flex-col min-h-0 items-center text-center relative">
                <LLabel lang={tLO} short />
                <textarea value={node.target} onChange={e => onTextChange(node.id, "target", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-xs resize-none focus:outline-none leading-snug min-h-0 text-center" placeholder={tLO.flag} style={{ paddingBottom: 16 }} />
                <TrBtn small />
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 flex flex-col min-h-0 items-center text-center">
                <LLabel lang={nLO} short />
                <textarea value={node.native} onChange={e => onTextChange(node.id, "native", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-[10px] resize-none focus:outline-none leading-snug min-h-0 text-center" placeholder={nLO.flag} />
              </div>
              <div className="w-px bg-primary/20 flex-shrink-0" />
              <div className="flex-1 flex flex-col min-h-0 items-center text-center relative">
                <LLabel lang={tLO} short />
                <textarea value={node.target} onChange={e => onTextChange(node.id, "target", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-[10px] resize-none focus:outline-none leading-snug min-h-0 text-center" placeholder={tLO.flag} style={{ paddingBottom: 14 }} />
                <TrBtn small />
              </div>
            </>
          )}
        </div>
        {isSelected && !connectMode && (
          <div style={{ position: "absolute", bottom: "7%", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
            <ShapeControls />
          </div>
        )}
        <ResizeHandle />
      </div>
    );
  }

  // ── DIAMOND ──
  const hw = node.w / 2; const hh = node.h / 2; const pad = 2;
  const pts = `${hw},${pad} ${node.w - pad},${hh} ${hw},${node.h - pad} ${pad},${hh}`;
  const safePx = hw * 0.28; const safePy = hh * 0.28;
  return (
    <div style={{ ...base, cursor: connectMode ? "pointer" : "move", userSelect: "none" }} {...clickProps}>
      <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ pointerEvents: "none" }}>
        <polygon points={pts} fill="white" stroke={bColor} strokeWidth={bWidth}
          filter={isSelected || isConnectSrc ? `drop-shadow(0 0 4px ${isConnectSrc ? "rgba(234,108,0,0.4)" : "rgba(26,86,219,0.3)"})` : "drop-shadow(0 2px 4px rgba(0,0,0,0.08))"} />
        {node.splitDir === "horizontal"
          ? <line x1={hw * 0.32} y1={hh} x2={hw * 1.68} y2={hh} stroke="rgba(26,86,219,0.2)" strokeWidth="1.5" />
          : <line x1={hw} y1={hh * 0.32} x2={hw} y2={hh * 1.68} stroke="rgba(26,86,219,0.2)" strokeWidth="1.5" />}
      </svg>

      <div style={{ position: "absolute", left: safePx, right: safePx, top: safePy, bottom: safePy, display: "flex", flexDirection: node.splitDir === "horizontal" ? "column" : "row", overflow: "hidden", gap: 2 }}>
        {node.splitDir === "horizontal" ? (
          <>
            <div className="flex-1 flex flex-col min-h-0 items-center">
              <p className="text-[8px] font-mono text-muted-foreground select-none">{nLO.flag}</p>
              <textarea value={node.native} onChange={e => onTextChange(node.id, "native", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-[11px] resize-none focus:outline-none leading-snug min-h-0 text-center" placeholder="native" />
            </div>
            <div className="flex-1 flex flex-col min-h-0 items-center relative">
              <p className="text-[8px] font-mono text-muted-foreground select-none">{tLO.flag}</p>
              <textarea value={node.target} onChange={e => onTextChange(node.id, "target", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-[11px] resize-none focus:outline-none leading-snug min-h-0 text-center" placeholder="target" style={{ paddingBottom: 16 }} />
              <TrBtn small />
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-h-0 items-center">
              <p className="text-[8px] font-mono text-muted-foreground select-none">{nLO.flag}</p>
              <textarea value={node.native} onChange={e => onTextChange(node.id, "native", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-[10px] resize-none focus:outline-none leading-snug min-h-0 text-center" placeholder="native" />
            </div>
            <div className="flex-1 flex flex-col min-h-0 items-center relative">
              <p className="text-[8px] font-mono text-muted-foreground select-none">{tLO.flag}</p>
              <textarea value={node.target} onChange={e => onTextChange(node.id, "target", e.target.value)} onClick={sp} className="flex-1 w-full bg-transparent text-[10px] resize-none focus:outline-none leading-snug min-h-0 text-center" placeholder="target" style={{ paddingBottom: 14 }} />
              <TrBtn small />
            </div>
          </>
        )}
      </div>

      {isSelected && !connectMode && (
        <div style={{ position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", zIndex: 20 }}>
          <ShapeControls />
        </div>
      )}
      <ResizeHandle />
    </div>
  );
}

// ─── Games ────────────────────────────────────────────────────────────────────
function GamesView({ sets }: { sets: StudySet[] }) {
  const eligible = sets.filter(s => s.type !== "flowchart" && (s.cards?.length ?? s.rows?.length ?? 0) >= 2);
  const [quiz, setQuiz]       = useState<QuizQuestion[]>([]);
  const [qIdx, setQIdx]       = useState(0);
  const [score, setScore]     = useState(0);
  const [chosen, setChosen]   = useState<string | null>(null);
  const [typed, setTyped]     = useState("");
  const [state, setState]     = useState<"select" | "playing" | "done">("select");
  const [activeSet, setActiveSet] = useState<StudySet | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("quiz");

  const startGame = (s: StudySet, mode: GameMode) => {
    const pairs = (s.cards ?? s.rows ?? []).filter(p => p.native && p.target);
    const shuffled = [...pairs].sort(() => Math.random() - 0.5).slice(0, 10);
    const questions: QuizQuestion[] = shuffled.map(pair => {
      if (mode === "type") {
        return { prompt: pair.target, answer: pair.native, choices: [], mode };
      }
      const wrong = pairs.filter(p => p.id !== pair.id).sort(() => Math.random() - 0.5).slice(0, 3).map(p => mode === "quiz" ? p.native : p.target);
      return {
        prompt: mode === "quiz" ? pair.target : pair.native,
        answer: mode === "quiz" ? pair.native : pair.target,
        choices: [...wrong, mode === "quiz" ? pair.native : pair.target].sort(() => Math.random() - 0.5),
        mode,
      };
    });
    setActiveSet(s);
    setQuiz(questions);
    setQIdx(0);
    setScore(0);
    setChosen(null);
    setTyped("");
    setState("playing");
  };

  const handleChoice = (c: string) => {
    if (chosen) return;
    setChosen(c);
    if (c === quiz[qIdx].answer) setScore(s => s + 1);
    setTimeout(() => {
      if (qIdx + 1 >= quiz.length) setState("done"); else { setQIdx(i => i + 1); setChosen(null); setTyped(""); }
    }, 1100);
  };

  const handleTyped = () => {
    if (chosen || !typed.trim()) return;
    setChosen(typed.trim());
    if (typed.trim().toLowerCase() === quiz[qIdx].answer.toLowerCase()) setScore(s => s + 1);
    setTimeout(() => {
      if (qIdx + 1 >= quiz.length) setState("done"); else { setQIdx(i => i + 1); setChosen(null); setTyped(""); }
    }, 1100);
  };

  if (state === "select") return (
    <div className="max-w-screen-lg mx-auto px-5 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Trophy className="w-5 h-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Games</h1><p className="text-muted-foreground text-sm">Choose a mode and test your saved sets.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setGameMode("quiz")} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${gameMode === "quiz" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:border-primary/40"}`}>Translate Quiz</button>
          <button onClick={() => setGameMode("reverse")} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${gameMode === "reverse" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:border-primary/40"}`}>Reverse Quiz</button>
          <button onClick={() => setGameMode("type")} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${gameMode === "type" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:border-primary/40"}`}>Type the Answer</button>
        </div>
      </div>
      {eligible.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground"><p className="font-medium text-foreground">No sets available</p><p className="text-sm mt-1">Create a flashcard or grid set with at least 2 pairs first.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {eligible.map(s => {
            const count = s.cards?.length ?? s.rows?.length ?? 0;
            const nL = LANGUAGES.find(l => l.code === s.nativeLang); const tL = LANGUAGES.find(l => l.code === s.targetLang);
            return (
              <button key={s.id} onClick={() => startGame(s, gameMode)} className="text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group">
                <TypeBadge type={s.type} />
                <h3 className="font-semibold text-sm mt-3 mb-1">{s.name}</h3>
                <p className="text-xs text-muted-foreground">{nL?.flag} {nL?.name} → {tL?.flag} {tL?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{count} pairs · up to 10 questions</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">Play <ArrowRight className="w-3.5 h-3.5" /></div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  if (state === "playing") {
    const q = quiz[qIdx];
    return (
      <div className="max-w-xl mx-auto px-5 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setState("select")} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(qIdx / quiz.length) * 100}%` }} />
          </div>
          <span className="text-xs font-mono text-muted-foreground tabular-nums">{qIdx + 1}/{quiz.length}</span>
          <span className="text-xs font-semibold text-primary">{score} ✓</span>
        </div>
        <div className="bg-card border-2 border-border rounded-3xl p-10 flex items-center justify-center min-h-[180px]">
          <div className="text-center">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">{activeSet ? `${LANGUAGES.find(l => l.code === (q.mode === "quiz" ? activeSet.targetLang : q.mode === "reverse" ? activeSet.nativeLang : activeSet.targetLang))?.flag} ${q.mode === "type" ? "Type the answer" : q.mode === "reverse" ? "Reverse translate" : "Translate this"}` : "Translate this"}</p>
            <p className="text-3xl font-bold">{q.prompt}</p>
          </div>
        </div>
        {q.mode === "type" ? (
          <div className="flex flex-col gap-3">
            <input value={typed} onChange={e => setTyped(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleTyped(); }} className="w-full rounded-3xl border border-border px-4 py-3 bg-card focus:border-primary focus:outline-none" placeholder="Type your translation here" />
            <button onClick={handleTyped} disabled={!typed.trim() || !!chosen} className="w-full rounded-3xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40">Submit Answer</button>
            {chosen && (
              <div className={`rounded-3xl p-4 text-sm ${chosen.toLowerCase() === q.answer.toLowerCase() ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                {chosen.toLowerCase() === q.answer.toLowerCase() ? "Correct!" : <>Incorrect — correct answer: <span className="font-semibold">{q.answer}</span></>}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {q.choices.map((c, i) => {
              let cls = "bg-card border-2 border-border hover:border-primary/50 hover:bg-muted/30";
              if (chosen) {
                if (c === q.answer) cls = "bg-emerald-50 border-2 border-emerald-400 text-emerald-700";
                else if (c === chosen) cls = "bg-red-50 border-2 border-red-400 text-red-600";
                else cls = "bg-card border-2 border-border opacity-40";
              }
              return (
                <button key={i} onClick={() => handleChoice(c)} disabled={!!chosen} className={`${cls} rounded-2xl px-5 py-4 text-sm font-semibold text-left transition-all relative`}>
                  {c}
                  {chosen && c === q.answer && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const pct = Math.round((score / quiz.length) * 100);
  const stars = Math.round((score / quiz.length) * 5);
  return (
    <div className="max-w-md mx-auto px-5 py-16 flex flex-col items-center gap-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center"><Trophy className="w-10 h-10 text-primary" /></div>
      <div>
        <h2 className="text-3xl font-bold">{score} / {quiz.length}</h2>
        <p className="text-muted-foreground mt-1">{pct}% correct</p>
        <div className="flex gap-1 justify-center mt-3 text-xl">{[1,2,3,4,5].map(i => <span key={i} className={i <= stars ? "text-accent" : "opacity-20"}>★</span>)}</div>
        <p className="text-sm font-medium mt-3">{pct >= 80 ? "Excellent! 🎉" : pct >= 50 ? "Good effort — keep going!" : "Keep studying, you've got this!"}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => { if (activeSet) startGame(activeSet); }} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90">Play Again</button>
        <button onClick={() => setState("select")} className="px-5 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted">Choose Set</button>
      </div>
    </div>
  );
}

// ─── Translate ────────────────────────────────────────────────────────────────
function TranslateView() {
  const [srcLang, setSrcLang] = useState("en");
  const [tgtLang, setTgtLang] = useState("es");
  const [srcText, setSrcText] = useState("");
  const [tgtText, setTgtText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const doTranslate = async () => {
    if (!srcText.trim()) return;
    setLoading(true);
    const r = await autoTranslate(srcText, srcLang, tgtLang);
    setTgtText(r); setLoading(false);
  };
  const swap = () => { setSrcLang(tgtLang); setTgtLang(srcLang); setSrcText(tgtText); setTgtText(srcText); };
  const copy = async () => { if (!tgtText) return; await navigator.clipboard.writeText(tgtText); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const srcLO = LANGUAGES.find(l => l.code === srcLang)!;
  const tgtLO = LANGUAGES.find(l => l.code === tgtLang)!;

  return (
    <div className="max-w-screen-lg mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-7">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Languages className="w-5 h-5 text-primary" /></div>
        <div><h1 className="text-2xl font-bold">Translate</h1><p className="text-muted-foreground text-sm">Powered by MyMemory · 10 languages</p></div>
      </div>

      <div className="grid grid-cols-[1fr_80px_1fr] gap-4 items-start">
        {/* Source */}
        <div className="bg-card border-2 border-border rounded-2xl overflow-hidden focus-within:border-primary/50 transition-colors">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
            <LangSel value={srcLang} onChange={setSrcLang} />
            <span className="text-sm text-muted-foreground ml-1">{srcLO.flag} {srcLO.name}</span>
          </div>
          <textarea value={srcText} onChange={e => setSrcText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) doTranslate(); }}
            className="w-full p-5 text-lg bg-transparent resize-y overflow-auto focus:outline-none leading-relaxed" placeholder="Type something to translate…" rows={7} style={{ minHeight: "196px" }} />
          <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{srcText.length} chars · ⌘↵ to translate</span>
            {srcText && <button onClick={() => { setSrcText(""); setTgtText(""); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>
        </div>

        {/* Center */}
        <div className="flex flex-col items-center gap-3 pt-14">
          <button onClick={swap} className="p-2.5 rounded-xl bg-card border border-border hover:bg-muted hover:border-primary/30 transition-all"><ArrowLeftRight className="w-4 h-4" /></button>
          <button onClick={doTranslate} disabled={!srcText.trim() || loading} className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-all w-full text-center">
            {loading ? <RotateCcw className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Go"}
          </button>
        </div>

        {/* Target */}
        <div className="bg-card border-2 border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
            <LangSel value={tgtLang} onChange={setTgtLang} />
            <span className="text-sm text-muted-foreground ml-1">{tgtLO.flag} {tgtLO.name}</span>
            <div className="flex-1" />
            <button onClick={copy} disabled={!tgtText} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors">
              {copied ? <><Check className="w-3 h-3 text-emerald-600" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </div>
          <div className="p-5 min-h-[196px] overflow-auto" style={{ resize: "vertical", maxHeight: "55vh" }}>
            {loading
              ? <div className="flex items-center gap-2 text-muted-foreground"><RotateCcw className="w-4 h-4 animate-spin" /><span className="text-sm">Translating…</span></div>
              : tgtText
                ? <p className="text-lg leading-relaxed">{tgtText}</p>
                : <p className="text-muted-foreground/40 text-lg">Translation will appear here</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
