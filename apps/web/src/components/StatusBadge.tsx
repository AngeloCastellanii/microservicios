type StatusBadgeProps = {
  children: string;
  tone?: "neutral" | "ok" | "warn" | "info";
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}
