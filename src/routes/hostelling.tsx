import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  FiCalendar,
  FiShield,
  FiHeart,
  FiActivity,
  FiPenTool,
  FiRefreshCw,
  FiFileText,
  FiUploadCloud,
  FiCheckCircle,
} from "react-icons/fi";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { dbService, type HostellingBooking } from "@/services/db-service";
import { BookingCalendar } from "@/components/BookingCalendar";

export const Route = createFileRoute("/hostelling")({
  head: () => ({
    meta: [
      { title: "Hostelling & Pet Boarding Stay — WOOLF.INDIA" },
      {
        name: "description",
        content:
          "Luxury pet boarding and hostelling with 24/7 care. Fill out the medical intake and sign the liability consent form.",
      },
    ],
  }),
  component: HostellingPage,
});

function HostellingPage() {
  const { user } = useAuth();
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState<"Male" | "Female">("Male");
  const [petAge, setPetAge] = useState("");
  const [hasMedical, setHasMedical] = useState(false);
  const [medicalConditions, setMedicalConditions] = useState("");
  const [medicalImage, setMedicalImage] = useState<string>("");
  const [temperament, setTemperament] = useState<"Friendly" | "Aggressive">("Friendly");
  const [aggressionDetails, setAggressionDetails] = useState("");
  const [urineTrained, setUrineTrained] = useState(false);
  const [pottyTrained, setPottyTrained] = useState(false);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [numDays, setNumDays] = useState<number>(1);
  const [consentTerms, setConsentTerms] = useState(false);
  const [petType, setPetType] = useState<"Dog" | "Cat">("Dog");

  const dailyRate = petType === "Dog" ? 1100 : 900;
  const totalPrice = numDays * dailyRate;

  // Calendar availability state
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [dateCounts, setDateCounts] = useState<Record<string, number>>({});

  const refreshAvailability = useCallback(() => {
    dbService.getHostellingBookings()
      .then((bookings) => {
        const counts: Record<string, number> = {};
        const maxPerDay = 5; // Suppose max 5 pets allowed for hostelling per day
        
        bookings.forEach((b) => {
          if (!b.checkInDate || !b.checkOutDate) return;
          // Loop through all dates from checkInDate to checkOutDate
          const start = new Date(b.checkInDate + "T00:00:00");
          const end = new Date(b.checkOutDate + "T00:00:00");
          const current = new Date(start);
          
          while (current <= end) {
            const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
            counts[dateStr] = (counts[dateStr] || 0) + 1;
            // Advance one day
            current.setDate(current.getDate() + 1);
          }
        });
        
        const booked = Object.entries(counts)
          .filter(([, count]) => count >= maxPerDay)
          .map(([date]) => date);
          
        setBookedDates(booked);
        setDateCounts(counts);
      })
      .catch((err) => {
        console.warn("Failed to fetch hostelling availability:", err);
      });
  }, []);

  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  // Prefill parent info if user logged in
  useEffect(() => {
    if (user) {
      setParentName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      setParentEmail(user.email || "");
      setParentPhone(user.phone || "");
    }
  }, [user]);

  // Calculate days dynamically
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        setNumDays(diffDays);
      } else {
        setNumDays(1);
      }
    }
  }, [checkInDate, checkOutDate]);

  // Image Upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image file size should be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setMedicalImage(reader.result as string);
        toast.success("Medical specification image uploaded successfully.");
      };
      reader.readAsDataURL(file);
    }
  };

  // Signature drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [lastCoords, setLastCoords] = useState({ x: 0, y: 0 });
  const [booking, setBooking] = useState<HostellingBooking | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pawhaven_hostelling_booking");
      if (stored) {
        try {
          setBooking(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);

  // Signature canvas drawing functions
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
    ctx.strokeStyle = "#F4A261"; // Primary Accent
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

  // Submit Hostelling Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !parentName ||
      !parentPhone ||
      !petName ||
      !petBreed ||
      !petAge ||
      !checkInDate ||
      !checkOutDate
    ) {
      toast.error("Please fill in all the required parent and pet info fields.");
      return;
    }

    // Validate stay range availability
    const start = new Date(checkInDate + "T00:00:00");
    const end = new Date(checkOutDate + "T00:00:00");
    if (end < start) {
      toast.error("Check-out date cannot be before check-in date.");
      return;
    }

    const current = new Date(start);
    let hasBookedDate = false;
    while (current <= end) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      if (bookedDates.includes(dateStr)) {
        hasBookedDate = true;
        break;
      }
      current.setDate(current.getDate() + 1);
    }

    if (hasBookedDate) {
      toast.error("One or more dates in your selected stay range are fully booked. Please choose another range.");
      return;
    }

    if (temperament === "Aggressive" && !aggressionDetails.trim()) {
      toast.error("Please specify aggression triggers or details.");
      return;
    }

    if (!consentTerms) {
      toast.error("Please check the Hostelling Consent Agreement terms.");
      return;
    }

    if (!hasSigned || !canvasRef.current) {
      toast.error("Please provide your virtual signature to complete the request.");
      return;
    }

    const signatureDataUrl = canvasRef.current.toDataURL("image/png");
    const finalMedicalConditions = hasMedical ? medicalConditions : "N/A";

    try {
      const createdBooking = await dbService.createHostellingBooking({
        user_id: user?.id || null,
        parentName,
        parentEmail: parentEmail || "hostelling_guest@example.com",
        parentPhone,
        petName,
        petBreed,
        petGender,
        petAge,
        petType,
        price: totalPrice,
        medicalConditions: finalMedicalConditions,
        medicalImage,
        temperament,
        aggressionDetails: temperament === "Aggressive" ? aggressionDetails : undefined,
        urineTrained,
        pottyTrained,
        checkInDate,
        checkOutDate,
        numDays,
        signatureDataUrl,
      });

      setBooking(createdBooking);
      refreshAvailability();
      if (typeof window !== "undefined") {
        localStorage.setItem("pawhaven_hostelling_booking", JSON.stringify(createdBooking));
      }

      // Submit liability release record to Supabase
      dbService
        .submitConsent({
          user_id: user?.id || null,
          full_name: parentName,
          email: parentEmail || "hostelling_guest@example.com",
          pet_id: null,
          pet_name: petName,
          liability_accepted: consentTerms,
          consent_given: consentTerms,
          signature_data_url: signatureDataUrl,
        })
        .catch((err) => {
          console.warn("Failed to record liability consent to DB:", err);
        });

      toast.success("Hostelling request and signed consent submitted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit hostelling request. Please try again.");
    }
  };

  const handleClearBooking = () => {
    setBooking(null);
    setPetName("");
    setPetBreed("");
    setPetAge("");
    setPetType("Dog");
    setHasMedical(false);
    setMedicalConditions("");
    setMedicalImage("");
    setTemperament("Friendly");
    setAggressionDetails("");
    setConsentTerms(false);
    setHasSigned(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("pawhaven_hostelling_booking");
    }
    setTimeout(() => {
      clearCanvas();
    }, 100);
  };

  return (
    <SiteLayout>
      {/* Banner / Header */}
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-accent">Hostelling</div>
        <h1 className="mt-2 font-display text-5xl lg:text-6xl max-w-3xl">Safe, warm lodging.</h1>
        <p className="mt-4 text-muted-foreground max-w-xl">
          Leave your pet in caring hands. Complete our medical intake form and sign the liability
          release forms below to request hostelling placement.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 my-16">
        {booking ? (
          /* Success Receipt */
          <div className="rounded-[2.5rem] bg-emerald-500/10 border-2 border-emerald-500/20 p-8 md:p-12 text-center space-y-6 shadow-soft animate-scale-in">
            <div className="mx-auto grid place-items-center h-16 w-16 rounded-full bg-emerald-500 text-white">
              <FiCheckCircle size={32} />
            </div>
            <h3 className="font-display text-3xl text-emerald-800 dark:text-emerald-400">
              Hostelling Stay Request Submitted!
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your hostelling stay intake and consent agreement are successfully registered. A
              hostelling coordinator will contact you shortly to confirm room availability.
            </p>

            <div className="bg-background rounded-3xl p-6 md:p-8 border border-border text-left space-y-6 max-w-2xl mx-auto shadow-sm">
              <div className="flex items-center gap-2 font-display text-xl font-bold border-b border-border pb-3 text-foreground">
                <FiFileText className="text-primary" /> Stay & Consent Receipt
              </div>

              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Parent Info
                  </h4>
                  <div>
                    Parent Name:{" "}
                    <span className="font-medium text-foreground">{booking.parentName}</span>
                  </div>
                  <div>
                    Email:{" "}
                    <span className="font-medium text-foreground">
                      {booking.parentEmail || "N/A"}
                    </span>
                  </div>
                  <div>
                    Phone:{" "}
                    <span className="font-medium text-foreground">{booking.parentPhone}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Pet Info
                  </h4>
                  <div>
                    Pet Name: <span className="font-medium text-foreground">{booking.petName}</span>
                  </div>
                  <div>
                    Type: <span className="font-medium text-foreground">{booking.petType}</span>
                  </div>
                  <div>
                    Breed: <span className="font-medium text-foreground">{booking.petBreed}</span>
                  </div>
                  <div>
                    Gender: <span className="font-medium text-foreground">{booking.petGender}</span>
                  </div>
                  <div>
                    Age: <span className="font-medium text-foreground">{booking.petAge}</span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 text-sm border-t border-border pt-4">
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Detailed Behavior & Health
                  </h4>
                  <div>
                    Temperament:{" "}
                    <span
                      className={`font-semibold ${booking.temperament === "Friendly" ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {booking.temperament} with other pets
                    </span>
                  </div>
                  {booking.temperament === "Aggressive" && booking.aggressionDetails && (
                    <div className="pl-4 border-l-2 border-amber-500 text-xs italic text-muted-foreground">
                      Triggers: {booking.aggressionDetails}
                    </div>
                  )}
                  <div>
                    Bathroom Trained:{" "}
                    <span className="font-medium text-foreground">
                      {booking.urineTrained && booking.pottyTrained
                        ? "Yes (Both Urine & Potty)"
                        : booking.urineTrained
                          ? "Only Urine"
                          : booking.pottyTrained
                            ? "Only Potty"
                            : "No"}
                    </span>
                  </div>
                  <div>
                    Medical Conditions:{" "}
                    <span className="text-foreground">{booking.medicalConditions}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Stay Details
                  </h4>
                  <div>
                    Check-in:{" "}
                    <span className="font-medium text-foreground">{booking.checkInDate}</span>
                  </div>
                  <div>
                    Check-out:{" "}
                    <span className="font-medium text-foreground">{booking.checkOutDate}</span>
                  </div>
                  <div>
                    Duration:{" "}
                    <span className="font-semibold text-primary">{booking.numDays} Days</span>
                  </div>
                  <div>
                    Rate:{" "}
                    <span className="font-medium text-foreground">
                      Up to ₹{booking.petType === "Dog" ? "1,100" : "900"} / Day
                    </span>
                  </div>
                  <div>
                    Estimated Total:{" "}
                    <span className="font-bold text-primary">₹{booking.price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {booking.medicalImage && (
                <div className="border-t border-border pt-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Uploaded Medical Specification
                  </h4>
                  <div className="max-w-xs rounded-2xl overflow-hidden border border-border shadow-sm">
                    <img
                      src={booking.medicalImage}
                      alt="Medical Specification"
                      className="w-full h-auto object-cover max-h-48"
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Liability Release & Digital Signature
                </h4>
                <div className="text-xs text-muted-foreground mb-3">
                  Submitted At: {booking.submittedAt}
                </div>
                <div className="border border-border/80 rounded-2xl bg-card p-3 h-24 flex justify-center items-center max-w-sm">
                  <img
                    src={booking.signatureDataUrl}
                    alt="Signature Representation"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleClearBooking}
              className="rounded-full bg-neutral-800 text-white hover:bg-neutral-900 transition px-8 py-3 text-sm font-semibold cursor-pointer shadow-md"
            >
              Submit New Hostelling Request
            </button>
          </div>
        ) : (
          /* Google-Form-Style Booking & Consent Intake */
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            {/* Styled header resemblance of Google Form style */}
            <div className="bg-primary rounded-t-3xl h-4 w-full shadow-sm" />
            {/* Title Card */}
            <div className="bg-card rounded-b-3xl border border-t-0 border-border p-8 shadow-sm">
              <h2 className="font-display text-4xl text-foreground">
                Hostelling Intake & Consent Agreement
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Please complete this comprehensive application and sign the mandatory liability
                consent at the bottom before checking in your pet for boarding. All questions marked
                with <span className="text-red-500">*</span> are compulsory.
              </p>
            </div>
            {/* 1. Parent & Pet Info Card */}
            <div className="bg-card border-l-8 border-primary border-y border-r border-border rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-display text-2xl text-foreground pb-2 border-b border-border">
                1. Parent & Pet Basics
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Parent Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Enter your full name"
                    className="border-b border-border/80 focus:border-primary bg-transparent outline-none py-2 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Parent Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="border-b border-border/80 focus:border-primary bg-transparent outline-none py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">
                  Parent Email Address
                </label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full sm:w-1/2 border-b border-border/80 focus:border-primary bg-transparent outline-none py-2 text-sm"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6 pt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Pet Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="e.g. Milo"
                    className="border-b border-border/80 focus:border-primary bg-transparent outline-none py-2 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Pet Breed <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                    placeholder="e.g. Labrador / Persian"
                    className="border-b border-border/80 focus:border-primary bg-transparent outline-none py-2 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Pet Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={petAge}
                    onChange={(e) => setPetAge(e.target.value)}
                    placeholder="e.g. 2 years / 6 months"
                    className="border-b border-border/80 focus:border-primary bg-transparent outline-none py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">
                  Pet Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  {(["Dog", "Cat"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPetType(t)}
                      className={`px-6 py-2 rounded-full border text-xs font-semibold transition cursor-pointer ${
                        petType === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Boarding Rate: {petType === "Dog" ? "Up to ₹1,100 / day" : "Up to ₹900 / day"}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">
                  Pet Gender <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  {(["Male", "Female"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setPetGender(g)}
                      className={`px-6 py-2 rounded-full border text-xs font-semibold transition cursor-pointer ${
                        petGender === g
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* 2. Pet Detailed Info Card */}
            <div className="bg-card border-l-8 border-primary border-y border-r border-border rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-display text-2xl text-foreground pb-2 border-b border-border">
                2. Detailed Behavioral & Medical Intake
              </h3>

              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasMedical}
                    onChange={(e) => {
                      setHasMedical(e.target.checked);
                      if (!e.target.checked) {
                        setMedicalConditions("");
                      }
                    }}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                  />
                  <span className="text-sm font-semibold text-foreground">
                    My pet has existing medical conditions
                  </span>
                </label>

                {hasMedical ? (
                  <div className="flex flex-col gap-1.5 animate-slide-down">
                    <label className="text-xs font-semibold text-muted-foreground">
                      List Medical Conditions *
                    </label>
                    <textarea
                      required={hasMedical}
                      value={medicalConditions}
                      onChange={(e) => setMedicalConditions(e.target.value)}
                      placeholder="List any chronic illness, allergies, daily medications, or routines..."
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

              {/* Medical Image Upload */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">
                  Medical Specification / Vet Document Upload
                </label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-6 bg-muted/20 hover:bg-muted/30 transition relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FiUploadCloud
                    size={36}
                    className="text-primary mb-2 group-hover:scale-110 transition-transform duration-300"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Click to upload prescription or vet record
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    PNG, JPG or JPEG up to 2MB
                  </span>
                </div>
                {medicalImage && (
                  <div className="mt-3 flex items-center gap-4 p-3 border border-border rounded-xl bg-background max-w-xs">
                    <img
                      src={medicalImage}
                      alt="Uploaded specification preview"
                      className="h-16 w-16 rounded-lg object-cover border border-border"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-emerald-600">Image Loaded</span>
                      <button
                        type="button"
                        onClick={() => setMedicalImage("")}
                        className="text-[10px] text-red-500 font-semibold hover:underline mt-1 cursor-pointer"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <label className="text-sm font-semibold text-foreground">
                  Behavioral Temperament <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  {(["Friendly", "Aggressive"] as const).map((temp) => (
                    <button
                      key={temp}
                      type="button"
                      onClick={() => {
                        setTemperament(temp);
                        if (temp === "Friendly") setAggressionDetails("");
                      }}
                      className={`px-6 py-2 rounded-full border text-xs font-semibold transition cursor-pointer ${
                        temperament === temp
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {temp === "Friendly"
                        ? "Friendly with other pets"
                        : "Aggressive / Prefers isolation"}
                    </button>
                  ))}
                </div>
              </div>

              {temperament === "Aggressive" && (
                <div className="flex flex-col gap-1.5 pt-2 animate-slide-down">
                  <label className="text-sm font-semibold text-foreground">
                    Aggression Details & Triggers <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required={temperament === "Aggressive"}
                    value={aggressionDetails}
                    onChange={(e) => setAggressionDetails(e.target.value)}
                    placeholder="Describe aggression triggers (e.g. food, leash, other dogs) or safety details..."
                    rows={3}
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <label className="text-sm font-semibold text-foreground">
                  Bathroom Training Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <label className="flex items-center gap-3 rounded-xl border border-border p-4 bg-background hover:bg-muted/10 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={urineTrained}
                      onChange={(e) => setUrineTrained(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                    />
                    <span className="text-xs font-semibold text-foreground/80">Urine Trained</span>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-border p-4 bg-background hover:bg-muted/10 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pottyTrained}
                      onChange={(e) => setPottyTrained(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                    />
                    <span className="text-xs font-semibold text-foreground/80">Potty Trained</span>
                  </label>
                </div>
              </div>
            </div>{" "}
            {/* 3. Stay Details Card */}
            <div className="bg-card border-l-8 border-primary border-y border-r border-border rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="font-display text-2xl text-foreground pb-2 border-b border-border">
                3. Stay Requirements
              </h3>

              {/* Interactive Date Range Calendar */}
              <div className="max-w-xl pb-4">
                <label className="text-sm font-semibold text-foreground block mb-3">
                  Select Check-in (Dropping off) and Check-out (Picking up) Dates
                </label>
                <BookingCalendar
                  mode="user"
                  selectionMode="range"
                  bookedDates={bookedDates}
                  dateCounts={dateCounts}
                  maxPerDay={5}
                  selectedStartDate={checkInDate}
                  selectedEndDate={checkOutDate}
                  onRangeSelect={(start, end) => {
                    setCheckInDate(start || "");
                    setCheckOutDate(end || "");
                    if (start && end) {
                      toast.success(
                        `Selected stay from ${new Date(start + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long" })} to ${new Date(end + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`
                      );
                    } else if (start) {
                      toast.info(`Selected check-in date: ${new Date(start + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long" })}. Now select check-out date.`);
                    }
                  }}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Check-in Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="border-b border-border/80 focus:border-primary bg-transparent outline-none py-2 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    Check-out Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="border-b border-border/80 focus:border-primary bg-transparent outline-none py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">
                  Duration of Hostelling Stay (Days)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={numDays}
                    onChange={(e) => setNumDays(Number(e.target.value))}
                    className="w-24 rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <span className="text-xs text-muted-foreground">
                    calculated automatically from dates
                  </span>
                </div>
              </div>

              {/* Pricing breakdown estimation */}
              <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 mt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Daily Boarding Rate:</span>
                  <span className="font-semibold text-foreground">Up to ₹{dailyRate} / day</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-muted-foreground font-medium">Duration:</span>
                  <span className="font-semibold text-foreground">{numDays} {numDays === 1 ? "day" : "days"}</span>
                </div>
                <div className="border-t border-border/50 my-3" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">Estimated Total Charge:</span>
                  <span className="font-extrabold text-lg text-primary">Up to ₹{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
            {/* 4. Compulsory Liability Consent Card */}
            <div className="bg-card border-l-8 border-primary border-y border-r border-border rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-display text-2xl text-foreground pb-2 border-b border-border">
                4. Liability Release & Consent <span className="text-red-500">*</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By checking the authorization agreement below, you authorize WOOLF.INDIA, its
                hostellers, and caretaking assistants to perform boarding services for your pet
                companion. You release WOOLF.INDIA from liability for any unexpected health
                developments, illness, injury, or behavioral shifts. You confirm that all medical
                declarations above are accurate.
              </p>
              <label className="flex items-start gap-3 cursor-pointer mt-3 select-none">
                <input
                  type="checkbox"
                  checked={consentTerms}
                  onChange={(e) => setConsentTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary bg-background"
                />
                <span className="text-xs text-foreground/80 font-semibold">
                  I agree and authorize professional hostelling and boarding services for my pet
                  companion under the terms described.{" "}
                  <span className="text-red-500">(Compulsory)</span>
                </span>
              </label>
            </div>
            {/* Virtual Sign Canvas Card */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
              <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <FiPenTool className="text-primary" /> Draw Virtual Signature{" "}
                <span className="text-red-500">*</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Please sign within the box below using your mouse or touch screen. This is required.
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

              <div className="flex justify-between items-center pt-2 flex-wrap gap-4">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="rounded-full border border-border px-5 py-2.5 text-xs font-semibold hover:bg-muted transition flex items-center gap-1.5 cursor-pointer text-muted-foreground"
                >
                  <FiRefreshCw size={12} className="animate-spin-hover" /> Clear Signature
                </button>

                <button
                  type="submit"
                  className="rounded-full bg-primary text-primary-foreground hover:opacity-90 transition px-8 py-3 text-sm font-bold shadow-md cursor-pointer"
                >
                  Sign & Submit Hostelling Request
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </SiteLayout>
  );
}
