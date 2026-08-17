import { useRef, useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import ProductCardPio from '@/components/tienda/ProductCardPio';
import ProductCardEmox from '@/components/tienda/ProductCardEmox';
import ProductCardGlamora from '@/components/tienda/ProductCardGlamora';
import ProductCardGromuse from '@/components/tienda/ProductCardGromuse';
import { resolveTemplate } from '@/components/tienda/resolveTemplate';
import { getRubroDemo } from '@/data/rubroDemo';

const CARD_MAP: Record<string, React.ComponentType<any>> = {
  ProductCardPio,
  ProductCardEmox,
  ProductCardGlamora,
  ProductCardGromuse,
};

const VIEWPORT = { mobile: 375, tablet: 768, desktop: 1280 } as const;
type ViewMode = keyof typeof VIEWPORT;

interface Props {
  plantillaId?: string | null;
  colorPrimario?: string;
  colorSecundario?: string;
  colorAccento?: string;
  tipografia?: string;
  rubroNombre?: string;
}

export default function StorePreview({ plantillaId, colorPrimario, colorSecundario = '#ffffff', colorAccento, tipografia = 'Inter', rubroNombre }: Props) {
  const demo = useMemo(() => getRubroDemo(rubroNombre), [rubroNombre]);
  const cp = colorPrimario ?? demo.colorDefault ?? '#6A6CFF';
  const ca = colorAccento ?? '#FF6B6B';
  const template = resolveTemplate(plantillaId ?? demo.plantillaDefault);
  const Card = CARD_MAP[template.cardComponent] ?? ProductCardPio;
  const diseno = { colorPrimario: cp, colorSecundario, colorAccento: ca, tipografia };

  const [mode, setMode] = useState<ViewMode>('desktop');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(0);
  const [wrapH, setWrapH] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setWrapW(e.contentRect.width);
      setWrapH(e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const targetW = VIEWPORT[mode];
  const scale = wrapW > 0 ? Math.min(1, wrapW / targetW) : 1;
  const innerH = wrapH > 0 ? Math.round(wrapH / scale) : 900;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <span className="text-xs text-gray-400 font-medium truncate max-w-[120px]">{demo.storeName}</span>
        <div className="flex items-center gap-1 ml-auto bg-white border border-gray-200 rounded-lg p-0.5">
          {([
            { v: 'mobile' as ViewMode, icon: 'solar:smartphone-bold', px: '375px' },
            { v: 'tablet' as ViewMode, icon: 'solar:tablet-bold', px: '768px' },
            { v: 'desktop' as ViewMode, icon: 'solar:monitor-bold', px: '1280px' },
          ]).map(({ v, icon, px }) => (
            <button
              key={v}
              onClick={() => setMode(v)}
              title={px}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${mode === v ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Icon icon={icon} className="text-sm" />
              <span className="hidden sm:inline">{px}</span>
            </button>
          ))}
        </div>
        {wrapW > 0 && (
          <span className="text-[10px] text-gray-300 font-mono ml-1">{Math.round(scale * 100)}%</span>
        )}
      </div>

      {/* Scaled store */}
      <div ref={wrapRef} className="flex-1 overflow-hidden bg-gray-100 relative">
        {wrapW > 0 && (
          <div
            style={{
              width: targetW,
              height: innerH,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              background: colorSecundario || '#fff',
              fontFamily: `'${tipografia}', sans-serif`,
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ background: cp, color: '#fff' }} className="flex items-center justify-between px-4 py-3 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold">
                  {demo.storeName.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-bold text-sm leading-tight">{demo.storeName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Icon icon="solar:magnifer-linear" className="text-base opacity-80" />
                <div className="relative">
                  <Icon icon="solar:bag-2-linear" className="text-lg" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: ca }}>3</span>
                </div>
              </div>
            </div>

            {/* Categories */}
            {template.showCategoryCircles && (
              <div className="flex gap-2 px-3 py-2.5 overflow-x-auto border-b border-gray-100 bg-white">
                {demo.categories.map((cat, i) => (
                  <button
                    key={cat}
                    className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                    style={i === 0
                      ? { background: cp, color: '#fff', borderColor: cp }
                      : { background: 'transparent', color: '#666', borderColor: '#e5e7eb' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Products grid */}
            <div className={`grid ${template.gridCols} gap-3 p-3`}>
              {demo.products.map(p => (
                <Card
                  key={p.id}
                  producto={p}
                  slug="demo"
                  diseno={diseno}
                  onAddToCart={() => {}}
                  onClick={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
