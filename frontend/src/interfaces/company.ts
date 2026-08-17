export interface IFormCompany {
    id: number;
    ruc: string;
    razonSocial: string;
    direccion: string;
    logo?: any;
    planId: number;
    departamento: string,
    provincia: string,
    distrito: string
    tipoNombre: string
    nombreComercial: string
    planNombre: string
    tipoEmpresa: string
    // Régimen tributario SUNAT: GENERAL | RER | MYPE | RUS. En RUS solo se emiten boletas.
    regimenTributario?: string
    maxSedes?: number
    ubigeo: string
    fechaActivacion: any;
    fechaExpiracion: any;
    rubroId: number
    rubroNombre: string
    brand?: string
    producto?: string
}
