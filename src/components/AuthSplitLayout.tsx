import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const logoSrc = "/vivah-logo.png";
const authVisualSlides = [
  {
    src: "https://images.unsplash.com/photo-1756376748107-12c98ec6b969?auto=format&fit=crop&fm=jpg&q=85&w=1600",
    alt: "Indian wedding couple in traditional attire",
    credit: "Suresh Chavan",
    detail: "Wedding portrait",
    objectPosition: "50% 40%",
  },
  {
    src: "https://images.unsplash.com/photo-1501901609772-df0848060b33?auto=format&fit=crop&fm=jpg&q=85&w=1600",
    alt: "Couple holding hands outdoors",
    credit: "Unsplash",
    detail: "Connection story",
    objectPosition: "50% 50%",
  },
  {
    src: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&fm=jpg&q=85&w=1600",
    alt: "Newly married couple celebrating",
    credit: "Unsplash",
    detail: "Marriage moment",
    objectPosition: "50% 50%",
  },
  {
    src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&fm=jpg&q=85&w=1600",
    alt: "Wedding couple in a romantic setting",
    credit: "Unsplash",
    detail: "Shared beginning",
    objectPosition: "50% 44%",
  },
] as const;

interface AuthSplitLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  eyebrow?: string;
  actionLabel?: string;
  actionHref?: string;
  actionButtonLabel?: string;
  visualKicker?: string;
  visualTitle?: string;
  visualSubtitle?: string;
  visualMeta?: string;
  visualCredit?: string;
  visualCreditDetail?: string;
  wide?: boolean;
  contentClassName?: string;
}

export function AuthSplitLayout({
  children,
  title,
  subtitle,
  eyebrow = "Welcome to Vivah",
  actionLabel,
  actionHref,
  actionButtonLabel,
  visualKicker = "Selected Stories",
  visualTitle = "Begin with trust, stay for the connection.",
  visualSubtitle = "A calm space for families and individuals to meet with intention.",
  visualMeta = "Curated matches",
  visualCredit = "Suresh Chavan",
  visualCreditDetail = "Wedding portrait",
  wide = false,
  contentClassName,
}: AuthSplitLayoutProps) {
  const [activeVisualIndex, setActiveVisualIndex] = useState(0);
  const activeVisual = authVisualSlides[activeVisualIndex];
  const activeVisualCredit = visualCredit ?? activeVisual.credit;
  const activeVisualDetail = visualCreditDetail ?? activeVisual.detail;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveVisualIndex((current) => (current + 1) % authVisualSlides.length);
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, []);

  const showPreviousVisual = () => {
    setActiveVisualIndex((current) =>
      current === 0 ? authVisualSlides.length - 1 : current - 1
    );
  };

  const showNextVisual = () => {
    setActiveVisualIndex((current) => (current + 1) % authVisualSlides.length);
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-card p-0 text-foreground lg:bg-[#eeeeed] lg:px-[0.5vw] lg:py-[0.5dvh]">
      <div
        className={cn(
          "relative mx-auto grid h-full min-h-0 w-full max-w-none overflow-hidden rounded-none bg-card shadow-none lg:rounded-[32px] lg:shadow-[0_32px_90px_rgba(49,39,35,0.18)]",
          wide
            ? "lg:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.22fr)]"
            : "lg:grid-cols-[minmax(0,1.02fr)_minmax(410px,0.98fr)]"
        )}
      >
        <aside className="relative hidden min-h-0 overflow-hidden bg-[#130d11] lg:block">
          {authVisualSlides.map((slide, index) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-1000 ease-out",
                index === activeVisualIndex
                  ? "scale-100 opacity-100"
                  : "scale-[1.03] opacity-0"
              )}
              style={{ objectPosition: slide.objectPosition }}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              aria-hidden={index !== activeVisualIndex}
            />
          ))}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,10,0.58),rgba(10,8,10,0.14)_42%,rgba(10,8,10,0.76))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_32%)]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white xl:p-10">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-bold tracking-wide">{visualKicker}</p>
              <div className="flex items-center gap-3 text-xs font-semibold">
                {actionHref && actionLabel && (
                  <Link to={actionHref} className="text-white/82 transition-colors hover:text-white">
                    {actionLabel}
                  </Link>
                )}
                {actionHref && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full border-white/70 bg-white/8 px-5 text-white shadow-none backdrop-blur hover:bg-white/14"
                  >
                    <Link to={actionHref}>{actionButtonLabel ?? actionLabel}</Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="max-w-sm">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                {visualMeta}
              </div>
              <h2 className="text-4xl font-black leading-tight tracking-normal xl:text-5xl">{visualTitle}</h2>
              <p className="mt-4 max-w-xs text-sm leading-6 text-white/78">{visualSubtitle}</p>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-lg">
                  <HeartHandshake className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-bold">{activeVisualCredit}</p>
                  <p className="text-xs text-white/72">{activeVisualDetail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="mr-1 flex items-center gap-1.5" aria-label="Visual slides">
                  {authVisualSlides.map((slide, index) => (
                    <button
                      key={slide.src}
                      type="button"
                      onClick={() => setActiveVisualIndex(index)}
                      className={cn(
                        "h-1.5 rounded-full bg-white/42 transition-all hover:bg-white/80",
                        index === activeVisualIndex ? "w-6 bg-white" : "w-1.5"
                      )}
                      aria-label={`Show slide ${index + 1}`}
                      aria-current={index === activeVisualIndex}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={showPreviousVisual}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/8 text-white backdrop-blur transition-colors hover:bg-white/16"
                  aria-label="Previous story"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={showNextVisual}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/8 text-white backdrop-blur transition-colors hover:bg-white/16"
                  aria-label="Next story"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-card">
          <div className="relative h-44 overflow-hidden lg:hidden">
            {authVisualSlides.map((slide, index) => (
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-1000 ease-out",
                  index === activeVisualIndex
                    ? "scale-100 opacity-100"
                    : "scale-[1.03] opacity-0"
                )}
                style={{ objectPosition: slide.objectPosition }}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                aria-hidden={index !== activeVisualIndex}
              />
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,12,0.22),rgba(12,10,12,0.66))]" />
            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/72">{visualKicker}</p>
                <p className="mt-1 text-lg font-black">{visualMeta}</p>
              </div>
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>

          <header className="flex shrink-0 items-center justify-between gap-4 px-6 py-5 sm:px-10 lg:px-12">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5">
                <img
                  src={logoSrc}
                  alt="Vivah"
                  className="h-full w-full rounded-lg object-cover"
                  style={{ objectPosition: "50% 40%" }}
                />
              </span>
              <span className="truncate font-serif text-2xl font-bold text-foreground">Vivah</span>
            </Link>

            {actionHref && actionLabel && (
              <Button asChild variant="outline" size="sm" className="rounded-full px-4 shadow-none">
                <Link to={actionHref}>{actionLabel}</Link>
              </Button>
            )}
          </header>

          <main className="flex min-h-0 min-w-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-10 lg:px-12">
            <div
              className={cn(
                "mx-auto flex w-full flex-1 flex-col justify-center py-4",
                wide ? "max-w-[780px]" : "max-w-md",
                contentClassName
              )}
            >
              <div className="mb-8 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
                <h1 className="mt-3 text-4xl font-black leading-tight tracking-normal text-foreground sm:text-5xl">
                  {title}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{subtitle}</p>
              </div>
              {children}
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
