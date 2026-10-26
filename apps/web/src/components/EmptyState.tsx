import { Link } from "react-router-dom";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
}: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && actionTo && (
        <Link className="btn" to={actionTo}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
