import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface PromoBannersProps {
    tienda?: any;
}

const DEFAULT_BANNERS = [
    {
        titulo: 'Productos seleccionados con el mayor cuidado',
        subtitulo: '',
        badge: 'Garantía de calidad',
        boton: 'Ver más',
        imagenUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600',
        bgColor: '#C8F5C0',
        textColor: '#1A1A1A',
        badgeColor: '#22C55E',
    },
    {
        titulo: 'Para el confort y la comodidad de tu hogar',
        subtitulo: 'Accesorios, decoración y más — elegidos para ti.',
        badge: '',
        boton: 'Ver más',
        imagenUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600',
        bgColor: '#FFD49A',
        textColor: '#1A1A1A',
        badgeColor: '',
    },
];

export default function PromoBanners({ tienda }: PromoBannersProps) {
    const [imgLoaded, setImgLoaded] = useState<Record<number, boolean>>({});
    const navigate = useNavigate();
    const { slug } = useParams();

    const handleBannerClick = (url?: string) => {
        if (!url) return;
        if (url.startsWith('http') || url.startsWith('//')) { window.location.href = url; return; }
        if (url.startsWith('/tienda') || url.startsWith('tienda')) {
            navigate(url.startsWith('/') ? url : `/${url}`); return;
        }
        navigate(`/tienda/${slug}/${url.startsWith('/') ? url.substring(1) : url}`);
    };

    const b3 = tienda?.banners?.find((b: any) => b.orden === 3);
    const b4 = tienda?.banners?.find((b: any) => b.orden === 4);

    const cards = [
        {
            titulo: b3?.titulo ?? DEFAULT_BANNERS[0].titulo,
            subtitulo: b3?.subtitulo ?? DEFAULT_BANNERS[0].subtitulo,
            badge: DEFAULT_BANNERS[0].badge,
            boton: b3?.boton || DEFAULT_BANNERS[0].boton,
            imagenUrl: b3?.imagenUrl || DEFAULT_BANNERS[0].imagenUrl,
            linkUrl: b3?.linkUrl || '',
            bgColor: DEFAULT_BANNERS[0].bgColor,
            textColor: DEFAULT_BANNERS[0].textColor,
            badgeColor: DEFAULT_BANNERS[0].badgeColor,
            isSoloImagen:
                (typeof b3?.titulo !== 'string' || b3.titulo.trim() === '') &&
                (typeof b3?.subtitulo !== 'string' || b3.subtitulo.trim() === ''),
        },
        {
            titulo: b4?.titulo ?? DEFAULT_BANNERS[1].titulo,
            subtitulo: b4?.subtitulo ?? DEFAULT_BANNERS[1].subtitulo,
            badge: DEFAULT_BANNERS[1].badge,
            boton: b4?.boton || DEFAULT_BANNERS[1].boton,
            imagenUrl: b4?.imagenUrl || DEFAULT_BANNERS[1].imagenUrl,
            linkUrl: b4?.linkUrl || '',
            bgColor: DEFAULT_BANNERS[1].bgColor,
            textColor: DEFAULT_BANNERS[1].textColor,
            badgeColor: DEFAULT_BANNERS[1].badgeColor,
            isSoloImagen:
                (typeof b4?.titulo !== 'string' || b4.titulo.trim() === '') &&
                (typeof b4?.subtitulo !== 'string' || b4.subtitulo.trim() === ''),
        },
    ];

    return (
        <div className="max-w-screen-xl mx-auto px-5 md:px-8 mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cards.map((card, i) => (
                    <div
                        key={i}
                        className="relative rounded-3xl overflow-hidden h-[220px] md:h-[260px] cursor-pointer group"
                        style={{ backgroundColor: card.bgColor }}
                        onClick={() => handleBannerClick(card.linkUrl)}
                    >
                        {/* Text */}
                        {!card.isSoloImagen && (
                            <div className="absolute left-0 top-0 bottom-0 w-[55%] p-7 flex flex-col justify-between z-10">
                                <div>
                                    {card.badge && (
                                        <span
                                            className="inline-flex items-center gap-1.5 text-white text-[10px] font-black px-3 py-1.5 rounded-full mb-4"
                                            style={{ backgroundColor: card.badgeColor || '#22C55E' }}
                                        >
                                            <Icon icon="solar:check-circle-bold" width={11} />
                                            {card.badge}
                                        </span>
                                    )}
                                    <h3 className="text-xl md:text-2xl font-black leading-[1.2]" style={{ color: card.textColor || '#1A1A1A' }}>
                                        {card.titulo}
                                    </h3>
                                    {card.subtitulo && (
                                        <p className="text-sm text-[#555] mt-2 leading-relaxed">{card.subtitulo}</p>
                                    )}
                                </div>
                                {card.boton && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleBannerClick(card.linkUrl); }}
                                        className="w-fit flex items-center gap-2 bg-white text-[#1A1A1A] text-xs font-bold px-5 py-2.5 rounded-full hover:shadow-md transition-shadow"
                                    >
                                        {card.boton}
                                        <Icon icon="solar:alt-arrow-right-bold" width={12} />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Image */}
                        {card.imagenUrl && (
                            <div className={`absolute right-0 bottom-0 top-0 ${card.isSoloImagen ? 'w-full flex items-center justify-center' : 'w-[48%]'}`}>
                                <img
                                    src={card.imagenUrl}
                                    alt={card.titulo || 'Promo Banner'}
                                    className={`w-full h-full ${card.isSoloImagen ? 'object-fill object-center' : 'object-fill object-bottom'} transition-opacity duration-500 ${imgLoaded[i] ? 'opacity-100' : 'opacity-0'}`}
                                    onLoad={() => setImgLoaded(p => ({ ...p, [i]: true }))}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
