import type { ReactNode } from "react";

type Stat = { value: string | number; label: string };

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  stats: Stat[];
  action?: ReactNode;
};

export function ViewHero({ eyebrow, title, subtitle, stats, action }: Props) {
  return (
    <section className="hero-panel" aria-labelledby="view-hero-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="view-hero-title" className="hero-brand">
          {title}
        </h1>
        {subtitle && <p className="lede">{subtitle}</p>}
        {action && <div className="hero-actions">{action}</div>}
      </div>
      <div className="hero-stats" aria-label="Resumen">
        {stats.map((stat) => (
          <div className="stat-pill" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
