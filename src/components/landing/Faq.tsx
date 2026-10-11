const FAQ = [
  {
    q: "What is Earnly?",
    a: "Earnly helps students discover opportunities, build skills, earn through work and access new financial tools from one platform.",
  },
  {
    q: "Who can use Earnly?",
    a: "Earnly is designed for students and young people globally. Every account goes through student verification before it can apply for work.",
  },
  {
    q: "How do I create an account?",
    a: "You can create an account using Google or the available email authentication option. Both take you straight into student verification.",
  },
  {
    q: "Do I need to verify my university?",
    a: "University information helps personalize your Earnly experience and connect you with relevant opportunities. Verification is what makes the badge on your profile mean something to a poster.",
  },
  {
    q: "Can I add my university if it isn't listed?",
    a: "Yes. Search for your university first, and if it isn't available, you can manually enter its name, country and city. It is saved to your profile.",
  },
  {
    q: "Can I add skills that aren't listed?",
    a: "Yes. Earnly allows you to add custom skills. They sit alongside the built-in library and appear on your profile exactly like the rest.",
  },
  {
    q: "Are the financial products currently available?",
    a: "Some products may initially be introduced as Coming Soon while the underlying infrastructure is being built. Asset Leasing, Inventory Loans and the Digital Pawn Shop are previews today — no listings, loans, pledges or payments are processed for them yet.",
  },
  {
    q: "Is Earnly available outside Nigeria?",
    a: "Yes. Earnly is being designed as a global platform with users and universities from around the world. Earnings settle into the Stellar or Ethereum wallet created with your account, and off-ramp to local currency is on the roadmap.",
  },
  {
    q: "How does Earnly make money?",
    a: "Students keep 100% of what they are paid for work. No revenue model has been switched on for this prototype — anything published here would be a claim we cannot yet support.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t border-rule">
      <div className="mx-auto max-w-[1240px] px-5 py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <span className="eyebrow">Questions</span>
            <h2 className="display mt-3 max-w-[16ch] text-[32px] sm:text-[44px]">
              Frequently asked questions
            </h2>
            <p className="mt-4 max-w-[40ch] text-[14px] leading-relaxed text-ink2">
              Still unsure about something? Write to us — the address is in the footer.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="tagshape group border border-rule bg-raised px-5 py-4 open:bg-raised"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] font-semibold marker:content-none">
                  {item.q}
                  <span className="mt-0.5 flex-none text-ink3 transition-transform duration-200 group-open:rotate-90">
                    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        d="M6 3l5 5-5 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-ink2">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
