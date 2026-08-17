import { Icon } from '@iconify/react';
import { useNavigate, useParams } from 'react-router-dom';

interface MembershipBannerProps {
    tienda?: any;
}

export default function MembershipBanner({ tienda }: MembershipBannerProps) {
    const navigate = useNavigate();
    const { slug } = useParams();
    const storeName = tienda?.nombreComercial || 'Nuestra Tienda';
    const membershipBanner = tienda?.banners?.find((b: any) => b.orden === 5);

    const handleBannerClick = (url?: string) => {
        if (!url) return;
        if (url.startsWith('http') || url.startsWith('//')) { window.location.href = url; return; }
        if (url.startsWith('/tienda') || url.startsWith('tienda')) {
            navigate(url.startsWith('/') ? url : `/${url}`); return;
        }
        navigate(`/tienda/${slug}/${url.startsWith('/') ? url.substring(1) : url}`);
    };

    if (membershipBanner?.imagenUrl) {
        const titulo = typeof membershipBanner?.titulo === 'string' ? membershipBanner.titulo.trim() : '';
        const subtitulo = typeof membershipBanner?.subtitulo === 'string' ? membershipBanner.subtitulo.trim() : '';
        const boton = typeof membershipBanner?.boton === 'string' ? membershipBanner.boton.trim() : '';
        const hasTextContent = Boolean(titulo || subtitulo || boton);

        return (
            <div className="max-w-screen-xl mx-auto px-5 md:px-8 mb-10">
                <div
                    className={`relative rounded-3xl overflow-hidden h-[170px] md:h-[210px] bg-[#F5EEE6] ${membershipBanner.linkUrl ? 'cursor-pointer group' : ''}`}
                    onClick={() => handleBannerClick(membershipBanner.linkUrl)}
                >
                    <img
                        src={membershipBanner.imagenUrl}
                        alt={titulo || 'Banner membresía'}
                        className="w-full h-full object-cover object-center"
                    />

                    {hasTextContent && (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />

                            <div className="absolute left-0 top-0 bottom-0 w-full md:w-[55%] p-5 md:p-7 flex flex-col justify-center z-10">
                                <h2 className="text-xl md:text-3xl font-black text-white leading-[1.2] mb-2 drop-shadow-sm">
                                    {titulo || `Únete a la familia ${storeName}`}
                                </h2>
                                {subtitulo && (
                                    <p className="text-xs md:text-sm text-white/95 mb-4 md:mb-5 max-w-md">{subtitulo}</p>
                                )}
                                {boton && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleBannerClick(membershipBanner.linkUrl); }}
                                        className="w-fit flex items-center gap-2 bg-[#FF9500] hover:bg-[#E08500] text-white text-sm font-bold px-5 py-2 rounded-full transition-colors shadow-md"
                                    >
                                        {boton}
                                        <Icon icon="solar:alt-arrow-right-bold" width={14} />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-screen-xl mx-auto px-5 md:px-8 mb-10">
            <div className="relative rounded-3xl overflow-hidden bg-[#F5EEE6] h-[220px] md:h-[260px]">

                {/* Text Side */}
                <div className="absolute left-0 top-0 bottom-0 w-full md:w-[50%] p-8 md:p-12 flex flex-col justify-center z-10">
                    <h2 className="text-2xl md:text-3xl font-black text-[#1A1A1A] leading-[1.2] mb-2">
                        Únete a la familia <span className="text-[#FF9500]">{storeName}</span>
                        {' '}y obtén{' '}
                        <span className="text-[#FF9500]">10% OFF</span>
                        {' '}en tu primer pedido
                    </h2>
                    <p className="text-sm text-[#777] mb-6">
                        Porque mereces lo mejor 🎉
                    </p>
                    <button className="w-fit flex items-center gap-2 bg-[#FF9500] hover:bg-[#E08500] text-white text-sm font-bold px-7 py-3 rounded-full transition-colors shadow-sm">
                        <Icon icon="solar:user-plus-bold" width={16} />
                        Suscribirse
                    </button>
                </div>

                {/* Orange right section with images */}
                <div className="absolute right-0 top-0 bottom-0 w-[50%] bg-[#FF9500] hidden md:flex items-end justify-center rounded-l-[80px] overflow-hidden">
                    <div className="flex items-end justify-center gap-2 h-full w-full pt-8 px-4">
                        {/* Decorative product/category images */}
                        <img
                            src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=80&w=200"
                            alt=""
                            className="h-3/4 object-contain object-bottom opacity-90"
                        />
                        <img
                            src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=200"
                            alt=""
                            className="h-3/5 object-contain object-bottom opacity-90"
                        />
                        <img
                            src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=200"
                            alt=""
                            className="h-2/3 object-contain object-bottom opacity-90"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
