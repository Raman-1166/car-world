/** Minimal side-profile silhouette used by the loader, fallback and blueprint backgrounds. */
export function CarSilhouette({
  className = "",
  stroke = "currentColor",
  fill = "none",
  strokeWidth = 1.2,
  wheels = true,
  ...rest
}: {
  className?: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  wheels?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  return (
    <svg viewBox="0 0 800 230" className={className} fill="none" aria-hidden {...rest}>
      <path
        d="M30 178 C28 160 46 150 92 144 L228 128 C268 106 312 78 374 62 C440 46 520 48 574 70 C612 86 640 108 664 122 L730 132 C764 138 776 152 774 178 L742 180 M30 178 L72 180 M222 180 L612 180 M232 128 C300 124 360 118 420 112 L560 108 M420 112 C402 84 392 66 380 60 M560 108 C540 88 520 70 500 56"
        stroke={stroke}
        fill={fill}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {wheels && (
        <>
          <circle cx="147" cy="178" r="46" stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="147" cy="178" r="30" stroke={stroke} strokeWidth={strokeWidth * 0.7} />
          <circle cx="677" cy="178" r="46" stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="677" cy="178" r="30" stroke={stroke} strokeWidth={strokeWidth * 0.7} />
        </>
      )}
    </svg>
  );
}
