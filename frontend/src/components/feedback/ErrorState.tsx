type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <div
      className="rounded-md border border-risk-red/40 bg-riskBg-red px-4 py-3 text-[12px] text-ink"
      role="alert"
    >
      <p className="font-bold uppercase tracking-wider text-risk-red text-[10px]">{title}</p>
      <p className="mt-1 text-[12px]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded border border-risk-red/40 bg-white px-3 py-1.5 text-[11px] font-semibold text-risk-red hover:bg-riskBg-red/60"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
