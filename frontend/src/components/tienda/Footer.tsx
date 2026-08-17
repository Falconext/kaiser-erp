import { Icon } from '@iconify/react';
import { BRAND } from '@/lib/branding';
import { buildStorePurchaseWhatsappUrl, normalizeStoreWhatsapp } from '@/utils/storeWhatsapp';

interface FooterProps {
    tienda: any;
    diseno: any;
}

export default function Footer({ tienda, diseno }: FooterProps) {
    const year = new Date().getFullYear();
    const cp = diseno?.colorPrimario || '#FF9500';
    const phone = normalizeStoreWhatsapp(tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda ?? diseno?.whatsappTienda);
    const whatsappUrl = buildStorePurchaseWhatsappUrl(phone, `Hola, vengo de ${tienda.nombreComercial || 'la tienda'} y quisiera información.`);

    const socialLinks = [
        { key: 'instagramUrl', icon: 'mdi:instagram' },
        { key: 'facebookUrl', icon: 'ic:baseline-facebook' },
        { key: 'tiktokUrl', icon: 'ic:baseline-tiktok' },
        { key: 'linkedinUrl', icon: 'mdi:linkedin' },
        { key: 'youtubeUrl', icon: 'mdi:youtube' },
    ];

    return (
        <footer className="bg-white border-t border-gray-100 font-sans">
            <div className="max-w-screen-xl mx-auto px-6 md:px-8 pt-12 pb-6">

                {/* Main Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">

                    {/* Col 1: Brand + Social */}
                    <div className="col-span-2 md:col-span-1">
                        {/* Logo */}
                        <div className="flex items-center gap-2 mb-4">
                            {tienda.logo ? (
                                <img src={tienda.logo} alt={tienda.nombreComercial} className="h-10 w-auto object-contain" />
                            ) : (
                                <>
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: cp }}>
                                        <Icon icon="solar:shop-bold" className="text-white" width={18} />
                                    </div>
                                    <span className="text-xl font-black text-[#1A1A1A]">
                                        {tienda.nombreComercial || 'Mi Tienda'}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Social Icons */}
                        <div className="flex gap-3 mt-5">
                            {socialLinks.map(({ key, icon }) =>
                                tienda[key] ? (
                                    <a
                                        key={key}
                                        href={tienda[key]}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-9 h-9 rounded-full flex items-center justify-center transition-colors group"
                                        style={{ background: `${cp}18` }}
                                    >
                                        <Icon icon={icon} width={18} style={{ color: cp }} />
                                    </a>
                                ) : null
                            )}
                            {/* Show at least 3 social placeholders if none */}
                            {!socialLinks.some(s => tienda[s.key]) && (
                                <>
                                    {['mdi:instagram', 'ic:baseline-facebook', 'mdi:youtube'].map(icon => (
                                        <div key={icon} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${cp}18` }}>
                                            <Icon icon={icon} width={18} style={{ color: cp }} />
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Col 2: Empresa */}
                    <div>
                        <h4 className="text-xs font-bold text-[#999] uppercase tracking-widest mb-4">Empresa</h4>
                        <ul className="space-y-3">
                            {['Sobre Nosotros', 'Contacto', 'Delivery y Pagos'].map(link => (
                                <li key={link}>
                                    <a href="#" className="text-sm text-[#333] transition-colors">{link}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 3: Atención al Cliente */}
                    <div>
                        <h4 className="text-xs font-bold text-[#999] uppercase tracking-widest mb-4">Atención</h4>
                        <ul className="space-y-3">
                            {['Devoluciones', 'Preguntas Frecuentes', 'Privacidad', 'Términos'].map(link => (
                                <li key={link}>
                                    <a href="#" className="text-sm text-[#333] transition-colors">{link}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 4: Categorías */}
                    <div>
                        <h4 className="text-xs font-bold text-[#999] uppercase tracking-widest mb-4">Productos</h4>
                        <ul className="space-y-3">
                            {['Nuevos Ingresos', 'Más Vendidos', 'Ofertas', 'Kits & Combos', 'Por Mayor'].map(link => (
                                <li key={link}>
                                    <a href="#" className="text-sm text-[#333] transition-colors">{link}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Col 5: Contacto */}
                    <div>
                        <h4 className="text-xs font-bold text-[#999] uppercase tracking-widest mb-4">Contacto</h4>
                        <ul className="space-y-3">
                            {phone && (
                                <li>
                                    <a
                                        href={whatsappUrl ?? undefined}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-[#333] transition-colors"
                                    >
                                        {phone}
                                    </a>
                                </li>
                            )}
                            {tienda.correo || tienda.email ? (
                                <li>
                                    <a href={`mailto:${tienda.correo || tienda.email}`} className="text-sm text-[#333] transition-colors break-all">
                                        {tienda.correo || tienda.email}
                                    </a>
                                </li>
                            ) : (
                                <li><span className="text-sm text-[#333]">contacto@tienda.com</span></li>
                            )}
                            {tienda.direccion && (
                                <li><span className="text-sm text-[#333]">{tienda.direccion}</span></li>
                            )}
                            {tienda.horarioAtencion && (
                                <li className="flex items-start gap-2 pt-1">
                                    <Icon icon="mdi:clock-outline" width={15} className="mt-0.5 flex-shrink-0" style={{ color: cp }} />
                                    <span className="text-sm text-[#333] whitespace-pre-line">{tienda.horarioAtencion}</span>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-100 pt-5 flex flex-col md:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-[#999]">
                        &copy; {tienda.nombreComercial || 'Mi Tienda'} {year} — porque tus clientes merecen lo mejor 🐾
                    </p>
                    <p className="text-xs text-[#BBB]">
                        Powered by <span className="font-bold" style={{ color: cp }}>{BRAND.name}</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
