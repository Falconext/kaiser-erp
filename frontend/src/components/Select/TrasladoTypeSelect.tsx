import { ChangeEvent } from "react";
import Select from "../Select";

interface ITrasladoTypeSelectProps {
    value: string;
    name: string;
    onChange: (idValue: any, value: any, name: any, id: any) => void;
    error?: string;
    label?: string;
}

// Catálogo SUNAT N° 20 — Motivo de traslado (códigos oficiales).
const TRASLADO_TYPES = [
    { id: "01", value: "VENTA" },
    { id: "02", value: "COMPRA" },
    { id: "03", value: "VENTA CON ENTREGA A TERCEROS" },
    { id: "04", value: "TRASLADO ENTRE ESTABLECIMIENTOS DE LA MISMA EMPRESA" },
    { id: "05", value: "CONSIGNACIÓN" },
    { id: "06", value: "DEVOLUCIÓN" },
    { id: "07", value: "RECOJO DE BIENES TRANSFORMADOS" },
    { id: "08", value: "IMPORTACIÓN" },
    { id: "09", value: "EXPORTACIÓN" },
    { id: "13", value: "OTROS" },
    { id: "14", value: "VENTA SUJETA A CONFIRMACIÓN DEL COMPRADOR" },
    { id: "17", value: "TRASLADO DE BIENES PARA TRANSFORMACIÓN" },
    { id: "18", value: "TRASLADO POR EMISOR ITINERANTE DE COMPROBANTES DE PAGO" },
    { id: "19", value: "TRASLADO DE MERCANCÍA EXTRANJERA" },
];

const TrasladoTypeSelect = ({ value, name, onChange, error, label = "Motivo de Traslado" }: ITrasladoTypeSelectProps) => {
    return (
        <Select
            value={TRASLADO_TYPES.find(t => t.id === value)?.value || ""}
            defaultValue={value}
            options={TRASLADO_TYPES}
            name={name}
            id={name}
            onChange={onChange}
            label={label}
            error={error}
            isIcon
            icon="heroicons:truck"
        />
    );
};

export default TrasladoTypeSelect;
