import Link from "next/link";
import { EarnlyMark } from "@/components/AppShell";
import { Faq } from "@/components/landing/Faq";
import { PayoutRails } from "@/components/landing/Payout";
import { EarningProducts } from "@/components/landing/Products";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Testimonials } from "@/components/landing/Testimonials";
import { Button, Icon, Money, Stars, Tag, VerifiedBadge } from "@/components/ui";
import { CATEGORIES, COMING_SOON, DEMO_REVIEWS } from "@/lib/data";

const STEPS = [
  {
    n: "01",
    t: "Verify",
    d: "Confirm you are a student with your school, student email and ID. One check, then the badge stays on your profile.",
    icon: "shield",
  },
  {
    n: "02",
    t: "Find opportunities",
    d: "Paid tasks, part-time jobs and internships, matched to your skills, your campus and the hours you actually have free.",
    icon: "search",
  },
  {
    n: "03",
    t: "Work and earn",
    d: "Do the work, submit it in Earnly, and get paid when it is approved — into the Stellar or Ethereum wallet you picked. Both sides see the same record.",
    icon: "wallet",
  },
  {
    n: "04",
    t: "Build your profile",
    d: "Every finished job adds a rating, a review and a line of experience. You graduate with proof, not an empty CV.",
    icon: "chart",
  },
];

const SOON = [
  { key: "marketplace", icon: "cart" },
  { key: "scholarships", icon: "cap" },
  { key: "social", icon: "users" },
  { key: "offramp", icon: "bank" },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* -------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-40 border-b border-rule bg-ground/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <EarnlyMark size={28} />
            <span className="display-tight text-[20px]">Earnly</span>
          </Link>
          <nav className="ml-8 hidden items-center gap-7 whitespace-nowrap text-[13.5px] font-semibold text-ink2 lg:flex">
            <a href="#how" className="hover:text-ink">
              How it works
            </a>
            <a href="#work" className="hover:text-ink">
              Work
            </a>
            <a href="#payout" className="hover:text-ink">
              Get paid
            </a>
            <a href="#products" className="hover:text-ink">
              Earn more
            </a>
            <a href="#reputation" className="hover:text-ink">
              Reputation
            </a>
            <a href="#ai" className="hover:text-ink">
              AI finder
            </a>
            <a href="#faq" className="hover:text-ink">
              FAQ
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button href="/signin" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Sign in
            </Button>
            <Button href="/signin" size="sm">
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid grid-cols-1 max-w-[1240px] items-center gap-10 px-5 py-12 lg:grid-cols-[1fr_1.05fr] lg:py-20">
          <div className="rise">
            <div className="flex flex-wrap items-center gap-2">
              <VerifiedBadge label="Verified students only" />
              <Tag tone="quiet">Paid in USDC</Tag>
            </div>
            <h1 className="display mt-6 text-[42px] leading-[.94] sm:text-[62px] lg:text-[68px]">
              Earn while
              <br />
              you learn.
            </h1>
            <p className="mt-5 max-w-[52ch] text-[16px] font-semibold text-ink sm:text-[17px]">
              Build experience before you graduate.
            </p>
            <p className="mt-3 max-w-[56ch] text-[14.5px] leading-relaxed text-ink2">
              Earnly connects verified students with businesses, staff and neighbours who need
              something done. Real paid tasks, real jobs, real internships — and a record of the work
              that follows you to your first interview. Pay settles on-chain to a Stellar or
              Ethereum wallet created with your account.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button href="/signin" size="lg" iconRight="arrowRight">
                Get started
              </Button>
              <Button href="/app/tasks" size="lg" variant="outline">
                Explore opportunities
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-rule pt-6">
              {[
                { icon: "badge", t: "Student-verified" },
                { icon: "wallet", t: "Stellar & Ethereum payouts" },
                { icon: "star", t: "Ratings that mean work" },
              ].map((f) => (
                <span key={f.t} className="inline-flex items-center gap-2 text-[13px] text-ink2">
                  <span className="text-accentx">
                    <Icon name={f.icon} size={16} />
                  </span>
                  {f.t}
                </span>
              ))}
            </div>
          </div>

          {/* hero collage: the campus photo with the product hung over it */}
          <div className="relative">
            <div className="tagshape-r relative overflow-hidden border border-rule">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/hero-campus.jpg"
                alt="A university campus building with the path leading up to it"
                className="h-[320px] w-full object-cover grayscale-[.35] contrast-[1.05] sm:h-[420px] lg:h-[500px]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[#0B1020] opacity-[.42] mix-blend-multiply"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-tr from-[#0B1020] via-transparent to-[#FFB020] opacity-[.45] mix-blend-overlay"
              />
              <div className="absolute left-5 top-5">
                <span className="rounded-full bg-black/40 px-3 py-1.5 text-[11.5px] font-semibold text-white backdrop-blur">
                  University of Toronto · Wednesday
                </span>
              </div>

              {/* floating opportunity tag */}
              <div className="settle absolute right-4 top-16 w-[210px] rounded-[18px] rounded-tr-[3px] border border-white/15 bg-[#0B1020]/85 p-3.5 backdrop-blur sm:right-6 sm:w-[236px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#FFB020]">
                    Best match
                  </span>
                  <span className="figure rounded-full bg-[#FFB020] px-2 py-0.5 text-[10.5px] font-bold text-[#17120A]">
                    92%
                  </span>
                </div>
                <div className="mt-2 text-[13.5px] font-bold leading-snug text-white">
                  Need a React developer for a landing page
                </div>
                <div className="mt-1.5 text-[11.5px] text-white/60">Remote · fixed</div>
                <div className="mt-2.5 flex items-end justify-between">
                  <span className="figure text-[16px] font-bold text-[#7CE0A6]">150.00</span>
                  <span className="text-[10.5px] font-semibold text-white/50">USDC</span>
                </div>
              </div>

              {/* floating student chip */}
              <div className="settle absolute bottom-5 left-4 flex items-center gap-3 rounded-[18px] rounded-bl-[3px] border border-white/15 bg-[#0B1020]/85 p-3 backdrop-blur sm:left-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/img/avatar-1.jpg"
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-bold text-white">Amara O.</span>
                    <span className="text-[#FFB020]">
                      <Icon name="badge" size={13} filled />
                    </span>
                  </div>
                  <div className="text-[10.5px] text-white/60">Computer Science · 2027</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Stars value={4.9} size={11} />
                    <span className="text-[10.5px] text-white/60">18 done</span>
                  </div>
                </div>
              </div>
            </div>

            {/* the path underneath: quiet proof */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { k: "Students verified", v: "2,480" },
                { k: "Paid out in USDC", v: "184k" },
                { k: "Opportunities open", v: "312" },
              ].map((s) => (
                <div key={s.k} className="tagshape border border-rule bg-raised px-4 py-3">
                  <div className="figure text-[17px] font-bold">{s.v}</div>
                  <div className="mt-0.5 text-[11px] text-ink3">{s.k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- how it works */}
      <section id="how" className="border-t border-rule">
        <div className="mx-auto max-w-[1240px] px-5 py-16">
          <span className="eyebrow">The loop</span>
          <h2 className="display mt-3 max-w-[24ch] text-[32px] sm:text-[44px]">
            Verify, find, work, get paid, build reputation.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="tagshape border border-rule bg-raised p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-accentx">
                    <Icon name={s.icon} size={19} />
                  </span>
                  <span className="figure text-[13px] text-ink3">{s.n}</span>
                </div>
                <h3 className="mt-4 text-[17px] font-bold">{s.t}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink2">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PayoutRails />

      {/* --------------------------------------------------------- categories */}
      <section id="work" className="border-t border-rule">
        <div className="mx-auto max-w-[1240px] px-5 py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <span className="eyebrow">What students actually do</span>
              <h2 className="display mt-3 text-[32px] sm:text-[44px]">
                Digital work and real-world work, in one place.
              </h2>
              <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-ink2">
                A landing page for a shop two streets from campus and a Saturday of helping someone
                move are both paid work, and both build the same record. Earnly is built for the
                student who does a bit of everything, in any city.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Tag tone="accent">Digital</Tag>
                <Tag tone="positive">Local</Tag>
                <Tag tone="quiet">Remote</Tag>
                <Tag tone="quiet">On campus</Tag>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-rule bg-raised px-3.5 py-2 text-[13px] font-medium text-ink2"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                t: "Paid tasks",
                d: "Small jobs that finish in a day or a week: a landing page, a photoshoot, an afternoon of tutoring, a delivery run.",
                pay: "From $15",
                href: "/app/tasks",
                icon: "layers",
              },
              {
                t: "Jobs",
                d: "Part-time and campus roles with a fixed weekly pattern, so a semester can be planned around them.",
                pay: "From $60/week",
                href: "/app/jobs",
                icon: "briefcase",
              },
              {
                t: "Internships",
                d: "Three to six months inside a company with a mentor. The placements that turn into a graduate offer.",
                pay: "From $250/month",
                href: "/app/internships",
                icon: "cap",
              },
              {
                t: "AI finder",
                d: "Describe what you can do and where you will travel. Earnly ranks what fits and explains why.",
                pay: "Free to use",
                href: "/app/ai",
                icon: "ai",
              },
            ].map((c) => (
              <Link
                key={c.t}
                href={c.href}
                className="tagshape group border border-rule bg-raised p-6 transition-transform duration-200 hover:-translate-y-1 hover:hard-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-ink/6 text-ink">
                    <Icon name={c.icon} size={19} />
                  </span>
                  <span className="text-[12px] font-bold text-accentx">{c.pay}</span>
                </div>
                <h3 className="display-tight mt-4 text-[21px]">{c.t}</h3>
                <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-ink2">{c.d}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink2 group-hover:text-ink">
                  Look inside
                  <Icon name="arrowRight" size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- reputation */}
      <section id="reputation" className="border-t border-rule">
        <div className="mx-auto max-w-[1240px] px-5 py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <span className="eyebrow">Reputation</span>
              <h2 className="display mt-3 max-w-[22ch] text-[32px] sm:text-[44px]">
                Not a score. A record of work.
              </h2>
              <p className="mt-4 max-w-[56ch] text-[14.5px] leading-relaxed text-ink2">
                Ratings on Earnly come from a poster after the work is paid, so they cannot be
                farmed. Your profile ends up as a portfolio, a set of reviews and a completion rate
                that an employer can check in one link.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { k: "Average rating", v: "4.9" },
                  { k: "Completed work", v: "18" },
                  { k: "Completion rate", v: "96%" },
                  { k: "Earned", v: "1,240" },
                ].map((s) => (
                  <div key={s.k} className="tagshape border border-rule bg-raised px-4 py-3">
                    <div className="figure text-[22px] font-bold">{s.v}</div>
                    <div className="mt-1 text-[11px] text-ink3">{s.k}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {DEMO_REVIEWS.slice(0, 2).map((r) => (
                <article key={r.id} className="tagshape border border-rule bg-raised p-5">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-bold">{r.author}</div>
                      <div className="text-[11.5px] text-ink3">{r.ago}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Stars value={r.rating} />
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink2">{r.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- AI */}
      <section id="ai" className="border-t border-rule">
        <div className="mx-auto max-w-[1240px] px-5 py-16">
          <div className="tagshape relative overflow-hidden border border-rule bg-ink p-8 text-ground sm:p-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
            />
            <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-onaccent">
                    <Icon name="ai" size={16} filled />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[.16em] opacity-70">
                    Major feature
                  </span>
                </div>
                <h2 className="display mt-5 text-[34px] leading-[1] sm:text-[46px]">
                  Let AI search for small jobs for you.
                </h2>
                <p className="mt-4 max-w-[52ch] text-[14.5px] leading-relaxed opacity-80">
                  Tell us what you can do, where you want to work and what you are looking for. We
                  will find relevant opportunities across the web, then explain why each one matches
                  before you apply.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/app/ai"
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-[15px] font-bold text-onaccent"
                  >
                    Find opportunities with AI
                    <Icon name="arrowRight" size={17} />
                  </Link>
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  { t: "Discover", d: "Reads permitted public sources and partner feeds." },
                  { t: "Filter", d: "Removes what your skills, distance or pay floor rule out." },
                  { t: "Rank", d: "Scores each listing against your brief." },
                  { t: "Explain", d: "Tells you why it matched, in plain words." },
                ].map((s, i) => (
                  <div
                    key={s.t}
                    className="flex items-start gap-4 rounded-[18px] border border-white/12 bg-white/[.06] p-4"
                  >
                    <span className="figure text-[13px] opacity-50">0{i + 1}</span>
                    <div>
                      <div className="text-[14px] font-bold">{s.t}</div>
                      <div className="mt-0.5 text-[12.5px] opacity-70">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <EarningProducts />

      {/* ------------------------------------------------------- coming soon */}
      <section className="border-t border-rule">
        <div className="mx-auto max-w-[1240px] px-5 py-16">
          <span className="eyebrow">On the roadmap</span>
          <h2 className="display mt-3 max-w-[24ch] text-[32px] sm:text-[44px]">
            What comes after the work.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SOON.map((s) => {
              const c = COMING_SOON[s.key];
              return (
                <div key={s.key} className="tagshape border border-dashed border-rule p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-ink/6 text-ink2">
                      <Icon name={s.icon} size={19} />
                    </span>
                    <span className="rounded-full border border-rule px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-ink3">
                      COMING SOON
                    </span>
                  </div>
                  <h3 className="display-tight mt-4 text-[20px]">{c.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink2">{c.tagline}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-[12.5px] text-ink3">
            These four are designed, not built. Nothing on this page pretends otherwise.
          </p>
        </div>
      </section>

      <Testimonials />

      <Faq />

      {/* ---------------------------------------------------------- final CTA */}
      <section className="border-t border-rule">
        <div className="mx-auto max-w-[1240px] px-5 py-16">
          <div className="tagshape relative overflow-hidden border border-rule">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/students-lawn.jpg"
              alt="Students on a campus lawn at the end of the day"
              className="h-[340px] w-full object-cover grayscale-[.3] sm:h-[420px]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[#0B1020] opacity-[.72] mix-blend-multiply"
            />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-[720px] p-8 sm:p-14">
                <h2 className="display text-[34px] leading-[.98] text-white sm:text-[52px]">
                  Graduate with a
                  <br />
                  history of real work.
                </h2>
                <p className="mt-5 max-w-[50ch] text-[15px] leading-relaxed text-white/80">
                  Not an empty CV. Not a certificate. A list of things you were paid to do, and the
                  people who would hire you again.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button href="/signin" size="lg" iconRight="arrowRight">
                    Get started
                  </Button>
                  <Link
                    href="/app/tasks"
                    className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10"
                  >
                    Explore opportunities
                  </Link>
                </div>
                <div className="mt-6">
                  <Money amount={0} currency="" className="hidden" />
                  <span className="text-[12.5px] text-white/60">
                    Free for students. Students keep 100% of their pay.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
