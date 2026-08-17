# Libro de Control de Psicotrópicos y Estupefacientes (DIGEMID)

**Fecha:** 2026-06-01  
**Base legal:** DS 023-2001-SA  
**Aplica a:** Farmacia, Botica, Droguería  

## Columnas del libro (DS 023-2001-SA)

### ENTRADAS (desde Compras)
Fecha | Proveedor | N° Documento | Producto | Concentración | Forma Farmacéutica | Lote | Cantidad | Saldo

### SALIDAS (desde Comprobantes — solo producto.controlado=true)
Fecha | Paciente | DNI | N° Receta Especial | Médico | Producto | Concentración | Forma Farmacéutica | Lote | Cantidad | Saldo

## Backend
- `GET /kardex/libro-control-psicotropicos?fechaInicio=&fechaFin=&productoId=`
- Combina DetalleCompra + DetalleComprobante donde producto.controlado=true
- Saldo corrido calculado por producto en el backend

## Frontend
- Ruta: `/administrador/kardex/libro-control`
- Filtros: rango de fechas, producto específico (opcional)
- Tabla: ENTRADA/SALIDA combinadas con badge de tipo, saldo corrido
- Exportar CSV con formato del libro oficial
- Header con datos del establecimiento
