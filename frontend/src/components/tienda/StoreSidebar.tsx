import { Icon } from '@iconify/react';
import { useState } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface StoreSidebarProps {
    categories: string[];
    selectedCats: string[];
    setSelectedCats: (cats: any) => void;
    search: string;
    setSearch: (s: string) => void;
    diseno: any;
    totalProducts: number;
    priceRange: [number, number];
    setPriceRange: (range: [number, number]) => void;
    minPrice: number;
    maxPrice: number;
}

export default function StoreSidebar({
    categories,
    selectedCats,
    setSelectedCats,
    search,
    setSearch,
    diseno,
    totalProducts,
    priceRange,
    setPriceRange,
    minPrice,
    maxPrice,
}: StoreSidebarProps) {

    const [isOpenCats, setIsOpenCats] = useState(true);
    const [isOpenPrice, setIsOpenPrice] = useState(true);

    const toggleCat = (cat: string) => {
        if (selectedCats.includes(cat)) {
            setSelectedCats((prev: string[]) => prev.filter((c) => c !== cat));
        } else {
            setSelectedCats((prev: string[]) => [...prev, cat]);
        }
    };

    const hasActiveFilters = selectedCats.length > 0 || search || (priceRange[0] > minPrice || priceRange[1] < maxPrice);

    const clearAllFilters = () => {
        setSelectedCats([]);
        setSearch('');
        setPriceRange([minPrice, maxPrice]);
    };

    return (
        <div className="w-full bg-white border border border-gray-100 rounded-2xl p-6 shadow-sm">
            {/* Search Input */}
            <div className="mb-6">
                <div className="relative">
                    <input
                        type="text"
                        value={search}
                        placeholder="Buscar productos..."
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                    />
                    <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width={18} />
                </div>
            </div>

            {/* Main Title */}
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Filtro de productos</h2>

            {/* Category Section */}
            <div className="mb-6 border-b border-gray-100 pb-6">
                <button
                    onClick={() => setIsOpenCats(!isOpenCats)}
                    className="flex items-center justify-between w-full mb-4 group"
                >
                    <span className="text-sm font-semibold text-gray-800">Categorías</span>
                    <Icon
                        icon="mdi:chevron-down"
                        className={`transition-transform duration-300 ${isOpenCats ? 'rotate-180' : ''} text-gray-400`}
                        width={18}
                    />
                </button>

                <div className={`space-y-3 transition-all duration-300 ease-in-out overflow-hidden ${isOpenCats ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    {categories.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No hay categorías</p>
                    ) : (
                        categories.map((cat) => {
                            const catName = typeof cat === 'object' ? (cat as any).nombre || (cat as any).codigo : cat;
                            const isSelected = selectedCats.includes(catName);
                            return (
                                <div
                                    key={catName}
                                    onClick={() => toggleCat(catName)}
                                    className="flex items-center gap-3 cursor-pointer group select-none py-1"
                                >
                                    {/* Checkbox */}
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-black border-black' : 'border-gray-300 group-hover:border-gray-500'}`}>
                                        {isSelected && <Icon icon="mdi:check" className="text-white w-3.5 h-3.5" />}
                                    </div>
                                    {/* Label */}
                                    <span className={`text-sm transition-colors ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-800'}`}>
                                        {catName}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Price Section - Functional */}
            <div className="mb-6 border-b border-gray-100 pb-6">
                <button
                    onClick={() => setIsOpenPrice(!isOpenPrice)}
                    className="flex items-center justify-between w-full mb-4"
                >
                    <span className="text-sm font-semibold text-gray-800">Precio</span>
                    <Icon
                        icon="mdi:chevron-down"
                        className={`transition-transform duration-300 ${isOpenPrice ? 'rotate-180' : ''} text-gray-400`}
                        width={18}
                    />
                </button>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpenPrice ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    {/* Slider */}
                    <div className="px-1 mb-6 mt-4">
                        <Slider
                            range
                            min={minPrice}
                            max={maxPrice}
                            value={priceRange}
                            onChange={(value) => setPriceRange(value as [number, number])}
                            trackStyle={[{ backgroundColor: '#000' }]}
                            handleStyle={[
                                { borderColor: '#000', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
                                { borderColor: '#000', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                            ]}
                            railStyle={{ backgroundColor: '#e5e7eb' }}
                        />
                    </div>

                    {/* Price Display */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 text-center border border-gray-200 rounded-full py-2 px-3 text-sm text-gray-600">
                            S/ {priceRange[0].toFixed(2)}
                        </div>
                        <span className="text-gray-300 text-xs">–</span>
                        <div className="flex-1 text-center border border-gray-200 rounded-full py-2 px-3 text-sm text-gray-600">
                            S/ {priceRange[1].toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={clearAllFilters}
                    className="w-full text-center text-xs text-red-500 hover:text-red-600 font-medium uppercase tracking-wide"
                >
                    Limpiar Filtros
                </button>
            )}
        </div>
    );
}
