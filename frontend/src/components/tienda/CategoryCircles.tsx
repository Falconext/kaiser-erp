import { Icon } from '@iconify/react';

interface CategoryCirclesProps {
    categories: any[];
    selectedCats: string[];
    onSelectCategory: (cat: string) => void;
}

const getCategoryImage = (cat: any): string | null => {
    if (typeof cat === 'object' && cat.imagenUrl) return cat.imagenUrl;
    const name = typeof cat === 'object' ? cat.nombre || cat.codigo : cat;
    if (!name) return null;
    const lower = name.toLowerCase();
    if (lower.includes('tech') || lower.includes('celular') || lower.includes('laptop'))
        return 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&q=80&w=400';
    if (lower.includes('moda') || lower.includes('ropa') || lower.includes('mujer'))
        return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400';
    if (lower.includes('hogar') || lower.includes('mueble'))
        return 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&q=80&w=400';
    if (lower.includes('belleza') || lower.includes('cosm'))
        return 'https://images.unsplash.com/photo-1596462502278-27bfdd403cc2?auto=format&fit=crop&q=80&w=400';
    if (lower.includes('deporte') || lower.includes('zapat'))
        return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400';
    if (lower.includes('aliment') || lower.includes('comida'))
        return 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&q=80&w=400';
    if (lower.includes('elect') || lower.includes('audio'))
        return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400';
    return null;
};

export default function CategoryCircles({ categories, selectedCats, onSelectCategory }: CategoryCirclesProps) {
    if (categories.length === 0) return null;

    // Bento layout: row1 = first 2 (large), row2 = rest up to 5 total
    const row1 = categories.slice(0, 2);
    const row2 = categories.slice(2, 5);

    const CategoryCard = ({
        cat,
        className = '',
    }: {
        cat: any;
        className?: string;
    }) => {
        const name = typeof cat === 'object' ? cat.nombre || cat.codigo : cat;
        const isSelected = selectedCats.includes(name);
        const img = getCategoryImage(cat);

        return (
            <div
                onClick={() => onSelectCategory(name)}
                className={`relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 ${isSelected ? 'ring-2 ring-[#FF9500]' : ''} ${className}`}
                style={{ backgroundColor: '#F5EEE6' }}
            >
                {/* Label top-left */}
                <div className="absolute top-5 left-5 z-10">
                    <h3 className="text-xl md:text-2xl font-black text-[#1A1A1A]">{name}</h3>
                    {isSelected && (
                        <span className="inline-block mt-1 text-[10px] font-black text-[#FF9500] uppercase tracking-wide">
                            Seleccionado
                        </span>
                    )}
                </div>

                {/* Animal/Product Image */}
                {img ? (
                    <img
                        src={img}
                        alt={name}
                        className="absolute bottom-0 right-0 h-full w-1/2 object-contain object-bottom transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="absolute bottom-4 right-4 w-20 h-20 flex items-center justify-center opacity-30">
                        <Icon icon="solar:tag-bold" width={48} className="text-[#1A1A1A]" />
                    </div>
                )}
            </div>
        );
    };

    return (
        <section className="max-w-screen-xl mx-auto px-5 md:px-8 mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-[#1A1A1A] mb-5">Categorías</h2>

            <div className="flex flex-col gap-3">
                {/* Row 1: 2 large cards */}
                {row1.length > 0 && (
                    <div className={`grid gap-3 ${row1.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {row1.map((cat, i) => (
                            <CategoryCard key={i} cat={cat} className="h-44 md:h-52" />
                        ))}
                    </div>
                )}

                {/* Row 2: 3 cards */}
                {row2.length > 0 && (
                    <div className={`grid gap-3 ${row2.length === 1 ? 'grid-cols-1' : row2.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {row2.map((cat, i) => (
                            <CategoryCard key={i} cat={cat} className="h-44 md:h-52" />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
