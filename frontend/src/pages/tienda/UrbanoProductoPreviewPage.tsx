import React, { useState, useEffect, useRef } from 'react';
import { BRAND } from '@/lib/branding';
import { Icon } from '@iconify/react';
import UrbanoHeader from '../../templates/urbano/UrbanoHeader';

export function UrbanoProductoPreviewPage({ 
    producto, 
    demo, 
    cp, 
    diseno, 
    onNav, 
    onProduct, 
    onAddToCart 
}: { 
    producto: any; 
    demo: any; 
    cp: string; 
    diseno: any; 
    onNav: (p: any) => void; 
    onProduct: (p: any) => void; 
    onAddToCart: (p?: any) => void 
}) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [openAccordion, setOpenAccordion] = useState<string | null>('DESCRIPCION');
    
    // Demo states for interactivity
    const demoSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const demoColors = ['#9CB4C4', '#F0EFE6', '#000000', '#748067'];
    const [selectedColor, setSelectedColor] = useState(0);
    const [selectedSize, setSelectedSize] = useState(0);

    const price = Number(producto.precioUnitario || 0);

    // Slides de colección (mismas imágenes del slider del home)
    const coleccionItems = [
        { img: diseno?.urbanoCollectionImg || "/assets/templates/urbano/coleccion1.png", titulo: "Hoodie Oversize Premium", precio: "$129.90", c1: "#1A1A1A", c2: "#6B7280" },
        { img: "/assets/templates/urbano/coleccion2.png", titulo: "Cargo Pants Street", precio: "$109.90", c1: "#1A1A1A", c2: "#9CA3AF" },
        { img: "/assets/templates/urbano/coleccion3.png", titulo: "Camiseta Oversize Black", precio: "$59.90", c1: "#1A1A1A", c2: "#E5E7EB" },
        { img: "/assets/templates/urbano/coleccion4.png", titulo: "Jacket Urbano Tech", precio: "$159.90", c1: "#1A1A1A", c2: "#2563EB" },
        { img: "/assets/templates/urbano/coleccion5.png", titulo: "Polo Básico Urbano", precio: "$49.90", c1: "#1A1A1A", c2: "#F9FAFB" },
        { img: "/assets/templates/urbano/coleccion6.png", titulo: "Shorts Cargo Tactical", precio: "$79.90", c1: "#1A1A1A", c2: "#6B7280" },
        { img: "/assets/templates/urbano/coleccion7.png", titulo: "Gorro Beanie Knit", precio: "$34.90", c1: "#1A1A1A", c2: "#9CA3AF" },
        { img: "/assets/templates/urbano/coleccion8.png", titulo: "Sudadera Crewneck", precio: "$89.90", c1: "#1A1A1A", c2: "#E5E7EB" },
        { img: "/assets/templates/urbano/coleccion9.png", titulo: "Pantalón Jogger Premium", precio: "$99.90", c1: "#1A1A1A", c2: "#6B7280" },
        { img: "/assets/templates/urbano/coleccion10.png", titulo: "Chaqueta Bomber Street", precio: "$179.90", c1: "#1A1A1A", c2: "#2563EB" },
    ];

    // Slider de "Productos similares" (flechas como en el home)
    const sliderRef = useRef<HTMLDivElement>(null);
    const scrollSlider = (dir: 1 | -1) => {
        const el = sliderRef.current;
        if (!el) return;
        const children = el.children;
        const step = children.length >= 2
            ? (children[1] as HTMLElement).offsetLeft - (children[0] as HTMLElement).offsetLeft
            : ((children[0] as HTMLElement)?.offsetWidth ?? el.clientWidth);
        const maxScroll = el.scrollWidth - el.clientWidth;
        let target = el.scrollLeft + dir * step;
        if (dir === 1 && el.scrollLeft >= maxScroll - 4) target = 0;
        else if (dir === -1 && el.scrollLeft <= 4) target = maxScroll;
        el.scrollTo({ left: target, behavior: 'smooth' });
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 150);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Helper for Accordion
    const AccordionItem = ({ title, id, children }: { title: string, id: string, children: React.ReactNode }) => (
        <div className="border-b border-gray-200">
            <button 
                className="w-full flex justify-between items-center py-5 text-xs font-bold uppercase tracking-wider transition-colors hover:text-gray-600"
                onClick={() => setOpenAccordion(openAccordion === id ? null : id)}
            >
                <span>{title}</span>
                <span className="text-lg leading-none font-normal">{openAccordion === id ? '-' : '+'}</span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openAccordion === id ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}>
                {children}
            </div>
        </div>
    );

    return (
        <div className="relative bg-white text-black font-sans w-full selection:bg-black selection:text-white pb-0" style={{ fontFamily: '"Inter", sans-serif' }}>
            
            {/* ── Sticky Top Bar (shows on scroll) ── */}
            <div className={`fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4 md:px-8 py-3 transition-transform duration-300 ${isScrolled ? 'translate-y-0' : '-translate-y-full'}`}>
                <span className="font-bold text-[13px] tracking-tight">{producto.descripcion}</span>
                <button 
                    onClick={onAddToCart} 
                    className="bg-black text-white px-6 md:px-8 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
                >
                    AGREGAR
                </button>
            </div>

            {/* ── Header ── */}
            <UrbanoHeader 
                tienda={{ nombre: demo.storeName, slogan: demo.slogan, diseno: diseno }} 
                slug="preview" 
                cp={cp} 
                carritoSize={0} 
                onOpenCart={() => {}} 
            />

            <main className="w-full flex flex-col">
                
                {/* ── Section 1: Hero Split (55/45) ── */}
                <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-108px)]">
                    {/* Left: Giant Product Image (Scrollable) */}
                    <div className="w-full lg:w-[55%] bg-[#F4F5F6] flex items-center justify-center p-8 lg:p-16 min-h-[60vh] lg:min-h-[calc(100vh-108px)] relative overflow-hidden group">
                        <img
                            src={diseno?.urbanoProductMainImg || "/assets/templates/urbano/coleccion1.png"}
                            alt={producto.descripcion}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                        {/* Early Access Button (like the image) */}
                        <div className="absolute bottom-4 left-4 lg:bottom-8 lg:left-8">
                            <div className="relative inline-block bg-white px-5 py-3 rounded-lg shadow-lg">
                                <Icon icon="carbon:close-filled" className="absolute -top-2 -right-2 text-black text-xl bg-white rounded-full cursor-pointer" />
                                <span className="text-xs font-bold">Vista de producto</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right: Product Info (Sticky) */}
                    <div className="w-full lg:w-[45%] bg-white relative">
                        {/* Wrapper for sticky behavior */}
                        <div className="lg:sticky lg:top-[108px] w-full h-full lg:h-[calc(100vh-108px)] p-8 lg:p-16 xl:p-24 flex flex-col items-start overflow-y-auto no-scrollbar">
                            <div className="w-full max-w-md pt-8 lg:pt-16">
                                <h1 className="text-3xl lg:text-[2.5rem] font-bold tracking-tighter mb-4 leading-none">
                                    {producto.descripcion}
                                </h1>
                                <p className="text-lg font-bold text-gray-900 mb-10">
                                    S/. {price.toFixed(0)}
                                </p>

                                {/* Colors */}
                                <div className="flex gap-2.5 mb-10">
                                    {demoColors.map((hex, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setSelectedColor(i)} 
                                            className="relative w-[50px] h-[60px] rounded border transition-all p-1" 
                                            style={{ borderColor: i === selectedColor ? '#000' : '#E5E7EB' }}
                                        >
                                            <div className="w-full h-full rounded-[2px]" style={{ backgroundColor: hex }} />
                                        </button>
                                    ))}
                                </div>

                                {/* Size Selector */}
                                <div className="w-full mb-10">
                                    <div className="flex justify-between items-end mb-4">
                                        <span className="text-[11px] font-bold uppercase tracking-wider">TALLA: {demoSizes[selectedSize]}</span>
                                        <button className="text-[11px] font-bold uppercase tracking-wider border-b border-black hover:text-gray-500 hover:border-gray-500 transition-colors">GUÍA DE TALLAS</button>
                                    </div>
                                    <div className="grid grid-cols-6 gap-2 mb-4">
                                        {demoSizes.map((size, i) => (
                                            <button 
                                                key={size} 
                                                onClick={() => setSelectedSize(i)} 
                                                className={`h-[42px] text-[11px] font-bold tracking-widest uppercase border rounded transition-colors ${i === selectedSize ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-black'}`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] font-bold tracking-wide">
                                        <span className="text-gray-600">Elige tu talla habitual</span>
                                        <span className="text-[#3b8c6a]">DISPONIBLE</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 w-full mb-12">
                                    <button 
                                        onClick={onAddToCart} 
                                        className="flex-1 bg-black text-white h-[52px] rounded font-bold text-[11px] tracking-[0.2em] uppercase hover:bg-gray-800 transition-colors"
                                    >
                                        AGREGAR AL CARRITO
                                    </button>
                                    <button className="w-[52px] h-[52px] flex items-center justify-center border border-gray-200 rounded hover:border-black transition-colors text-gray-500 hover:text-black">
                                        <Icon icon="solar:heart-linear" className="text-xl" />
                                    </button>
                                </div>

                                {/* Trust Badges */}
                                <div className="flex flex-col gap-5 text-[11px] font-medium text-black">
                                    <div className="flex gap-4 items-center">
                                        <Icon icon="solar:box-linear" className="text-xl flex-shrink-0 text-gray-400" />
                                        <span>Entrega y recojo según configuración del negocio</span>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <Icon icon="solar:star-fall-linear" className="text-xl flex-shrink-0 text-gray-400" />
                                        <span>Precio visible: S/. {price.toFixed(2)}</span>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <Icon icon="solar:shield-check-linear" className="text-xl flex-shrink-0 text-gray-400" />
                                        <span>Compra protegida con seguimiento de pedido</span>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <Icon icon="solar:hand-stars-linear" className="text-xl flex-shrink-0 text-gray-400" />
                                        <span>Catálogo conectado a productos reales de la tienda</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Section 2: Description & Details (50/50 Inverted) ── */}
                <div className="flex flex-col-reverse lg:flex-row w-full border-t border-gray-200">
                    {/* Left: Text & Accordion */}
                    <div className="w-full lg:w-[50%] p-8 lg:p-16 xl:p-24 flex flex-col justify-center bg-white">
                        <div className="w-full max-w-lg mx-auto lg:mx-auto lg:mr-16">
                            
                            <AccordionItem title="DESCRIPCIÓN" id="DESCRIPCION">
                                <div className="text-[13px] leading-relaxed text-black font-medium pr-4">
                                    {producto.descripcionLarga || `${producto.descripcion} se muestra como producto destacado dentro de la experiencia Urbano. En tienda real se usará la descripción configurada por el negocio.`}
                                </div>
                            </AccordionItem>

                            <AccordionItem title="DETALLES" id="DETALLES">
                                <ul className="text-[13px] leading-relaxed text-gray-600 list-disc pl-4 space-y-2">
                                    <li>Precio: S/. {price.toFixed(2)}</li>
                                    <li>Categoría: {producto.categoria?.nombre || producto.categoria || 'Catálogo'}</li>
                                    <li>Marca: {producto.marca?.nombre || producto.marca || 'Tienda'}</li>
                                    <li>Stock visible según disponibilidad real del negocio</li>
                                </ul>
                            </AccordionItem>

                            <AccordionItem title="TALLAS Y VARIANTES" id="TALLAS">
                                <div className="text-[13px] leading-relaxed text-gray-600">
                                    Si el producto tiene colores, tallas o variantes, la tienda real mostrará las combinaciones disponibles y bloqueará las agotadas.
                                </div>
                            </AccordionItem>

                            <AccordionItem title="ENTREGA Y CAMBIOS" id="ENTREGA">
                                <div className="text-[13px] leading-relaxed text-gray-600">
                                    La entrega, recojo y medios de pago se aplican desde la configuración real del negocio.
                                </div>
                            </AccordionItem>
                            
                        </div>
                    </div>
                    
                    {/* Right: Macro Detail Image */}
                    <div className="w-full lg:w-[50%] h-[50vh] lg:h-auto overflow-hidden bg-[#F4F5F6]">
                        <img 
                            src={diseno?.urbanoProductMacroImg || "/assets/templates/urbano/coleccion2.png"} 
                            alt="Fabric Detail" 
                            className="w-full h-full object-cover mix-blend-multiply opacity-90 hover:scale-105 transition-transform duration-1000" 
                        />
                    </div>
                </div>

                {/* ── Section 3: Editorial Gallery (50/50) ── */}
                <div className="flex flex-col md:flex-row w-full h-auto lg:h-[120vh]">
                    <div className="w-full md:w-1/2 h-[60vh] lg:h-full overflow-hidden">
                        <img 
                            src={diseno?.urbanoProductModel1Img || "/assets/templates/urbano/coleccion3.png"} 
                            alt="Model Front" 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000" 
                        />
                    </div>
                    <div className="w-full md:w-1/2 h-[60vh] lg:h-full overflow-hidden">
                        <img 
                            src={diseno?.urbanoProductModel2Img || "/assets/templates/urbano/coleccion4.png"} 
                            alt="Model Detail" 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000" 
                        />
                    </div>
                </div>

                {/* ── Section 4: Similar Products (THE COLLECTION) ── */}
                {demo.products && demo.products.length > 0 && (
                    <div className="w-full py-16 lg:py-24 bg-white border-t border-gray-100">
                        <div className="w-full pl-4 md:pl-8 pr-4 md:pr-8 mb-10 flex justify-between items-center">
                            <h2 className="text-2xl md:text-[2rem] font-black tracking-tighter uppercase" style={{ fontFamily: '"Inter", sans-serif' }}>Productos similares</h2>
                            <button onClick={() => onNav('catalogo')} className="hidden md:flex text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
                                Ver catálogo
                            </button>
                        </div>

                        <div className="w-full relative group/slider py-4">
                            <button
                                type="button"
                                aria-label="Anterior"
                                onClick={() => scrollSlider(-1)}
                                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-11 h-11 md:w-12 md:h-12 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all duration-300"
                            >
                                <Icon icon="solar:alt-arrow-left-linear" width={22} />
                            </button>
                            <button
                                type="button"
                                aria-label="Siguiente"
                                onClick={() => scrollSlider(1)}
                                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-11 h-11 md:w-12 md:h-12 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all duration-300"
                            >
                                <Icon icon="solar:alt-arrow-right-linear" width={22} />
                            </button>
                            <div
                                ref={sliderRef}
                                className="flex gap-4 md:gap-8 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            >
                                {coleccionItems.map((item, idx) => {
                                    const target = demo.products[idx % demo.products.length] || demo.products[0];
                                    return (
                                        <div key={`col-${idx}`} className="w-[70vw] sm:w-[40vw] md:w-[30vw] xl:w-[22vw] flex-shrink-0 snap-start">
                                            <div
                                                className="flex flex-col group cursor-pointer"
                                                onClick={() => {
                                                    window.scrollTo(0, 0);
                                                    if (target) onProduct(target);
                                                }}
                                            >
                                                <div className="w-full aspect-[4/5] bg-[#F4F5F6] overflow-hidden mb-4 relative">
                                                    <img
                                                        src={item.img}
                                                        alt={item.titulo}
                                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                                    />
                                                </div>
                                                <div className="flex flex-col items-start w-full px-1">
                                                    <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 truncate pr-4 mb-1">
                                                        {item.titulo}
                                                    </h3>
                                                    <p className="text-[11px] font-bold text-gray-500 mb-3">
                                                        {item.precio}
                                                    </p>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-3.5 h-3.5 border border-gray-200" style={{ backgroundColor: item.c1 }} />
                                                        <div className="w-3.5 h-3.5 border border-gray-200" style={{ backgroundColor: item.c2 }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Footer ── */}
            <footer className="w-full bg-[#1A1A1A] text-white py-16 px-4 md:px-8 mt-auto">
                <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="flex flex-col gap-4">
                        <button onClick={() => onNav('home')} className="text-left text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">Inicio</button>
                        <button onClick={() => onNav('catalogo')} className="text-left text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">Catálogo</button>
                        <button onClick={() => onNav('detalle')} className="text-left text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">Detalle</button>
                        <button onClick={() => onNav('checkout')} className="text-left text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">Checkout</button>
                        <button onClick={() => onNav('checkout')} className="text-left text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">Seguimiento</button>
                    </div>
                    <div className="flex flex-col gap-4">
                        <button onClick={() => onNav('catalogo')} className="text-left text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">Productos</button>
                        <button onClick={() => onNav('checkout')} className="text-left text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">Pedido</button>
                        <button onClick={() => onNav('checkout')} className="text-left text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">Estado de pedido</button>
                        <button onClick={() => onNav('home')} className="text-left text-[10px] font-bold uppercase tracking-widest hover:opacity-70 transition-opacity">Tienda</button>
                    </div>
                    <div className="md:col-span-2 flex flex-col items-start md:items-end">
                        <h4 className="text-xl font-black tracking-tighter uppercase mb-2">{diseno?.urbanoFooterTitle || 'ATENCIÓN'}</h4>
                        <p className="text-[11px] text-gray-400 mb-6 text-left md:text-right max-w-sm">
                            {diseno?.urbanoFooterHelpText || 'En tienda real se usan los datos, pagos y canales de contacto configurados por el negocio.'}
                        </p>
                        <button onClick={() => onNav('checkout')} className="border border-gray-700 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white hover:text-black transition-colors">
                            Ver pedido
                        </button>
                    </div>
                </div>
                <div className="max-w-[1600px] mx-auto mt-20 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">© 2026 {diseno?.urbanoStoreName || demo.storeName || 'Urbano'}, Powered by {BRAND.name}</p>
                    <div className="flex gap-4">
                        <Icon icon="mdi:facebook" className="text-gray-500 hover:text-white transition-colors text-lg" />
                        <Icon icon="mdi:instagram" className="text-gray-500 hover:text-white transition-colors text-lg" />
                        <Icon icon="ic:baseline-tiktok" className="text-gray-500 hover:text-white transition-colors text-lg" />
                        <Icon icon="mdi:twitter" className="text-gray-500 hover:text-white transition-colors text-lg" />
                        <Icon icon="mdi:youtube" className="text-gray-500 hover:text-white transition-colors text-lg" />
                    </div>
                </div>
            </footer>
        </div>
    );
}
