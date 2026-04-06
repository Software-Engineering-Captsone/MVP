import Link from "next/link";

const TIERS = [
  {
    name: "Athlete",
    price: "$0",
    period: "forever",
    blurb: "Everything you need to get discovered and manage your first deals.",
    features: [
      "Public athlete profile & social stats",
      "Browse brand opportunities",
      "Deal inbox & basic contract tracking",
      "Email support",
    ],
    cta: "Sign up free",
    href: "/auth",
    variant: "default" as const,
  },
  {
    name: "Brand",
    price: "$149",
    period: "/ month",
    blurb: "Search, campaigns, and analytics built for growing marketing teams.",
    features: [
      "Unlimited athlete discovery & saved lists",
      "Campaign creation & applications",
      "Instagram & engagement insights",
      "Team seats (up to 5)",
      "Priority chat support",
    ],
    cta: "Start free trial",
    href: "/auth",
    variant: "featured" as const,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "For schools, agencies, and brands with compliance and volume needs.",
    features: [
      "Dedicated success manager",
      "Custom contracts & SSO",
      "API access & reporting exports",
      "Volume pricing for large rosters",
    ],
    cta: "Talk to sales",
    href: "/talk-to-sales",
    variant: "default" as const,
  },
];

export default function Pricing() {
  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-inner">
        <div className="pricing-header fade-up">
          <div className="section-eyebrow">Pricing</div>
          <h2 className="section-heading">Simple plans that scale with you</h2>
          <p>
            Athletes join free. Brands choose a plan when they&apos;re ready to run
            campaigns at scale.
          </p>
        </div>
        <div className="pricing-grid">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={
                tier.variant === "featured"
                  ? "pricing-card pricing-card--featured fade-up"
                  : "pricing-card fade-up"
              }
            >
              {tier.variant === "featured" ? (
                <div className="pricing-badge">Most popular</div>
              ) : null}
              <h3 className="pricing-name">{tier.name}</h3>
              <div className="pricing-price-row">
                <span className="pricing-price">{tier.price}</span>
                {tier.period ? (
                  <span className="pricing-period">{tier.period}</span>
                ) : null}
              </div>
              <p className="pricing-blurb">{tier.blurb}</p>
              <ul className="pricing-features">
                {tier.features.map((line) => (
                  <li key={line}>
                    <span className="pricing-check" aria-hidden>
                      ✓
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={
                  tier.variant === "featured"
                    ? "btn-pill btn-nilink-primary pricing-cta"
                    : "btn-pill btn-outline pricing-cta"
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
