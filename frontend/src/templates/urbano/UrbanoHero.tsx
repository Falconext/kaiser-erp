import { useNavigate } from 'react-router-dom';

interface UrbanoHeroProps {
  diseno?: any;
    slug: string;
    tienda: any;
}

export default function UrbanoHero({ slug, tienda, diseno }: UrbanoHeroProps) {
    const navigate = useNavigate();

    return (
        <section className="relative w-full h-screen flex flex-col items-center justify-end overflow-hidden" style={{ fontFamily: '"Inter", sans-serif' }}>

            {/* Full-screen banner background */}
            <img
                src={(diseno || tienda?.diseno)?.urbanoHeroImg || "/assets/templates/urbano/banner.png"}
                alt={(diseno || tienda?.diseno)?.urbanoHeroTitle || "Estilo urbano para la ciudad"}
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 z-0 pointer-events-none" />

            {/* Bottom Text Content */}
            <div className="relative z-10 flex flex-col items-center text-center pb-16 md:pb-24 px-4 w-full">

                {/* Subtitle */}
                <h3 className="text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-white/80 uppercase mb-3 md:mb-4">
                    {(diseno || tienda?.diseno)?.urbanoHeroSubtitle || "Nueva colección"}
                </h3>

                {/* Main Title */}
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-[5rem] font-black tracking-tighter uppercase text-white leading-none mb-8 sm:mb-10 max-w-4xl drop-shadow-lg"
                    style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
                >
                    {(diseno || tienda?.diseno)?.urbanoHeroTitle || "Estilo urbano para la ciudad"}
                </h2>

                {/* Call to Action Button */}
                <button
                    onClick={() => {
                        const gridSection = document.getElementById('product-grid');
                        if (gridSection) {
                            gridSection.scrollIntoView({ behavior: 'smooth' });
                        } else {
                            navigate(`/tienda/${slug}`);
                        }
                    }}
                    className="group relative flex items-center justify-center border-2 border-white bg-transparent text-white font-bold text-[11px] sm:text-xs tracking-[0.2em] uppercase py-3.5 px-8 md:py-4 md:px-10 hover:bg-white hover:text-black transition-all duration-300"
                >
                    <span className="opacity-0 group-hover:opacity-100 absolute left-4 transition-opacity">[</span>
                    {(diseno || tienda?.diseno)?.urbanoHeroBtn || "[ VER COLECCIÓN ]"}
                    <span className="opacity-0 group-hover:opacity-100 absolute right-4 transition-opacity">]</span>
                </button>

            </div>
        </section>
    );
}
