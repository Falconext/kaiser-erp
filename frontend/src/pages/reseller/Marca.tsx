import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/zustand/auth';
import { useResellerPanelStore } from '@/zustand/reseller-panel';
import apiClient from '@/utils/apiClient';
import { useDebounce } from '@/hooks/useDebounce';

const empty = {
    whiteLabelNombre: '',
    dominioPersonalizado: '',
    whiteLabelLogoUrl: '',
    whiteLabelLogoWhiteUrl: '',
    whiteLabelFaviconUrl: '',
    whiteLabelColorPrimario: '#7551FF',
    whiteLabelColorSecundario: '#312E81',
    whiteLabelWebsite: '',
    whiteLabelEmail: '',
    whiteLabelTelefono: '',
    whiteLabelWhatsapp: '',
};

export default function ResellerMarca() {
    const navigate = useNavigate();
    const { auth } = useAuthStore();
    const { branding, getBranding, updateBranding, checkDominio } = useResellerPanelStore();
    const [form, setForm] = useState(empty);
    const [uploading, setUploading] = useState<string | null>(null);
    const [domState, setDomState] = useState<{ checking: boolean; result: { disponible: boolean; motivo?: string } | null }>({ checking: false, result: null });

    const baseDomain = branding?.baseDomain || 'vendify.pe';
    const debouncedDom = useDebounce(form.dominioPersonalizado, 500);

    useEffect(() => {
        if (auth?.resellerId) getBranding(auth.resellerId);
    }, [auth, getBranding]);

    useEffect(() => {
        if (branding) {
            setForm({
                whiteLabelNombre: branding.whiteLabelNombre || '',
                dominioPersonalizado: branding.dominioPersonalizado || '',
                whiteLabelLogoUrl: branding.whiteLabelLogoUrl || '',
                whiteLabelLogoWhiteUrl: branding.whiteLabelLogoWhiteUrl || '',
                whiteLabelFaviconUrl: branding.whiteLabelFaviconUrl || '',
                whiteLabelColorPrimario: branding.whiteLabelColorPrimario || '#7551FF',
                whiteLabelColorSecundario: branding.whiteLabelColorSecundario || '#312E81',
                whiteLabelWebsite: branding.whiteLabelWebsite || '',
                whiteLabelEmail: branding.whiteLabelEmail || '',
                whiteLabelTelefono: branding.whiteLabelTelefono || '',
                whiteLabelWhatsapp: branding.whiteLabelWhatsapp || '',
            });
        }
    }, [branding]);

    const dominioSinCambios = (branding?.dominioPersonalizado || '') === form.dominioPersonalizado.trim();

    useEffect(() => {
        const dom = debouncedDom.trim();
        if (!dom || dominioSinCambios || !auth?.resellerId) {
            setDomState({ checking: false, result: null });
            return;
        }
        let active = true;
        setDomState({ checking: true, result: null });
        checkDominio(auth.resellerId, dom).then((r) => {
            if (active) setDomState({ checking: false, result: r });
        });
        return () => { active = false; };
    }, [debouncedDom, dominioSinCambios, auth, checkDominio]);

    const set = (k: keyof typeof empty, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const handleUpload = async (field: keyof typeof empty, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !auth?.resellerId) return;
        setUploading(field);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const resp: any = await apiClient.post(`/resellers/${auth.resellerId}/upload-logo`, fd);
            const url = resp.data?.data?.url ?? resp.data?.url ?? '';
            if (url) set(field, url);
        } finally {
            setUploading(null);
        }
    };

    const domInvalido = !!form.dominioPersonalizado.trim() && !dominioSinCambios && domState.result && !domState.result.disponible;

    const onSave = async () => {
        if (!auth?.resellerId || domInvalido) return;
        await updateBranding(auth.resellerId, { ...form });
    };

    const previewUrl = useMemo(() => {
        const dom = form.dominioPersonalizado.trim();
        return dom ? `https://${dom}` : '';
    }, [form.dominioPersonalizado]);

    const checklist = [
        { label: 'Nombre de tu marca', done: !!form.whiteLabelNombre.trim() },
        { label: 'Dominio propio', done: !!form.dominioPersonalizado.trim() },
        { label: 'Logo principal', done: !!form.whiteLabelLogoUrl },
        { label: 'Colores definidos', done: !!form.whiteLabelColorPrimario && !!form.whiteLabelColorSecundario },
    ];
    const completos = checklist.filter((c) => c.done).length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Mi Marca Blanca</h1>
                <p className="text-slate-500">Personaliza cómo ven tus clientes tu plataforma: dominio, nombre, logo y colores.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Formulario */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Identidad */}
                    <Section icon="solar:tag-bold-duotone" title="Identidad">
                        <Field label="Nombre de tu marca">
                            <input value={form.whiteLabelNombre} onChange={(e) => set('whiteLabelNombre', e.target.value)} placeholder="Mi Sistema SAC" className={inputCls} />
                        </Field>
                        <Field label="Subdominio o dominio propio" hint={`Ej. tuempresa.${baseDomain} o tudominio.com`}>
                            <input value={form.dominioPersonalizado} onChange={(e) => set('dominioPersonalizado', e.target.value.toLowerCase())} placeholder={`tuempresa.${baseDomain}`} className={inputCls} />
                            {form.dominioPersonalizado.trim() && !dominioSinCambios && (
                                <div className="mt-1.5 text-xs flex items-center gap-1.5">
                                    {domState.checking ? (
                                        <span className="text-slate-400 flex items-center gap-1"><Icon icon="eos-icons:loading" /> Verificando…</span>
                                    ) : domState.result ? (
                                        domState.result.disponible ? (
                                            <span className="text-emerald-600 flex items-center gap-1"><Icon icon="solar:check-circle-bold" /> Disponible</span>
                                        ) : (
                                            <span className="text-red-500 flex items-center gap-1"><Icon icon="solar:close-circle-bold" /> {domState.result.motivo || 'No disponible'}</span>
                                        )
                                    ) : null}
                                </div>
                            )}
                        </Field>
                    </Section>

                    {/* Logos */}
                    <Section icon="solar:gallery-bold-duotone" title="Logos e ícono">
                        <LogoField label="Logo principal (fondo claro)" value={form.whiteLabelLogoUrl} uploading={uploading === 'whiteLabelLogoUrl'} onUpload={(e) => handleUpload('whiteLabelLogoUrl', e)} onUrl={(v) => set('whiteLabelLogoUrl', v)} dark={false} />
                        <LogoField label="Logo claro (fondo oscuro)" value={form.whiteLabelLogoWhiteUrl} uploading={uploading === 'whiteLabelLogoWhiteUrl'} onUpload={(e) => handleUpload('whiteLabelLogoWhiteUrl', e)} onUrl={(v) => set('whiteLabelLogoWhiteUrl', v)} dark />
                        <LogoField label="Favicon" value={form.whiteLabelFaviconUrl} uploading={uploading === 'whiteLabelFaviconUrl'} onUpload={(e) => handleUpload('whiteLabelFaviconUrl', e)} onUrl={(v) => set('whiteLabelFaviconUrl', v)} dark={false} />
                    </Section>

                    {/* Colores */}
                    <Section icon="solar:palette-bold-duotone" title="Colores">
                        <div className="grid grid-cols-2 gap-4">
                            <ColorField label="Color primario" value={form.whiteLabelColorPrimario} onChange={(v) => set('whiteLabelColorPrimario', v)} />
                            <ColorField label="Color secundario" value={form.whiteLabelColorSecundario} onChange={(v) => set('whiteLabelColorSecundario', v)} />
                        </div>
                    </Section>

                    {/* Contacto */}
                    <Section icon="solar:phone-bold-duotone" title="Contacto (opcional)">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Sitio web"><input value={form.whiteLabelWebsite} onChange={(e) => set('whiteLabelWebsite', e.target.value)} placeholder="https://…" className={inputCls} /></Field>
                            <Field label="Email"><input value={form.whiteLabelEmail} onChange={(e) => set('whiteLabelEmail', e.target.value)} placeholder="hola@tumarca.com" className={inputCls} /></Field>
                            <Field label="Teléfono"><input value={form.whiteLabelTelefono} onChange={(e) => set('whiteLabelTelefono', e.target.value)} placeholder="999 999 999" className={inputCls} /></Field>
                            <Field label="WhatsApp"><input value={form.whiteLabelWhatsapp} onChange={(e) => set('whiteLabelWhatsapp', e.target.value)} placeholder="51 999 999 999" className={inputCls} /></Field>
                        </div>
                    </Section>

                    <button onClick={onSave} disabled={!!domInvalido}
                        className="w-full py-3 btn-accent font-bold rounded-xl shadow-lg shadow-black/20 transition-all active:scale-95 disabled:opacity-50">
                        Guardar cambios
                    </button>
                </div>

                {/* Vista previa */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-4">
                        {/* Completitud de la marca */}
                        <div className="rounded-3xl bg-white shadow-sm border border-slate-100 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tu marca</p>
                                <span className="text-xs font-extrabold text-violet-600">{completos}/{checklist.length}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-3">
                                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(completos / checklist.length) * 100}%` }} />
                            </div>
                            <ul className="space-y-1.5">
                                {checklist.map((c) => (
                                    <li key={c.label} className="flex items-center gap-2 text-xs">
                                        <Icon icon={c.done ? 'solar:check-circle-bold' : 'solar:close-circle-linear'} className={c.done ? 'text-emerald-500' : 'text-slate-300'} width={15} />
                                        <span className={c.done ? 'text-slate-600' : 'text-slate-400'}>{c.label}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Vista previa: así lo verá tu cliente */}
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Así lo verá tu cliente</p>
                        <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200">
                                <div className="flex gap-1">
                                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0 flex items-center gap-1.5 bg-white rounded-md px-2 py-1 text-[11px] text-slate-500">
                                    {form.whiteLabelFaviconUrl ? <img src={form.whiteLabelFaviconUrl} alt="" className="h-3 w-3 rounded object-contain" /> : <Icon icon="solar:lock-keyhole-minimalistic-bold" width={11} />}
                                    <span className="truncate">{form.dominioPersonalizado.trim() || `tuempresa.${baseDomain}`}</span>
                                </div>
                            </div>
                            <div className="p-5" style={{ background: `linear-gradient(135deg, ${form.whiteLabelColorPrimario}1f, ${form.whiteLabelColorSecundario}1f)` }}>
                                <div className="mx-auto max-w-[230px] rounded-2xl bg-white shadow-md p-5 text-center">
                                    {form.whiteLabelLogoUrl ? (
                                        <img src={form.whiteLabelLogoUrl} alt="logo" className="h-10 mx-auto object-contain mb-2" />
                                    ) : (
                                        <div className="h-10 w-10 mx-auto rounded-xl grid place-items-center text-white font-bold mb-2" style={{ background: form.whiteLabelColorPrimario }}>
                                            {(form.whiteLabelNombre || 'M').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <p className="font-extrabold text-slate-800 text-sm">{form.whiteLabelNombre || 'Tu Marca'}</p>
                                    <p className="text-[10px] text-slate-400 mb-3">Inicia sesión en tu sistema</p>
                                    <div className="space-y-2 mb-3">
                                        <div className="h-7 rounded-lg bg-slate-100" />
                                        <div className="h-7 rounded-lg bg-slate-100" />
                                    </div>
                                    <button className="w-full py-2 rounded-lg text-white text-xs font-bold" style={{ background: form.whiteLabelColorPrimario }}>Ingresar</button>
                                </div>
                            </div>
                        </div>

                        {previewUrl && (
                            <div className="flex items-center gap-2">
                                <a href={previewUrl} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-center text-sm text-violet-600 font-semibold hover:underline">{previewUrl}</a>
                                <button onClick={() => navigator.clipboard?.writeText(previewUrl)} title="Copiar enlace" className="h-8 w-8 shrink-0 grid place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><Icon icon="solar:copy-linear" width={15} /></button>
                            </div>
                        )}

                        {/* Cómo activar la marca en un cliente */}
                        <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                            <p className="text-xs font-bold text-violet-700 mb-2 flex items-center gap-1.5"><Icon icon="solar:info-circle-bold-duotone" width={16} /> ¿Cómo activo mi marca en un cliente?</p>
                            <ol className="text-xs text-violet-700/90 space-y-1 list-decimal list-inside">
                                <li>Guarda esta configuración.</li>
                                <li>Ve a <b>Mis Clientes</b> → editar el cliente.</li>
                                <li>Activa <b>“Este cliente opera bajo tu marca”</b>.</li>
                            </ol>
                            <button onClick={() => navigate('/reseller/clientes')} className="mt-3 text-xs font-bold text-violet-600 hover:underline">Ir a Mis Clientes →</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400';

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4 text-slate-800">
                <Icon icon={icon} className="text-indigo-500 text-xl" />
                <h3 className="font-bold">{title}</h3>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-xs font-semibold text-slate-600">{label}</label>
            <div className="mt-1">{children}</div>
            {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
        </div>
    );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="text-xs font-semibold text-slate-600">{label}</label>
            <div className="mt-1 flex items-center gap-2">
                <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer" />
                <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
            </div>
        </div>
    );
}

function LogoField({ label, value, uploading, onUpload, onUrl, dark }: { label: string; value: string; uploading: boolean; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onUrl: (v: string) => void; dark: boolean }) {
    return (
        <div>
            <label className="text-xs font-semibold text-slate-600">{label}</label>
            <div className="mt-1 flex items-center gap-3">
                <div className={`w-16 h-16 rounded-xl border grid place-items-center overflow-hidden flex-shrink-0 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    {uploading ? (
                        <Icon icon="eos-icons:loading" className={dark ? 'text-white' : 'text-slate-400'} />
                    ) : value ? (
                        <img src={value} alt={label} className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                        <Icon icon="solar:gallery-add-bold-duotone" className={dark ? 'text-slate-500' : 'text-slate-300'} width="24" />
                    )}
                </div>
                <div className="flex-1 space-y-1.5">
                    <input value={value} onChange={(e) => onUrl(e.target.value)} placeholder="Pega una URL o sube un archivo" className={inputCls} />
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 cursor-pointer hover:underline">
                        <Icon icon="solar:upload-minimalistic-bold" width="14" /> Subir archivo
                        <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                    </label>
                </div>
            </div>
        </div>
    );
}
