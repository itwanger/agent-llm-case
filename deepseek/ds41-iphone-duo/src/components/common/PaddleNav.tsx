/** 上一页 / 下一页按钮（对应原站 paddlenav）。 */
export function PaddleNav({
  onPrev,
  onNext,
  atStart,
  atEnd,
  label,
  className,
}: {
  onPrev: () => void;
  onNext: () => void;
  atStart: boolean;
  atEnd: boolean;
  label: string;
  className?: string;
}) {
  return (
    <div className={`paddlenav${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="paddlenav__button"
        onClick={onPrev}
        disabled={atStart}
        aria-label={`${label}上一项`}
      >
        <Chevron direction="left" />
      </button>
      <button
        type="button"
        className="paddlenav__button"
        onClick={onNext}
        disabled={atEnd}
        aria-label={`${label}下一项`}
      >
        <Chevron direction="right" />
      </button>
    </div>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 9 16" width="9" height="16" aria-hidden="true" focusable="false">
      <path
        d="M1.2 1.2 7.4 8l-6.2 6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={direction === 'left' ? 'translate(9,0) scale(-1,1)' : undefined}
      />
    </svg>
  );
}
