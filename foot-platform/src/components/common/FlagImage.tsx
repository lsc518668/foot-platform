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
    USA: 'us', MEX: 'mx', CAN: 'ca',
    ARG: 'ar', BRA: 'br', URU: 'uy', PAR: 'py', COL: 'co', ECU: 'ec',
    FRA: 'fr', ESP: 'es', GER: 'de', ENG: 'gb', POR: 'pt',
    ITA: 'it', NED: 'nl', BEL: 'be', SUI: 'ch', AUT: 'at',
    NOR: 'no', SWE: 'se', DEN: 'dk', CRO: 'hr', SRB: 'rs',
    UKR: 'ua', SCO: 'gb-sct', TUR: 'tr', CZE: 'cz', BIH: 'ba',
    KOR: 'kr', JPN: 'jp', AUS: 'au', IRN: 'ir', KSA: 'sa',
    QAT: 'qa', IRQ: 'iq', JOR: 'jo', UZB: 'uz', CHN: 'cn',
    MAR: 'ma', SEN: 'sn', ALG: 'dz', TUN: 'tn', EGY: 'eg',
    CIV: 'ci', GHA: 'gh', CMR: 'cm', NGA: 'ng', COD: 'cd',
    RSA: 'za', CPV: 'cv', HAI: 'ht', CUW: 'cw', PAN: 'pa',
    NZL: 'nz', CRC: 'cr', JAM: 'jm', UAE: 'ae',
  };
  return map[fifa.toUpperCase()] || fifa.toLowerCase();
}
