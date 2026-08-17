# Farmacia Cierre C-D-E

**Fecha:** 2026-06-01  
**Estado:** Aprobado  
**Sub-proyectos:** C (Dashboard) · D (RENIEC) · E (Fraccionamiento)

---

## C — Dashboard Farmacéutico

Backend `GET /kardex/dashboard` agrega `farmacia` cuando rubro es farmacéutico.
Frontend `DashboardView.tsx` muestra sección condicional con 3 KPIs + 2 tablas.

## D — Validación DNI RENIEC en ModalRecetaMedica

Botón "Validar" en campo DNI de medicamentos controlados. Usa endpoint existente.
No bloquea si RENIEC falla — solo enriquece con nombre del paciente.

## E — Fraccionamiento en POS

Stock en unidad mínima (unidadVenta). factorConversion convierte al crear lote desde compra.
POS muestra selector CAJA/UNIDAD. Precio y stock se adaptan al modo seleccionado.
