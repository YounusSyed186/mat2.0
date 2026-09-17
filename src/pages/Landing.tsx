import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  HeartHandshake,
  LockKeyhole,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const logoSrc = "/Vivaah vedika.png";
const heroImage =
  "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&fm=jpg&q=86&w=1600";
const detailImage =
  "https://images.unsplash.com/photo-1501901609772-df0848060b33?auto=format&fit=crop&fm=jpg&q=84&w=900";

const trustStats = [
  { value: "Privacy", label: "first introductions", icon: LockKeyhole },
  { value: "AI", label: "compatibility search", icon: Bot },
  { value: "Verified", label: "profile signals", icon: ShieldCheck },
];

const journeySteps = [
  {
    title: "Create a profile with substance",
    description: "Share values, family context, education, profession, and the kind of future you are ready to build.",
    icon: UserCheck,
  },
  {
    title: "Discover better aligned people",
    description: "Browse with focused filters, AI-assisted search, and match reasons that make the shortlist clearer.",
    icon: Search,
  },
  {
    title: "Send interest when it feels right",
    description: "Move from discovery to mutual interest with a calm flow that protects both sides from noise.",
    icon: HeartHandshake,
  },
  {
    title: "Talk in a safer space",
    description: "Chat only after interest is accepted, with reporting, blocking, and privacy controls close at hand.",
    icon: MessageCircle,
  },
];

const features = [
  "Smart filters for age, city, religion, education, and profession",
  "AI Match for natural-language partner discovery",
  "Profile optimizer that improves clarity and conversion",
  "Mutual-interest messaging with safety controls",
];

const testimonials = [
  {
    quote:
      "Vivaah Vedika felt intentional from the first profile. We understood values and expectations before starting a conversation.",
    name: "Aarav & Meera",
    detail: "Matched through shared city and values",
  },
  {
    quote:
      "The prompts helped me write honestly, and the people I met were looking for the same long-term clarity.",
    name: "Nisha",
    detail: "Used profile optimizer",
  },
  {
    quote:
      "Interest before chat made the whole experience feel calmer and more respectful.",
    name: "Rahul",
    detail: "Used smart filters and AI Match",
  },
];

function MotionBlock({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={className}
    >
      {children}
    </section>
  );
}

function Logo() {
  return (
    <Link to="/" className="flex min-w-0 items-center" aria-label="Vivaah Vedika home">
      <img
        src="/Vivaah vedika.png"
        alt="Vivaah Vedika"
        className="h-11 sm:h-12 w-auto max-w-[240px] object-contain transition-transform duration-200 hover:scale-105"
      />
    </Link>
  );
}

function HeroPreview() {
  return (
    <div
      className="relative mx-auto mt-9 aspect-[0.82] w-full max-w-sm sm:aspect-[1.03] sm:max-w-2xl lg:mt-0 lg:max-w-none"
    >
      <img
        src={heroImage}
        alt="Wedding couple celebrating a meaningful beginning"
        className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-[0_34px_90px_rgba(15,23,42,0.24)] sm:rounded-lg"
      />
      <div className="absolute inset-0 rounded-xl bg-[linear-gradient(180deg,rgba(10,14,28,0.04),rgba(10,14,28,0.48))] sm:rounded-lg" />

      <div className="premium-card absolute left-4 right-4 top-4 rounded-xl p-3 sm:left-6 sm:right-auto sm:w-72">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-950 dark:text-white">AI shortlist ready</p>
            <p className="truncate text-xs text-muted-foreground">6 high-signal profiles found</p>
          </div>
        </div>
      </div>

      <div className="premium-card absolute bottom-4 left-4 right-4 rounded-xl p-4 sm:bottom-6 sm:left-auto sm:w-80">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Compatibility</p>
            <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">Values, city, intent</p>
          </div>
          <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-700 dark:text-teal-200">
            94%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Family", "Career", "Culture"].map((item) => (
            <span key={item} className="rounded-full bg-slate-950/5 px-2.5 py-2 text-center text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-white/80">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="premium-shell-bg min-h-screen overflow-x-hidden text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-xl border border-white/70 bg-white/72 px-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 dark:text-white/70 md:flex">
            <a href="#journey" className="hover:text-primary">How it works</a>
            <a href="#features" className="hover:text-primary">Features</a>
            <a href="#stories" className="hover:text-primary">Stories</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden rounded-full px-4 sm:inline-flex">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="premium-cta rounded-full px-4 font-bold shadow-none">
              <Link to="/signup">Join</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-24 lg:pt-32">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div>
              <Badge className="rounded-full border-primary/15 bg-white/72 px-3 py-1.5 text-primary shadow-sm hover:bg-white/72 dark:bg-white/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Premium matchmaking for serious intent
              </Badge>
              <h1 className="premium-gradient-text mt-5 max-w-4xl font-serif text-[3.2rem] font-bold leading-[0.94] sm:text-7xl lg:text-[5.8rem]">
                Meet with clarity, not endless scrolling.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 dark:text-white/70 sm:text-lg">
                Vivaah Vedika blends thoughtful matrimonial profiles, safer mutual-interest messaging,
                and AI-assisted discovery into one elegant path toward a meaningful match.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="premium-cta h-12 rounded-full px-7 text-base font-bold shadow-none">
                  <Link to="/signup">
                    Create your profile
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full bg-white/60 px-7 text-base font-bold shadow-none backdrop-blur dark:bg-white/5">
                  <Link to="/login">I already have an account</Link>
                </Button>
              </div>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                {trustStats.map(({ value, label, icon: Icon }) => (
                  <div key={label} className="premium-card rounded-lg p-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="mt-3 text-sm font-black">{value}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <HeroPreview />
          </div>
        </section>

        <MotionBlock id="journey" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Flow</p>
              <h2 className="mt-3 font-serif text-4xl font-bold leading-tight sm:text-5xl">
                A cleaner path from profile to conversation.
              </h2>
            </div>
            <div className="mt-9 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {journeySteps.map(({ title, description, icon: Icon }, index) => (
                <article key={title} className="premium-card rounded-xl p-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-serif text-3xl font-bold text-slate-950/12 dark:text-white/12">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-black">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </MotionBlock>

        <MotionBlock id="features" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-lg bg-slate-950 text-white shadow-[0_32px_90px_rgba(15,23,42,0.25)] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-6 sm:p-10 lg:p-12">
              <Badge className="rounded-full bg-white/10 text-white hover:bg-white/10">
                <Star className="mr-1.5 h-3.5 w-3.5 fill-current" />
                Built for trust and conversion
              </Badge>
              <h2 className="mt-5 font-serif text-4xl font-bold leading-tight sm:text-5xl">
                Premium tools for serious introductions.
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-white/68">
                Every interaction reduces uncertainty: strong profile context, focused discovery,
                AI guidance, and controlled messaging after mutual interest.
              </p>
              <Button asChild className="mt-8 rounded-full bg-white px-6 font-bold text-slate-950 hover:bg-white/90">
                <Link to="/signup">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="relative min-h-[420px] p-4 sm:p-6">
              <img
                src={detailImage}
                alt="Couple holding hands during a quiet moment"
                className="h-full min-h-[420px] w-full rounded-xl object-cover"
              />
              <div className="absolute inset-x-8 bottom-8 rounded-xl border border-white/15 bg-slate-950/62 p-4 backdrop-blur-xl">
                <div className="grid gap-3 sm:grid-cols-2">
                  {features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
                      <p className="text-sm leading-6 text-white/84">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MotionBlock>

        <MotionBlock id="stories" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Stories</p>
                <h2 className="mt-3 font-serif text-4xl font-bold leading-tight sm:text-5xl">
                  Designed for introductions with meaning.
                </h2>
              </div>
              <Button asChild variant="outline" className="w-fit rounded-full bg-white/60 px-5 shadow-none backdrop-blur dark:bg-white/5">
                <Link to="/signup">Create your story</Link>
              </Button>
            </div>
            <div className="mt-9 grid gap-3 md:grid-cols-3">
              {testimonials.map(({ quote, name, detail }) => (
                <article key={name} className="premium-card rounded-xl p-5">
                  <div className="flex gap-1 text-primary">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-5 text-sm leading-7 text-muted-foreground">"{quote}"</p>
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="font-black">{name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </MotionBlock>

        <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-lg bg-[linear-gradient(135deg,#e11d48,#f59e0b)] p-6 text-white shadow-[0_32px_90px_rgba(225,29,72,0.25)] sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/76">Begin when you are ready</p>
                <h2 className="mt-3 max-w-3xl font-serif text-4xl font-bold leading-tight sm:text-5xl">
                  Build a profile that helps the right person recognize you.
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button asChild size="lg" className="h-12 rounded-full bg-white px-7 font-bold text-slate-950 hover:bg-white/90">
                  <Link to="/signup">Start now</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/30 bg-white/10 px-7 font-bold text-white shadow-none hover:bg-white/16 hover:text-white">
                  <Link to="/login">Login</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
