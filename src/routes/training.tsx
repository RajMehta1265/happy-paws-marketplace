import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { FiCheckSquare, FiPenTool, FiRefreshCw, FiCheck } from "react-icons/fi";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { dbService } from "@/services/db-service";
import { useAuth } from "@/hooks/use-auth";
import { BookingCalendar } from "@/components/BookingCalendar";

export const Route = createFileRoute("/training")({
  head: () => ({
    meta: [
      { title: "Pet Training — WOOLF.INDIA" },
      {
        name: "description",
        content:
          "Gentle, science-based training. Complete intake form and sign consent documents digitally.",
      },
    ],
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

const commandsList = [
  "Sit",
  "Stay",
  "Heel",
  "Come",
  "Down",
  "Leave It",
  "Leash Walking",
  "Shake Hands",
  "Roll Over",
  "Bathroom Trained",
];

function TrainingPage() {
  const { user } = useAuth();
  const [consentTerms, setConsentTerms] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState("");

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
    dbService
      .getBookedDates(3)
      .then(({ bookedDates: bd, dateCounts: dc }) => {
        setBookedDates(bd);
        setDateCounts(dc);
      })
      .catch((err) => {
        console.warn("Failed to refresh training availability:", err);
      });
  }, []);

  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  useEffect(() => {
    if (user) {
      setBookOwnerName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
    }
  }, [user]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookOwnerName || !bookPetName || !bookBreed || !bookAge || !preferredDate) {
      toast.error("Please fill in all the required booking fields.");
      return;
    }

    if (!consentTerms) {
      toast.error("Please check the training consent agreement terms.");
      return;
    }

    if (!hasSigned || !canvasRef.current) {
      toast.error("Please provide your virtual signature to complete the booking.");
      return;
    }

    // Check if date is still available
    if (bookedDates.includes(preferredDate)) {
      toast.error("This date is fully booked. Please choose another date.");
      return;
    }

    const signatureDataUrl = canvasRef.current.toDataURL("image/png");
    setSignatureUrl(signatureDataUrl);

    try {
      // Save booking to db-service with integrated consent and signature details
      await dbService.createTrainingBooking({
        user_id: user?.id || null,
        ownerName: bookOwnerName,
        petName: bookPetName,
        breed: bookBreed,
        age: bookAge,
        trainingType,
        preferredDate,
        selectedCommands,
        medicalConditions: bookHasMedical ? bookMedical : "N/A",
        liabilityAccepted: consentTerms,
        consentGiven: consentTerms,
        signatureDataUrl: signatureDataUrl,
      });

      // Refresh calendar availability
      refreshAvailability();

      setBookSuccess(true);
      toast.success("Training booking request and signed consent submitted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit training booking. Please try again.");
    }
  };

  // Signature Drawing State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [lastCoords, setLastCoords] = useState({ x: 0, y: 0 });

  // Drawing Canvas Functions
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
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
    ctx.strokeStyle = "#D8B273"; // Woolf Champagne Gold
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

  const getCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Check if touch event or mouse event
    const clientX =
      "touches" in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e && e.touches[0] ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // Scale coords to account for differences between the canvas's internal resolution and visual CSS dimensions
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
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

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-primary">Training</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl max-w-3xl">
          Skills built on trust, not fear.
        </h1>
        <p className="mt-4 text-muted-foreground max-w-xl">
          Our certified trainers use positive reinforcement to shape calm, confident pets — at home
          or in our studio.
        </p>
      </section>

      {/* Availability Calendar */}
      <section className="mx-auto max-w-7xl px-6 my-16">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.25em] text-primary mb-2">Availability</div>
          <h2 className="font-display text-4xl">Check available training dates</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Green dates are available for booking. Click on an available date to auto-fill your
            preferred start date below.
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
              toast.success(
                `Selected ${new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} as your preferred date.`,
              );
            }}
          />
        </div>
      </section>

      {/* Appointment Booking Form */}
      <section className="mx-auto max-w-7xl px-6 my-16">
        <div className="rounded-[2.5rem] bg-accent/40 p-8 md:p-12 lg:p-14 border border-accent/20">
          <h3 className="font-display text-4xl mb-2 text-foreground">Book an Appointment</h3>
          <p className="text-sm text-muted-foreground mb-8">
            Select your preferred conditioning level, customize commands, and provide health details
            below.
          </p>

          {bookSuccess ? (
            <div className="text-center py-10 bg-background/50 rounded-[2rem] p-8 md:p-10 border border-border/80 max-w-xl mx-auto space-y-4 animate-scale-in">
              <div className="inline-flex rounded-full bg-accent/10 p-4 text-accent mb-2">
                <FiCheckSquare size={36} />
              </div>
              <h4 className="font-display text-2xl text-foreground">Booking Request Sent!</h4>
              <p className="text-sm text-muted-foreground">
                We've received your request for <strong>{bookPetName}</strong>'s training session.
              </p>

              <div className="bg-background rounded-2xl p-4 border border-border/85 text-left text-xs space-y-2">
                <div>
                  Owner Name: <strong className="text-foreground">{bookOwnerName}</strong>
                </div>
                <div>
                  Pet Details:{" "}
                  <strong className="text-foreground">
                    {bookPetName} ({bookBreed}, {bookAge})
                  </strong>
                </div>
                <div>
                  Program Type:{" "}
                  <strong className="text-foreground">
                    {trainingType} (₹
                    {trainingType === "Basic"
                      ? "2,500"
                      : trainingType === "Moderate"
                        ? "4,500"
                        : "7,500"}
                    )
                  </strong>
                </div>
                <div>
                  Preferred Date: <strong className="text-foreground">{preferredDate}</strong>
                </div>
                <div>
                  Medical Conditions:{" "}
                  <strong className="text-foreground">
                    {bookHasMedical ? bookMedical || "Declared but not specified" : "N/A"}
                  </strong>
                </div>
                {selectedCommands.length > 0 && (
                  <div>
                    Custom Commands:{" "}
                    <strong className="text-foreground">{selectedCommands.join(", ")}</strong>
                  </div>
                )}
                {signatureUrl && (
                  <div className="border-t border-border pt-4 mt-4">
                    <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                      Liability Release & Digital Signature
                    </h4>
                    <div className="text-[10px] text-muted-foreground mb-2">
                      Agreement Status:{" "}
                      <strong className="text-emerald-600">Consent Verified</strong>
                    </div>
                    <div className="border border-border/80 rounded-xl bg-card p-2 h-20 flex justify-center items-center max-w-xs">
                      <img
                        src={signatureUrl}
                        alt="Signature Representation"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
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
                  setConsentTerms(false);
                  setHasSigned(false);
                  setSignatureUrl("");
                  setTimeout(() => {
                    clearCanvas();
                  }, 100);
                }}
                className="mt-6 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition px-8 py-3 text-sm font-semibold cursor-pointer shadow-md"
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
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
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
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Breed Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookBreed}
                    onChange={(e) => setBookBreed(e.target.value)}
                    placeholder="e.g. Golden Retriever"
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
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
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Preferred Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
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
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    My pet has existing medical conditions
                  </span>
                </label>

                {bookHasMedical ? (
                  <div className="flex flex-col gap-1.5 animate-slide-down">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Describe Medical Conditions *
                    </label>
                    <textarea
                      required={bookHasMedical}
                      value={bookMedical}
                      onChange={(e) => setBookMedical(e.target.value)}
                      placeholder="Describe any allergies, chronic illness, daily medications, or physical limitations..."
                      rows={3}
                      className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
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
                <label className="text-xs font-semibold text-muted-foreground">
                  Training Type & Package Price *
                </label>
                <div className="flex flex-wrap gap-3">
                  {(["Basic", "Moderate", "Advance"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTrainingType(type)}
                      className={`px-5 py-2.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                        trainingType === type
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
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
                  <label className="text-sm font-semibold text-foreground">
                    Customize Training Program
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select the commands you want your pet to learn. Choose as many as needed.
                  </p>
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
                            ? "bg-primary/10 text-primary border-primary shadow-[0_0_0_1px_rgba(216,178,115,0.2),0_4px_12px_rgba(216,178,115,0.15)]"
                            : "border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {checked && (
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground shrink-0">
                            <FiCheck size={10} strokeWidth={3} />
                          </span>
                        )}
                        {command}
                      </button>
                    );
                  })}
                </div>
                {selectedCommands.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-primary font-semibold mt-1">
                    <FiCheckSquare size={14} />
                    {selectedCommands.length} command{selectedCommands.length > 1 ? "s" : ""}{" "}
                    selected: {selectedCommands.join(", ")}
                  </div>
                )}
              </div>

              {/* Liability Release & Consent */}
              <div className="bg-card border-l-8 border-primary border-y border-r border-border rounded-[1.5rem] p-6 shadow-sm space-y-4">
                <h4 className="font-display text-2xl text-foreground pb-2 border-b border-border">
                  Liability Release & Consent <span className="text-red-500">*</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By checking the authorization agreement below, you release WOOLF.INDIA, its
                  certified trainer staff, and training facilities from any and all liability for
                  injury, illness, or behavioral developments. You confirm that your pet is fully
                  vaccinated and fit for conditioning exercises.
                </p>
                <label className="flex items-start gap-3 cursor-pointer mt-3 select-none">
                  <input
                    type="checkbox"
                    checked={consentTerms}
                    onChange={(e) => setConsentTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                  />
                  <span className="text-xs text-foreground/80 font-semibold">
                    I agree and authorize professional training programs for my pet companion under
                    the terms described. <span className="text-red-500">(Compulsory)</span>
                  </span>
                </label>
              </div>

              {/* Virtual Signature Panel */}
              <div className="bg-card rounded-[1.5rem] border border-border p-6 shadow-sm space-y-4">
                <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <FiPenTool className="text-primary" /> Draw Virtual Signature{" "}
                  <span className="text-red-500">*</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sign inside the panel below using your cursor or touchscreen device. This is
                  required.
                </p>

                <div className="relative border border-border/80 rounded-2xl bg-secondary overflow-hidden h-40 w-full cursor-crosshair">
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

                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted transition flex items-center gap-1.5 cursor-pointer text-muted-foreground"
                  >
                    <FiRefreshCw size={12} /> Clear Signature
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition cursor-pointer mt-4"
              >
                Send Booking Request & Sign Consent
              </button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
