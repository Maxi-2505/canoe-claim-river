import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Send, Sun, X } from "lucide-react";
import { ChatBoatMark } from "./ChatBoatMark";

export type Locale = "en" | "de";
export type Theme = "light" | "dark";

const localeStorageKey = "canoe-locale";
const themeStorageKey = "canoe-theme";

const copy = {
  en: {
    language: "Language", theme: "Switch to dark mode", light: "Switch to light mode", chat: "Canoe help",
    open: "Open Ask Canoe help chat", close: "Close chat", hello: "Hello! I can help with basic questions about reporting a claim.",
    prompt: "Ask a question…", send: "Send message", topics: ["What do I need?", "How long does it take?", "What happens next?"],
    answers: [
      "For a car claim, it helps to have your policy number, the incident date, and a short description. A repair quote or police report can save you a few questions, but you can continue without them.",
      "The form usually takes about five minutes. You can add a repair quote or incident report first to reduce the number of questions.",
      "A claims specialist reviews the information. Canoe collects the facts; it does not make the claim decision. You should hear back within two working days.",
    ], fallback: "I can help with preparing a claim, the documents to gather, and what happens after you send it. For a specific claim decision, please contact your insurer.",
  },
  de: {
    language: "Sprache", theme: "Dunkelmodus einschalten", light: "Hellmodus einschalten", chat: "Canoe Hilfe",
    open: "Ask-Canoe-Hilfe öffnen", close: "Chat schließen", hello: "Hallo! Ich beantworte allgemeine Fragen zur Schadenmeldung.",
    prompt: "Frage eingeben…", send: "Nachricht senden", topics: ["Was brauche ich?", "Wie lange dauert es?", "Wie geht es weiter?"],
    answers: [
      "Für einen Kfz-Schaden sind Ihre Versicherungsnummer, das Schadendatum und eine kurze Beschreibung hilfreich. Ein Kostenvoranschlag oder Polizeibericht kann einige Fragen ersparen. Sie können aber auch ohne diese Unterlagen fortfahren.",
      "Das Formular dauert normalerweise etwa fünf Minuten. Wenn Sie zuerst einen Kostenvoranschlag oder einen Schadensbericht hinzufügen, müssen Sie möglicherweise weniger Fragen beantworten.",
      "Eine Sachbearbeiterin oder ein Sachbearbeiter prüft die Angaben. Canoe sammelt die Fakten und entscheidet nicht über den Schaden. Sie sollten innerhalb von zwei Werktagen eine Rückmeldung erhalten.",
    ], fallback: "Ich helfe Ihnen bei der Vorbereitung einer Schadenmeldung, den benötigten Unterlagen und den nächsten Schritten. Für eine konkrete Entscheidung wenden Sie sich bitte an Ihren Versicherer.",
  },
} as const;

const translations: Record<string, string> = {
  "Page not found": "Seite nicht gefunden", "The page you're looking for doesn't exist or has been moved.": "Die gesuchte Seite existiert nicht oder wurde verschoben.", "Go home": "Zur Startseite", "This page didn't load": "Diese Seite konnte nicht geladen werden", "Something went wrong on our end. You can try refreshing or head back home.": "Es ist ein Fehler aufgetreten. Laden Sie die Seite neu oder gehen Sie zurück zur Startseite.", "Try again": "Erneut versuchen",
  "Canoe / report a claim / about five minutes": "Canoe / Schaden melden / etwa fünf Minuten", "What happened?": "Was ist passiert?", "Pick what your claim is about. We collect the facts. We never decide the claim.": "Wählen Sie aus, worum es bei Ihrem Schaden geht. Wir erfassen die Fakten, entscheiden aber nicht über den Schaden.", "Choose one": "Bitte auswählen", "My car": "Mein Auto", "My": "Mein", "car": "Auto", "My home": "Mein Zuhause", "My health": "Meine Gesundheit", "start →": "Start →", "preview": "Vorschau", "Have a quote or police report? Keep it close. It saves you questions.": "Halten Sie Kostenvoranschlag oder Polizeibericht bereit. So beantworten Sie weniger Fragen.", "Have your repair quote or police report?": "Haben Sie einen Kostenvoranschlag oder Polizeibericht?", "Add them and we'll fill in what we can — fewer questions for you.": "Fügen Sie die Dokumente hinzu. Wir übernehmen die verfügbaren Angaben – so gibt es weniger Fragen.", "Continue": "Weiter", "Skip — I'll answer the questions": "Überspringen – ich beantworte die Fragen", "Back": "Zurück", "Check your claim": "Schadenmeldung prüfen", "Tap any line to change it. Blank is fine — we'll ask later if we need it.": "Tippen Sie auf eine Zeile, um sie zu ändern. Leere Angaben sind in Ordnung – falls nötig, fragen wir später danach.", "Sending…": "Wird gesendet …", "Send the update": "Änderung senden", "Send my claim": "Schadenmeldung senden", "Your claim is moving again.": "Ihre Schadenmeldung wird weiterbearbeitet.", "Thanks — your claim is in.": "Danke – Ihre Schadenmeldung ist eingegangen.", "We've added what you sent. No need to do anything else.": "Wir haben Ihre Angaben ergänzt. Sie müssen nichts weiter tun.", "We'll get back to you within 2 working days.": "Wir melden uns innerhalb von zwei Werktagen.", "Your claim reference": "Ihr Schadenszeichen", "Start another claim": "Weitere Schadenmeldung starten", "A claims specialist will contact you personally. Anything else you add below helps us prepare.": "Eine Sachbearbeitung wird sich persönlich bei Ihnen melden. Ihre weiteren Angaben helfen uns bei der Vorbereitung.", "We couldn't send your claim just now. Please try again in a moment.": "Ihre Schadenmeldung konnte gerade nicht gesendet werden. Bitte versuchen Sie es gleich noch einmal.",
  "What happened to your car?": "Was ist mit Ihrem Auto passiert?", "Damage to my car": "Schaden an meinem Auto", "My car was stolen": "Mein Auto wurde gestohlen", "Something else": "Etwas anderes", "Tell us in a few sentences what happened.": "Beschreiben Sie in wenigen Sätzen, was passiert ist.", "When did it happen?": "Wann ist es passiert?", "What is your policy number?": "Wie lautet Ihre Versicherungsnummer?", "Was another vehicle or person involved?": "Waren andere Fahrzeuge oder Personen beteiligt?", "Was anyone hurt?": "Wurde jemand verletzt?", "Is your car electric or a plug-in hybrid?": "Ist Ihr Auto elektrisch oder ein Plug-in-Hybrid?", "Could the high-voltage battery be affected?": "Könnte die Hochvoltbatterie beschädigt sein?", "How much is the repair quote?": "Wie hoch ist der Kostenvoranschlag?", "Do you have an itemized repair quote from a garage?": "Haben Sie einen detaillierten Kostenvoranschlag der Werkstatt?", "Do you have a police or incident report?": "Haben Sie einen Polizei- oder Unfallbericht?", "Yes": "Ja", "Not yet": "Noch nicht", "I'm not sure": "Ich bin nicht sicher", "Not sure": "Nicht sicher",
  "What": "Was", "happened?": "passiert?", "We ask so the right person looks at your claim.": "So kann die richtige Person Ihre Schadenmeldung prüfen.", "Collision, scrape, hail, vandalism…": "Zusammenstoß, Kratzer, Hagel, Vandalismus …", "Your own words help us understand it quickly.": "Ihre eigenen Worte helfen uns, den Vorfall schnell zu verstehen.", "We use the date to check your cover on that day.": "Anhand des Datums prüfen wir Ihren Versicherungsschutz.", "You'll find it on your insurance card — we need it to check your cover.": "Sie finden die Nummer auf Ihrer Versicherungskarte. Wir benötigen sie, um Ihren Versicherungsschutz zu prüfen.", "This tells us whether anyone else needs to be contacted.": "So wissen wir, ob wir weitere Personen kontaktieren müssen.", "It's fine if you don't know yet.": "Es ist in Ordnung, wenn Sie das noch nicht wissen.", "If so, a person — not a form — will be in touch.": "In diesem Fall meldet sich eine Person bei Ihnen.", "Electric cars sometimes need a specialist garage.": "Elektroautos benötigen manchmal eine Fachwerkstatt.", "A best guess is fine — say so if you're not sure.": "Eine Einschätzung reicht aus. Sagen Sie einfach, wenn Sie unsicher sind.", "An estimate from the garage is enough. In euros.": "Ein Kostenvoranschlag der Werkstatt reicht. Bitte in Euro.", "A quote that lists the parts and labour helps us move faster.": "Ein Kostenvoranschlag mit Teilen und Arbeitskosten beschleunigt die Bearbeitung.", "We need an incident report to process your claim — add it now if you have it.": "Für die Bearbeitung benötigen wir einen Schadensbericht. Fügen Sie ihn hinzu, falls vorhanden.",
  "Optional — helps us prepare": "Optional – hilft uns bei der Vorbereitung", "Add it now — we'll read it for you": "Jetzt hinzufügen – wir lesen es für Sie", "Or add the quote — we'll read it for you": "Oder Kostenvoranschlag hinzufügen – wir lesen ihn für Sie",
};

type SiteToolsContextValue = ReturnType<typeof useSiteToolsState>;
const SiteToolsContext = createContext<SiteToolsContextValue | null>(null);

function useSiteToolsState() {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const savedLocale = localStorage.getItem(localeStorageKey);
    const savedTheme = localStorage.getItem(themeStorageKey);
    if (savedLocale === "en" || savedLocale === "de") setLocale(savedLocale);
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem(localeStorageKey, locale);
    localStorage.setItem(themeStorageKey, theme);
  }, [locale, theme]);
  const t = (value: string) => locale === "de" ? translations[value] ?? value : value;
  return { locale, setLocale, theme, setTheme, text: copy[locale], t };
}

export function SiteToolsProvider({ children }: { children: ReactNode }) {
  const value = useSiteToolsState();
  return <SiteToolsContext.Provider value={value}>{children}</SiteToolsContext.Provider>;
}

export function useSiteTools() {
  const context = useContext(SiteToolsContext);
  if (!context) throw new Error("useSiteTools must be used inside SiteToolsProvider");
  return context;
}

export function SiteTools() {
  const { locale, setLocale, theme, setTheme, text } = useSiteTools();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ from: "canoe" | "you"; text: string }[]>([]);
  const answer = (input: string) => {
    const normalized = input.toLocaleLowerCase();
    const index = normalized.includes("need") || normalized.includes("document") || normalized.includes("unterlag") || normalized.includes("brauch") ? 0
      : normalized.includes("long") || normalized.includes("time") || normalized.includes("dau") ? 1
      : normalized.includes("next") || normalized.includes("happen") || normalized.includes("weiter") ? 2 : -1;
    return index === -1 ? text.fallback : text.answers[index];
  };
  const send = (value = question) => {
    const clean = value.trim();
    if (!clean) return;
    setMessages((items) => [...items, { from: "you", text: clean }, { from: "canoe", text: answer(clean) }]);
    setQuestion("");
  };

  return <>
    <div className="canoe-site-controls" aria-label="Site preferences">
      <button className="canoe-tool-button canoe-theme-button" aria-label={theme === "light" ? text.theme : text.light} title={theme === "light" ? text.theme : text.light} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      </button>
      <label className="canoe-locale-select"><span className="sr-only">{text.language}</span>
        <select aria-label={text.language} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}><option value="en">EN</option><option value="de">DE</option></select>
      </label>
    </div>
    {open && <section className="canoe-chat-panel" aria-label={text.chat}>
      <header className="canoe-chat-header"><span className="canoe-chat-brand"><span className="canoe-chat-mark"><ChatBoatMark /></span><span><strong>Canoe</strong><small>{text.chat}</small></span></span><button className="canoe-chat-close" aria-label={text.close} onClick={() => setOpen(false)}><X size={18} /></button></header>
      <div className="canoe-chat-body" aria-live="polite">
        <p className="canoe-chat-bubble canoe-chat-reply">{text.hello}</p>
        {messages.map((message, index) => <p key={index} className={`canoe-chat-bubble ${message.from === "you" ? "canoe-chat-user" : "canoe-chat-reply"}`}>{message.text}</p>)}
        {messages.length === 0 && <div className="canoe-chat-topics">{text.topics.map((topic) => <button key={topic} onClick={() => send(topic)}>{topic}</button>)}</div>}
      </div>
      <form className="canoe-chat-form" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={text.prompt} aria-label={text.prompt} /><button aria-label={text.send} disabled={!question.trim()}><Send size={16} /></button></form>
    </section>}
    <button className="canoe-chat-launcher" aria-label={open ? text.close : `${locale === "de" ? "Frag Canoe" : "Ask Canoe"} — ${text.open}`} aria-expanded={open} title={text.chat} onClick={() => setOpen(!open)}>
      <span className="canoe-chat-logo">
        <ChatBoatMark />
        <svg className="canoe-chat-wave" viewBox="0 0 60 6" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 3 Q7.5 0.5 15 3 T30 3 T45 3 T60 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" pathLength={60} />
        </svg>
      </span>
      <span className="canoe-chat-invite">{locale === "de" ? "Frag Canoe" : "Ask Canoe"}</span>
    </button>
  </>;
}
