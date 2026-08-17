import React from 'react';

const normalizeBanco = (banco: string) => {
  const value = String(banco || '').trim().toUpperCase();
  if (value.includes('CREDITO') || value.includes('BCP')) return 'BCP';
  if (value.includes('INTERBANK')) return 'INTERBANK';
  if (value.includes('BBVA')) return 'BBVA';
  if (value.includes('SCOTIA')) return 'SCOTIABANK';
  if (value.includes('PICHINCHA')) return 'PICHINCHA';
  if (value.includes('BANBIF')) return 'BANBIF';
  if (value.includes('NACION') || value === 'BN') return 'NACION';
  return value || 'OTROS';
};

const BANCO_BRANDS: Record<string, { bg: string; fg: string; label: string; accent?: string }> = {
  BCP:        { bg: '#002A68', fg: '#FFFFFF', label: 'BCP', accent: '#FF7A00' },
  INTERBANK:  { bg: '#009B3A', fg: '#FFFFFF', label: 'IBK', accent: '#FFFFFF' },
  BBVA:       { bg: '#043263', fg: '#FFFFFF', label: 'BBVA', accent: '#4DBFFF' },
  SCOTIABANK: { bg: '#EC111A', fg: '#FFFFFF', label: 'SCOTIA', accent: '#FFFFFF' },
  PICHINCHA:  { bg: '#FFD200', fg: '#111827', label: 'PICH', accent: '#005CB9' },
  BANBIF:     { bg: '#0B5E4E', fg: '#FFFFFF', label: 'BIF', accent: '#D6B36A' },
  NACION:     { bg: '#E11D48', fg: '#FFFFFF', label: 'BN', accent: '#FFFFFF' },
  OTROS:      { bg: '#64748B', fg: '#FFFFFF', label: 'BANK', accent: '#CBD5E1' },
};

export const BancoLogo = ({ banco, size = 36 }: { banco: string; size?: number }) => {
  const key = normalizeBanco(banco);
  const brand = BANCO_BRANDS[key] ?? { ...BANCO_BRANDS.OTROS, label: key.slice(0, 4) || 'BANK' };
  const fontSize = Math.max(9, Math.round(size * (brand.label.length > 4 ? 0.2 : 0.28)));

  return (
    <div
      aria-label={banco}
      title={banco}
      className="relative overflow-hidden border border-white/30 shadow-sm shrink-0"
      style={{ width: size, height: size, background: brand.bg, borderRadius: Math.max(8, size * 0.22) }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center font-black leading-none"
        style={{ color: brand.fg, fontSize, letterSpacing: brand.label.length > 4 ? '-0.05em' : '0.02em' }}
      >
        {brand.label}
      </span>
      <span
        className="absolute bottom-0 left-0 right-0"
        style={{ height: Math.max(3, size * 0.12), background: brand.accent ?? brand.fg, opacity: 0.9 }}
      />
    </div>
  );
};
