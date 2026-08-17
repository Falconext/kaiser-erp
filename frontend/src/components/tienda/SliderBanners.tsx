import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';

interface SliderBannersProps {
    tienda: any;
    diseno: any;
}

export default function SliderBanners({ tienda, diseno }: SliderBannersProps) {
    const navigate = useNavigate();
    const { slug } = useParams();
    const [imgLoaded, setImgLoaded] = useState<Record<string, boolean>>({});
    const cp = diseno?.colorPrimario || '#FF9500';

    const handleBannerClick = (url?: string) => {
        if (!url) return;
        if (url.startsWith('http') || url.startsWith('//')) { window.location.href = url; return; }
        if (url.startsWith('/tienda') || url.startsWith('tienda')) {
            navigate(url.startsWith('/') ? url : `/${url}`); return;
        }
        navigate(`/tienda/${slug}/${url.startsWith('/') ? url.substring(1) : url}`);
    };

    const b0 = tienda?.banners?.find((b: any) => b.orden === 0);
    const b1 = tienda?.banners?.find((b: any) => b.orden === 1);
    const b2 = tienda?.banners?.find((b: any) => b.orden === 2);

    // Side category cards (top-right and bottom-right)
    const sideCards = [
        {
            id: 'side-dogs',
            label: b1?.titulo ?? 'Destacados',
            imagenUrl: b1?.imagenUrl || 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=80&w=500',
            linkUrl: b1?.linkUrl || '',
            bgColor: '#F5EEE6',
            isSoloImagen: typeof b1?.titulo === 'string' && b1.titulo === '' && (!b1.subtitulo || b1.subtitulo === ''),
        },
        {
            id: 'side-cats',
            label: b2?.titulo ?? 'Novedades',
            imagenUrl: b2?.imagenUrl || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=500',
            linkUrl: b2?.linkUrl || '',
            bgColor: '#F5EEE6',
            isSoloImagen: typeof b2?.titulo === 'string' && b2.titulo === '' && (!b2.subtitulo || b2.subtitulo === ''),
        },
    ];

    // Main hero banner data
    const mainBanner = b0 ? {
        titulo: b0.titulo ?? '',
        subtitulo: b0.subtitulo ?? '',
        boton: b0.boton || 'Ver más',
        imagenUrl: b0.imagenUrl || '',
        linkUrl: b0.linkUrl || '',
    } : {
        titulo: 'Ofertas Especiales para Ti',
        subtitulo: 'Descubre descuentos semanales en productos de primera calidad y los mejores precios del mercado.',
        boton: 'Ver más',
        imagenUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=800',
        linkUrl: '',
    };

    const isSoloImagen = mainBanner.titulo === '' && mainBanner.subtitulo === '';

    return (
        <div className="max-w-screen-xl mx-auto px-5 md:px-8 mb-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[440px]">

                {/* ── Main Hero Banner ── */}
                <div
                    className="lg:col-span-9 relative rounded-3xl overflow-hidden cursor-pointer group h-[340px] lg:h-full"
                    style={{ background: cp }}
                    onClick={() => handleBannerClick(mainBanner.linkUrl)}
                >
                    {!isSoloImagen && (
                        <>
                            {/* Decorative circle */}
                            <div className="absolute right-[28%] top-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[#FFB347] opacity-60 pointer-events-none" />

                            {/* Text Content */}
                            <div className="absolute left-0 top-0 bottom-0 w-full md:w-[45%] p-8 md:p-12 flex flex-col justify-center z-10">
                                <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.1] mb-4">
                                    {mainBanner.titulo}
                                </h2>
                                <p className="text-white/85 text-sm md:text-base leading-relaxed mb-8 max-w-xs">
                                    {mainBanner.subtitulo}
                                </p>
                                {mainBanner.boton && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleBannerClick(mainBanner.linkUrl); }}
                                        className="w-fit flex items-center gap-2 bg-white text-[#1A1A1A] text-sm font-bold px-6 py-3 rounded-full hover:bg-[#FFF3E0] transition-colors shadow-sm"
                                    >
                                        {mainBanner.boton}
                                        <Icon icon="solar:alt-arrow-right-bold" width={14} />
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* Hero Image */}
                    {mainBanner.imagenUrl && (
                        <div className={`absolute right-0 bottom-0 top-0 ${isSoloImagen ? 'w-full block' : 'w-[55%] hidden md:block'}`}>
                            <img
                                src={mainBanner.imagenUrl}
                                alt={mainBanner.titulo || 'Banner'}
                                className={`w-full h-full ${isSoloImagen ? 'object-cover' : 'object-contain object-bottom'} transition-opacity duration-700 ${imgLoaded['main'] ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImgLoaded(p => ({ ...p, main: true }))}
                            />
                        </div>
                    )}
                </div>

                {/* ── Right Side: 2 Stacked Category Cards ── */}
                <div className="lg:col-span-3 flex flex-row lg:flex-col gap-4 h-[180px] lg:h-full">
                    {sideCards.map((card) => (
                        <div
                            key={card.id}
                            className="flex-1 relative rounded-2xl overflow-hidden cursor-pointer group"
                            style={{ backgroundColor: card.bgColor }}
                            onClick={() => handleBannerClick(card.linkUrl)}
                        >
                            {!card.isSoloImagen && (
                                <div className="absolute top-4 left-4 z-10">
                                    <h3 className="text-xl font-black text-[#1A1A1A] leading-tight">{card.label}</h3>
                                </div>
                            )}
                            <img
                                src={card.imagenUrl}
                                alt={card.label}
                                className={`absolute bottom-0 right-0 w-full h-full ${card.isSoloImagen ? 'object-cover' : 'object-contain object-bottom'} transition-opacity duration-500 ${imgLoaded[card.id] ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImgLoaded(p => ({ ...p, [card.id]: true }))}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
