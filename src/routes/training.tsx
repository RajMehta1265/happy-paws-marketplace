import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { trainingPlans, trainers } from "@/data/sample";
import { FiAward, FiClock, FiUsers, FiCheckSquare, FiPenTool, FiRefreshCw, FiFileText } from "react-icons/fi";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/training")({
  head: () => ({
    meta: [
      { title: "Pet Training — WOOLF.INDIA" },
      { name: "description", content: "Gentle, science-based training. Complete intake form and sign consent documents digitally." }
    ]
  }),
  component: TrainingPage,
});

interface ConsentSubmission {
  ownerName: string;
  petName: string;
  consentTerms: boolean;
  signatureDataUrl: string;
  submittedAt: string;
}

function TrainingPage() {
  const [ownerName, setOwnerName] = useState("");
  const [petName, setPetName] = useState("");
  const [consentTerms, setConsentTerms] = useState(false);
  const [googleFormLink, setGoogleFormLink] = useState("");
  
  // Signature Drawing State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [lastCoords, setLastCoords] = useState({ x: 0, y: 0 });

  // Consent Submission State
  const [submission, setSubmission] = useState<ConsentSubmission | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pawhaven_training_consent");
      if (stored) {
        try {
          setSubmission(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);

  // Drawing Canvas Functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoords(e);
    setLastCoords(coords);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoords(e);
    ctx.beginPath();
    ctx.strokeStyle = "#111827"; // Tailwind neutral-900
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(lastCoords.x, lastCoords.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    setLastCoords(coords);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Check if touch event or mouse event
    const clientX = "touches" in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e && e.touches[0] ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // Submit consent form
  const handleConsentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName || !petName) {
      toast.error("Please fill in all owner and pet fields.");
      return;
    }
    if (!consentTerms) {
      toast.error("Please check the training consent agreement terms.");
      return;
    }
    if (!hasSigned || !canvasRef.current) {
      toast.error("Please provide a virtual signature before submitting.");
      return;
    }

    const signatureDataUrl = canvasRef.current.toDataURL("image/png");
    const nextSubmission: ConsentSubmission = {
      ownerName,
      petName,
      consentTerms,
      signatureDataUrl,
      submittedAt: new Date().toLocaleString(),
    };

    setSubmission(nextSubmission);
    if (typeof window !== "undefined") {
      localStorage.setItem("pawhaven_training_consent", JSON.stringify(nextSubmission));
    }
    toast.success("Consent agreement signed and submitted successfully!");
  };

  const handleClearConsent = () => {
    setSubmission(null);
    setOwnerName("");
    setPetName("");
    setConsentTerms(false);
    setHasSigned(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("pawhaven_training_consent");
    }
    setTimeout(() => {
      clearCanvas();
    }, 100);
  };

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-primary">Training</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl max-w-3xl">Skills built on trust, not fear.</h1>
        <p className="mt-4 text-muted-foreground max-w-xl">Our certified trainers use positive reinforcement to shape calm, confident pets — at home or in our studio.</p>
      </section>

      {/* Plans Section */}
      <section className="mx-auto max-w-7xl px-6 py-16 grid md:grid-cols-3 gap-6">
        {trainingPlans.map((t) => (
          <div key={t.id} className="rounded-3xl border border-border bg-card p-7 hover-lift">
            <div className="text-xs uppercase tracking-wider text-primary">{t.mode}</div>
            <h3 className="mt-2 font-display text-2xl">{t.title}</h3>
            <div className="mt-1 text-sm text-muted-foreground flex items-center gap-1"><FiClock /> {t.duration}</div>
            <ul className="mt-5 space-y-2 text-sm">
              {t.perks.map((p) => <li key={p} className="flex gap-2"><FiAward className="text-primary mt-0.5 shrink-0" /> {p}</li>)}
            </ul>
            <div className="mt-6 flex items-center justify-between">
              <span className="font-display text-2xl">₹{t.price}</span>
              <button className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 transition cursor-pointer">Book session</button>
            </div>
          </div>
        ))}
      </section>

      {/* Trainers Section */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="font-display text-4xl mb-10">Our trainers</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {trainers.map((t) => (
            <div key={t.name} className="rounded-3xl bg-card p-7 border border-border">
              <div className="grid place-items-center h-16 w-16 rounded-full bg-accent/60 text-primary"><FiUsers size={24} /></div>
              <div className="mt-4 font-display text-xl">{t.name}</div>
              <div className="text-sm text-muted-foreground">{t.specialty}</div>
              <div className="mt-2 text-xs text-primary">{t.years} years experience</div>
            </div>
          ))}
        </div>
      </section>

      {/* Appointment Booking Form */}
      <section className="mx-auto max-w-7xl px-6 my-16">
        <div className="rounded-[2rem] bg-accent/40 p-10 lg:p-14">
          <h3 className="font-display text-3xl">Book an appointment</h3>
          <form className="mt-6 grid md:grid-cols-2 gap-4" onSubmit={(e) => e.preventDefault()}>
            <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Your name" />
            <input className="rounded-full border border-input bg-background px-5 py-3" placeholder="Pet name & breed" />
            <input type="date" className="rounded-full border border-input bg-background px-5 py-3" />
            <select className="rounded-full border border-input bg-background px-5 py-3">
              {trainingPlans.map((t) => <option key={t.id}>{t.title}</option>)}
            </select>
            <button className="md:col-span-2 rounded-full bg-primary px-6 py-3 text-primary-foreground cursor-pointer hover:opacity-95 transition">Request booking</button>
          </form>
        </div>
      </section>

      {/* Google Form Consent and Virtual Sign Section */}
      <section className="mx-auto max-w-4xl px-6 my-24">
        
        {submission ? (
          /* Consent Form Digital Certificate / Success Receipt */
          <div className="rounded-[2rem] bg-emerald-500/10 border-2 border-emerald-500/20 p-10 text-center space-y-6 shadow-soft animate-scale-in">
            <div className="mx-auto grid place-items-center h-16 w-16 rounded-full bg-emerald-500 text-white">
              <FiCheckSquare size={32} />
            </div>
            <h3 className="font-display text-3xl text-emerald-800 dark:text-emerald-400">Consent Signed Successfully!</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your intake release form is signed and registered. Our training coordinator will verify this document upon arrival.
            </p>

            <div className="bg-background rounded-2xl p-6 border border-border max-w-md mx-auto text-left space-y-4">
              <div className="flex items-center gap-2 font-display text-lg font-bold border-b border-border pb-2 text-foreground">
                <FiFileText /> Agreement Receipt
              </div>
              <div className="text-xs space-y-1.5 text-muted-foreground">
                <div>Owner Name: <strong className="text-foreground">{submission.ownerName}</strong></div>
                <div>Pet Companion Name: <strong className="text-foreground">{submission.petName}</strong></div>
                <div>Submission Time: <strong className="text-foreground">{submission.submittedAt}</strong></div>
                <div>Agreement Status: <strong className="text-emerald-600">Consent Verified</strong></div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Virtual Signature Representation</div>
                <div className="border border-border/80 rounded-xl bg-card p-2 h-20 flex justify-center items-center">
                  <img src={submission.signatureDataUrl} alt="Signature Representation" className="max-h-full max-w-full object-contain" />
                </div>
              </div>
            </div>

            <button
              onClick={handleClearConsent}
              className="rounded-full bg-neutral-800 text-white hover:bg-neutral-900 transition px-6 py-2.5 text-xs font-semibold cursor-pointer"
            >
              Sign New Form
            </button>
          </div>
        ) : (
          /* Interactive Google-Form-Style Intake + Canvas Signature */
          <div className="space-y-6 animate-fade-in">
            
            {/* Header Style resembling Google Forms purple theme */}
            <div className="bg-[#673ab7] rounded-t-2xl h-3 w-full shadow-sm" />
            <div className="bg-card rounded-b-2xl border border-t-0 border-border p-8 shadow-sm">
              <h2 className="font-display text-4xl text-[#202124] dark:text-foreground">Training Consent & Liability Release</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Please complete this intake release agreement before checking in your pet for professional conditioning programs with WOOLF.INDIA.
              </p>
              
              {/* Option to embed custom Google Form links */}
              <div className="mt-6 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 text-xs text-muted-foreground flex flex-col gap-2">
                <div>Optionally paste your custom Google Forms intake URL below to preview/use:</div>
                <input
                  type="text"
                  placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
                  value={googleFormLink}
                  onChange={(e) => setGoogleFormLink(e.target.value)}
                  className="rounded-full border border-border bg-background px-4 py-2 text-xs outline-none focus:border-[#673ab7]"
                />
              </div>
            </div>

            {/* Embedded Iframe vs Styled Mock Google Form */}
            {googleFormLink ? (
              <div className="rounded-2xl overflow-hidden border border-border shadow-sm h-[600px] w-full bg-background relative">
                <iframe
                  src={googleFormLink}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  marginHeight={0}
                  marginWidth={0}
                >
                  Loading Google Form...
                </iframe>
              </div>
            ) : (
              /* High-fidelity Google Form replica */
              <div className="space-y-4">
                <div className="bg-card border-l-8 border-[#673ab7] border-y border-r border-border rounded-xl p-6 shadow-sm space-y-4">
                  <div className="text-sm font-semibold text-[#202124] dark:text-foreground">Owner Full Name <span className="text-red-500">*</span></div>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full sm:w-1/2 border-b border-border/80 focus:border-[#673ab7] bg-transparent outline-none py-2 text-sm"
                  />
                </div>

                <div className="bg-card border-l-8 border-[#673ab7] border-y border-r border-border rounded-xl p-6 shadow-sm space-y-4">
                  <div className="text-sm font-semibold text-[#202124] dark:text-foreground">Pet Name & Breed <span className="text-red-500">*</span></div>
                  <input
                    type="text"
                    required
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="Enter pet companion details"
                    className="w-full sm:w-1/2 border-b border-border/80 focus:border-[#673ab7] bg-transparent outline-none py-2 text-sm"
                  />
                </div>

                <div className="bg-card border-l-8 border-[#673ab7] border-y border-r border-border rounded-xl p-6 shadow-sm space-y-4">
                  <div className="text-sm font-semibold text-[#202124] dark:text-foreground">Terms of Agreement & Consent <span className="text-red-500">*</span></div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By checking the box below, you release WOOLF.INDIA, its certified trainer staff, and training facilities from any and all liability for injury, illness, or behavioral developments. You confirm that your pet is fully vaccinated and fit for conditioning exercises.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer mt-3 select-none">
                    <input
                      type="checkbox"
                      checked={consentTerms}
                      onChange={(e) => setConsentTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-[#673ab7] focus:ring-[#673ab7]"
                    />
                    <span className="text-xs text-foreground/80">I agree and authorize professional training programs for my pet.</span>
                  </label>
                </div>
              </div>
            )}

            {/* Virtual Sign Canvas */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
              <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <FiPenTool className="text-[#673ab7]" /> Draw Virtual Signature <span className="text-red-500">*</span>
              </div>
              <p className="text-xs text-muted-foreground">Sign inside the panel below using your cursor or touchscreen device.</p>
              
              <div className="relative border border-border/80 rounded-2xl bg-white overflow-hidden h-40 w-full cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted transition flex items-center gap-1.5 cursor-pointer text-muted-foreground"
                >
                  <FiRefreshCw size={12} /> Clear Signature
                </button>
                
                <button
                  onClick={handleConsentSubmit}
                  className="rounded-full bg-[#673ab7] text-white hover:opacity-90 transition px-6 py-2.5 text-xs font-bold shadow-md cursor-pointer"
                >
                  Sign & Submit Consent
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
