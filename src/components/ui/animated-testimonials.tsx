"use client";

import { IconArrowLeft, IconArrowRight, IconUser } from "@tabler/icons-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";

type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  src: string;
  id?: string;
};
export const AnimatedTestimonials = ({
  testimonials,
  autoplay = false,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
}) => {
  const [active, setActive] = useState(0);
  const total = testimonials.length;

  const handleNext = () => {
    setActive((prev) => (total ? (prev + 1) % total : 0));
  };

  const handlePrev = () => {
    setActive((prev) => (total ? (prev - 1 + total) % total : 0));
  };

  useEffect(() => {
    setActive(0);
  }, [total]);

  useEffect(() => {
    if (!autoplay || total < 2) return;

    const interval = window.setInterval(() => {
      setActive((prev) => (prev + 1) % total);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [autoplay, total]);

  if (!total) return null;

  const current = testimonials[Math.min(active, total - 1)];

  return (
    <div className="mx-auto max-w-sm px-4 py-10 font-sans antialiased md:max-w-4xl md:px-8 lg:px-10">
      <div className="relative grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-muted md:h-80">
            <img
              key={current.src}
              src={current.src}
              alt={current.name}
              width={500}
              height={500}
              draggable={false}
              loading="lazy"
              decoding="async"
              className="h-full w-full animate-soft-enter object-cover object-center"
            />
          </div>
        </div>
        <div className="flex flex-col justify-between py-4">
          <div key={current.id ?? current.src} className="animate-soft-enter">
            <h3 className="text-2xl font-bold text-black dark:text-white">
              {current.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-neutral-500">
              {current.designation}
            </p>
            <p className="mt-6 text-base leading-relaxed text-gray-500 dark:text-neutral-300">
              {current.quote}
            </p>
            {current.id && (
              <div className="mt-8">
                <Button asChild className="pressable gap-2 rounded-full shadow-md">
                  <Link href={`/user/${current.id}`}>
                    <IconUser className="w-4 h-4" /> View Full Profile
                  </Link>
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-8 md:pt-0">
            <button
              onClick={handlePrev}
              disabled={total < 2}
              className="pressable group/button flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800"
            >
              <IconArrowLeft className="h-5 w-5 text-black dark:text-neutral-400" />
            </button>
            <button
              onClick={handleNext}
              disabled={total < 2}
              className="pressable group/button flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800"
            >
              <IconArrowRight className="h-5 w-5 text-black dark:text-neutral-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
