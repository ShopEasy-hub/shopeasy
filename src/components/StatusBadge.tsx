interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'in_transit' | 'received' | 'cancelled' | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  approved: {
    label: 'Approved',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  in_transit: {
    label: 'In Transit',
    className: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  },
  received: {
    label: 'Received',
    className: 'bg-success/10 text-success border-success/20',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-error/10 text-error border-error/20',
  },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status || 'Unknown',
    className: 'bg-muted/10 text-muted-foreground border-muted/20',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}