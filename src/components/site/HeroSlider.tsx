import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowRight, FiVolumeX, FiVolume2, FiShield } from "react-icons/fi";
import { dbService } from "@/services/db-service";
import { Skeleton } from "@/components/ui/skeleton";

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = right, -1 = left
  const [muted, setMuted] = useState(true);

  const { data: pets, isLoading } = useQuery({
    queryKey: ["pets"],
    queryFn: () => dbService.getPets(),
  });

  // Filter pets that have images
  const sliderPets = pets?.filter(p => p.image_url) || [];

  const handleNext = () => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % sliderPets.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + sliderPets.length) % sliderPets.length);
  };

  useEffect(() => {
    if (sliderPets.length <= 1) return;

    const currentPet = sliderPets[index];

    // If the slide is a video, let it play to completion. We transition on video ended.
    if (currentPet.video_url) {
      // Safety timeout: 30s max duration in case video loads forever or gets stuck
      const safetyTimer = setTimeout(() => {
        handleNext();
      }, 30000);
      return () => clearTimeout(safetyTimer);
    }

    // Static images transition after 2 seconds
    const timer = setTimeout(() => {
      handleNext();
    }, 2000);

    return () => clearTimeout(timer);
  }, [index, sliderPets.length]);

  if (isLoading) {
    return <Skeleton className="w-full aspect-[4/3] rounded-[2.5rem] shadow-soft" />;
  }

  if (sliderPets.length === 0) {
    return (
      <div className="w-full aspect-[4/3] rounded-[2.5rem] bg-accent/20 flex items-center justify-center text-muted-foreground border border-dashed border-border">
        No pets available for the showcase.
      </div>
    );
  }

  const currentPet = sliderPets[index];

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] shadow-soft w-full aspect-[4/3] bg-card border border-border group">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentPet.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.5 },
          }}
          className="absolute inset-0 w-full h-full"
        >
          {currentPet.video_url ? (
            <div className="relative w-full h-full">
              <video
                src={currentPet.video_url}
                autoPlay
                muted={muted}
                playsInline
                onEnded={handleNext}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setMuted(!muted)}
                className="absolute bottom-4 right-4 z-20 bg-background/80 hover:bg-background text-foreground rounded-full p-2 text-sm backdrop-blur transition shadow-sm"
              >
                {muted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
              </button>
            </div>
          ) : (
            <motion.img
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 5 }}
              src={currentPet.image_url}
              alt={currentPet.name}
              className="w-full h-full object-cover"
            />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />

          {/* Info Card Overlay */}
          <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="text-white drop-shadow-md">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/80 backdrop-blur text-xs font-semibold text-primary-foreground mb-2">
                Featured Companion
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight">
                {currentPet.name}
              </h2>
              <p className="text-white/80 text-sm mt-1 font-medium">
                {currentPet.breed} • {currentPet.age}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Individual Price Section Bar */}
              <div className="bg-black/45 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 flex items-center gap-2">
                {currentPet.adoption ? (
                  <span className="text-emerald-300 font-display text-lg font-semibold tracking-wider">
                    Free Adoption
                  </span>
                ) : (
                  <span className="text-primary-foreground font-display text-xl font-bold">
                    ₹{Number(currentPet.price).toFixed(0)}
                  </span>
                )}
              </div>

              <Link
                to="/pets/$petId"
                params={{ petId: currentPet.id }}
                className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-white text-black hover:bg-primary hover:text-white transition-all transform hover:scale-105 shadow-lg"
                aria-label={`View details of ${currentPet.name}`}
              >
                <FiArrowRight size={20} />
              </Link>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Manual Slider Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-background/30 hover:bg-background/80 text-white hover:text-foreground flex items-center justify-center backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        aria-label="Previous pet"
      >
        &#8592;
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-background/30 hover:bg-background/80 text-white hover:text-foreground flex items-center justify-center backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        aria-label="Next pet"
      >
        &#8594;
      </button>

      {/* Slide Indicators / Dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 bg-black/35 backdrop-blur px-3 py-1.5 rounded-full">
        {sliderPets.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setDirection(i > index ? 1 : -1);
              setIndex(i);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === i ? "w-4 bg-white" : "w-1.5 bg-white/55 hover:bg-white"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
