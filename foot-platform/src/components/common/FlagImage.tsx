interface FlagImageProps {
  code: string;       // 2-letter country code (lowercase) e.g. 'br', 'ar'
  size?: number;      // default 24
  className?: string;
}

/**
 * Display country flag using flagcdn.com.
 * Falls back to emoji if code is invalid.
 */
export default function FlagImage({ code, size = 24, className = '' }: FlagImageProps) {
  const src = `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
  const src2x = `https://flagcdn.com/w80/${code.toLowerCase()}.png`;

  return (
    <img
      src={src}
      srcSet={`${src2x} 2x`}
      alt={code}
      width={size}
      height={size * 0.75}
      className={`inline-block rounded-sm shadow ${className}`}
      style={{ objectFit: 'cover' }}
      onError={(e) => {
        // Fallback: show code as text
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

/**
 * Map 3-letter FIFA code to 2-letter ISO country code for flag API.
 */
export function fifaToIso2(fifa: string): string {
  const map: Record<string, string> = {
    USA: 'us', NED: 'nl', IRN: 'ir', NZL: 'nz',
    MEX: 'mx', POR: 'pt', KOR: 'kr', CMR: 'cm',
    CAN: 'ca', ENG: 'gb', JPN: 'jp', EGY: 'eg',
    ARG: 'ar', GER: 'de', SEN: 'sn', UAE: 'ae',
    BRA: 'br', CRO: 'hr', MAR: 'ma', AUS: 'au',
    FRA: 'fr', URU: 'uy', KSA: 'sa', JAM: 'jm',
    ESP: 'es', SUI: 'ch', COL: 'co', CHN: 'cn',
    ITA: 'it', BEL: 'be', PER: 'pe', QAT: 'qa',
    NOR: 'no', SRB: 'rs', NGA: 'ng', CRC: 'cr',
    DEN: 'dk', AUT: 'at', ALG: 'dz', IRQ: 'iq',
    ECU: 'ec', UKR: 'ua', TUN: 'tn', PAN: 'pa',
    CHI: 'cl', SWE: 'se', GHA: 'gh', UZB: 'uz',
  };
  return map[fifa.toUpperCase()] || fifa.toLowerCase();
}
