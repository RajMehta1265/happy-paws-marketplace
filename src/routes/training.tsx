import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { trainingPlans, trainers } from "@/data/sample";
import { FiAward, FiClock, FiUsers, FiCheckSquare, FiPenTool, FiRefreshCw, FiFileText, FiCheck } from "react-icons/fi";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { dbService } from "@/services/db-service";
import { useAuth } from "@/hooks/use-auth";
import { BookingCalendar } from "@/components/BookingCalendar";

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

const trainingPrices = {
  Basic: "₹2,500",
  Moderate: "₹4,500",
  Advance: "₹7,500",
};

const commandsList = ["Sit", "Stay", "Heel", "Come", "Down", "Leave It", "Leash Walking", "Shake Hands", "Roll Over", "Bathroom Trained"];

function TrainingPage() {
  const { user } = useAuth();
  const [ownerName, setOwnerName] = useState("");
  const [petName, setPetName] = useState("");
  const [consentTerms, setConsentTerms] = useState(false);
  const [googleFormLink, setGoogleFormLink] = useState("");

  // Booking Form State
  const [bookOwnerName, setBookOwnerName] = useState("");
  const [bookPetName, setBookPetName] = useState("");
  const [bookBreed, setBookBreed] = useState("");
  const [bookAge, setBookAge] = useState("");
  const [bookHasMedical, setBookHasMedical] = useState(false);
  const [bookMedical, setBookMedical] = useState("");
  const [trainingType, setTrainingType] = useState<"Basic" | "Moderate" | "Advance">("Basic");
  const [preferredDate, setPreferredDate] = useState("");
  const [selectedCommands, setSelectedCommands] = useState<string[]>([]);
  const [bookSuccess, setBookSuccess] = useState(false);

  // Calendar availability state
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [dateCounts, setDateCounts] = useState<Record<string, number>>({});

  const refreshAvailability = useCallback(() => {
    const { bookedDates: bd, dateCounts: dc } = dbService.getBookedDates(3);
    setBookedDates(bd);
    setDateCounts(dc);
  }, []);

  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  useEffect(() => {
    if (user) {
      setBookOwnerName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
    }
  }, [user]);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookOwnerName || !bookPetName || !bookBreed || !bookAge || !preferredDate) {
      toast.error("Please fill in all the required booking fields.");
      return;
    }

    // Check if date is still available
    if (bookedDates.includes(preferredDate)) {
      toast.error("This date is fully booked. Please choose another date.");
      return;
    }

    // Save booking to db-service
    dbService.createTrainingBooking({
      user_id: user?.id || null,
      ownerName: bookOwnerName,
      petName: bookPetName,
      breed: bookBreed,
      age: bookAge,
      trainingType,
      preferredDate,
      selectedCommands,
      medicalConditions: bookHasMedical ? bookMedical : "N/A",
    });

    // Refresh calendar availability
    refreshAvailability();

    setBookSuccess(true);
    toast.success("Training booking request submitted successfully!");
  };
  
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

    // Save consent and signature to Supabase database via dbService
    dbService.submitConsent({
      user_id: user?.id || null,
      full_name: ownerName,
      email: user?.email || "training_customer@example.com",
      pet_id: null,
      pet_name: petName,
      liability_accepted: consentTerms,
      consent_given: consentTerms,
      signature_data_url: signatureDataUrl,
    }).catch((err) => {
      console.warn("Failed to save training consent to database:", err);
    });

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

      {/* Availability Calendar */}
      <section className="mx-auto max-w-7xl px-6 my-16">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.25em] text-primary mb-2">Availability</div>
          <h2 className="font-display text-4xl">Check available training dates</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Green dates are available for booking. Click on an available date to auto-fill your preferred start date below.
          </p>
        </div>
        <div className="max-w-xl">
          <BookingCalendar
            mode="user"
            bookedDates={bookedDates}
            dateCounts={dateCounts}
            maxPerDay={3}
            selectedDate={preferredDate}
            onDateSelect={(dateStr) => {
              setPreferredDate(dateStr);
              toast.success(`Selected ${new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} as your preferred date.`);
            }}
          />
        </div>
      </section>

      {/* Appointment Booking Form */}
      <section className="mx-auto max-w-7xl px-6 my-16">
        <div className="rounded-[2.5rem] bg-accent/40 p-8 md:p-12 lg:p-14 border border-accent/20">
          <h3 className="font-display text-4xl mb-2 text-foreground">Book an Appointment</h3>
          <p className="text-sm text-muted-foreground mb-8">
            Select your preferred conditioning level, customize commands, and provide health details below.
          </p>
          
          {bookSuccess ? (
            <div className="text-center py-10 bg-background/50 rounded-3xl p-6 border border-border/80 max-w-xl mx-auto space-y-4 animate-scale-in">
              <div className="inline-flex rounded-full bg-[#673ab7]/10 p-4 text-[#673ab7] mb-2">
                <FiCheckSquare size={36} />
              </div>
              <h4 className="font-display text-2xl text-foreground">Booking Request Sent!</h4>
              <p className="text-sm text-muted-foreground">
                We've received your request for <strong>{bookPetName}</strong>'s training session.
              </p>
              
              <div className="bg-background rounded-2xl p-4 border border-border/85 text-left text-xs space-y-2">
                <div>Owner Name: <strong className="text-foreground">{bookOwnerName}</strong></div>
                <div>Pet Details: <strong className="text-foreground">{bookPetName} ({bookBreed}, {bookAge})</strong></div>
                <div>Program Type: <strong className="text-foreground">{trainingType} (₹{trainingType === "Basic" ? "2,500" : trainingType === "Moderate" ? "4,500" : "7,500"})</strong></div>
                <div>Preferred Date: <strong className="text-foreground">{preferredDate}</strong></div>
                <div>Medical Conditions: <strong className="text-foreground">{bookHasMedical ? (bookMedical || "Declared but not specified") : "N/A"}</strong></div>
                {selectedCommands.length > 0 && (
                  <div>Custom Commands: <strong className="text-foreground">{selectedCommands.join(", ")}</strong></div>
                )}
              </div>
              
              <button
                onClick={() => {
                  setBookSuccess(false);
                  setBookPetName("");
                  setBookBreed("");
                  setBookAge("");
                  setBookHasMedical(false);
                  setBookMedical("");
                  setSelectedCommands([]);
                }}
                className="mt-6 rounded-full bg-[#673ab7] text-white hover:opacity-90 transition px-8 py-3 text-sm font-semibold cursor-pointer shadow-md"
              >
                Book Another Program
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleBookingSubmit}>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={bookOwnerName}
                    onChange={(e) => setBookOwnerName(e.target.value)}
                    placeholder="Enter your name"
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-[#673ab7] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Pet Name *</label>
                  <input
                    type="text"
                    required
                    value={bookPetName}
                    onChange={(e) => setBookPetName(e.target.value)}
                    placeholder="e.g. Biscuit"
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-[#673ab7] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Breed Name *</label>
                  <input
                    type="text"
                    required
                    value={bookBreed}
                    onChange={(e) => setBookBreed(e.target.value)}
                    placeholder="e.g. Golden Retriever"
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-[#673ab7] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Pet Age *</label>
                  <input
                    type="text"
                    required
                    value={bookAge}
                    onChange={(e) => setBookAge(e.target.value)}
                    placeholder="e.g. 8 months"
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-[#673ab7] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Preferred Start Date *</label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-[#673ab7] focus:outline-none"
                  />
                </div>
              </div>

              {/* Medical Conditions - Checkbox Toggle */}
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bookHasMedical}
                    onChange={(e) => {
                      setBookHasMedical(e.target.checked);
                      if (!e.target.checked) {
                        setBookMedical("");
                      }
                    }}
                    className="h-4 w-4 rounded border-border text-[#673ab7] focus:ring-[#673ab7]"
                  />
                  <span className="text-xs font-semibold text-foreground">My pet has existing medical conditions</span>
                </label>

                {bookHasMedical ? (
                  <div className="flex flex-col gap-1.5 animate-slide-down">
                    <label className="text-xs font-semibold text-muted-foreground">Describe Medical Conditions *</label>
                    <textarea
                      required={bookHasMedical}
                      value={bookMedical}
                      onChange={(e) => setBookMedical(e.target.value)}
                      placeholder="Describe any allergies, chronic illness, daily medications, or physical limitations..."
                      rows={3}
                      className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-[#673ab7] focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground bg-muted/20 px-4 py-2 rounded-xl border border-border">
                    Medical conditions: <strong>N/A</strong> (Not Applicable)
                  </div>
                )}
              </div>

              {/* Training Type & Package Price */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground">Training Type & Package Price *</label>
                <div className="flex flex-wrap gap-3">
                  {(["Basic", "Moderate", "Advance"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTrainingType(type)}
                      className={`px-5 py-2.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                        trainingType === type
                          ? "bg-[#673ab7] text-white border-[#673ab7] shadow-md"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {type} — {trainingPrices[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customization of Training Program — Premium Command Selection */}
              <div className="flex flex-col gap-3 pt-2">
                <div>
                  <label className="text-sm font-semibold text-foreground">Customize Training Program</label>
                  <p className="text-xs text-muted-foreground mt-0.5">Select the commands you want your pet to learn. Choose as many as needed.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {commandsList.map((command) => {
                    const checked = selectedCommands.includes(command);
                    return (
                      <button
                        key={command}
                        type="button"
                        onClick={() => {
                          if (checked) {
                            setSelectedCommands(selectedCommands.filter((c) => c !== command));
                          } else {
                            setSelectedCommands([...selectedCommands, command]);
                          }
                        }}
                        className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 text-xs font-bold transition-all duration-200 cursor-pointer text-center ${
                          checked
                            ? "bg-[#673ab7]/10 text-[#673ab7] border-[#673ab7] shadow-[0_0_0_1px_rgba(103,58,183,0.2),0_4px_12px_rgba(103,58,183,0.15)]"
                            : "border-border/60 hover:border-[#673ab7]/40 hover:bg-[#673ab7]/5 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {checked && (
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#673ab7] text-white shrink-0">
                            <FiCheck size={10} strokeWidth={3} />
                          </span>
                        )}
                        {command}
                      </button>
                    );
                  })}
                </div>
                {selectedCommands.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-[#673ab7] font-semibold mt-1">
                    <FiCheckSquare size={14} />
                    {selectedCommands.length} command{selectedCommands.length > 1 ? "s" : ""} selected: {selectedCommands.join(", ")}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition cursor-pointer mt-4"
              >
                Send Booking Request
              </button>
            </form>
          )}
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
