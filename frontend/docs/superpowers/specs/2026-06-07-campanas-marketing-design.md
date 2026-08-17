# Spec: Campañas de Marketing

**Fecha:** 2026-06-07  
**Módulo:** Marketing → Campañas  
**Alcance:** Backend (NestJS + Prisma) + Frontend (React)

---

## Contexto y problema

Los dueños de ecommerce peruano invierten diariamente en Meta (Facebook + Instagram + WhatsApp) y TikTok para impulsar sus productos estrella. Sin visibilidad del costo de adquisición por producto, el P&L muestra una ganancia ficticia — ignora el mayor gasto variable del negocio.

Dos perfiles de usuario:
- **Ecommerce enfocado**: 1 producto estrella, 1-2 plataformas activas, campañas largas.
- **Textil / zapatillas**: 3-6 productos en paralelo, múltiples campañas simultáneas.

El sistema debe cubrir ambos sin complejidad innecesaria.

---

## Decisiones de diseño (validadas con el usuario)

| Decisión | Elección |
|----------|----------|
| Ubicación en el admin | Sección propia **"Marketing"** en el sidebar |
| Atribución de ventas | **Automática** (comprobantes del producto en el período) + override manual opcional |
| Campos del formulario | Nombre, Plataforma, Producto, Presupuesto diario, Moneda (S//$), Fecha inicio, Fecha fin (opcional) |
| Estados de campaña | ACTIVA / PAUSADA / FINALIZADA |
| Plataformas soportadas | META, TIKTOK, GOOGLE, OTRO |

---

## Modelo de datos (Backend — Prisma)

```prisma
model CampanaMarketing {
  id                Int             @id @default(autoincrement())
  empresaId         Int
  nombre            String
  plataforma        PlataformaAds
  productoId        Int?
  presupuestoDiario Decimal         @db.Decimal(10, 2)
  moneda            String          @default("PEN")   // "PEN" | "USD"
  fechaInicio       DateTime
  fechaFin          DateTime?       // null = campaña continua
  estado            EstadoCampana   @default(ACTIVA)
  ventasAjustadas   Int?            // override manual; null = usar automático
  creadoEn          DateTime        @default(now())
  actualizadoEn     DateTime        @updatedAt

  empresa           Empresa         @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  producto          Producto?       @relation(fields: [productoId], references: [id], onDelete: SetNull)

  @@index([empresaId, estado])
  @@index([empresaId, productoId])
  @@index([fechaInicio, fechaFin])
}

enum PlataformaAds {
  META
  TIKTOK
  GOOGLE
  OTRO
}

enum EstadoCampana {
  ACTIVA
  PAUSADA
  FINALIZADA
}
```

Relaciones a agregar en modelos existentes:
- `Empresa`: `campanas CampanaMarketing[]`
- `Producto`: `campanas CampanaMarketing[]`

---

## API (Backend — NestJS)

Módulo: `src/campanas/`  
Ruta base: `/api/campanas`  
Guards: `JwtAuthGuard`, `RolesGuard` — acceso `ADMIN_EMPRESA` o superior.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/campanas?mes=6&anio=2026` | Lista campañas del período con métricas calculadas |
| `POST` | `/campanas` | Crear campaña |
| `PATCH` | `/campanas/:id` | Editar / pausar / reactivar |
| `PATCH` | `/campanas/:id/ventas` | Override manual de ventas atribuidas |
| `DELETE` | `/campanas/:id` | Eliminar campaña |

### Respuesta de GET /campanas (con métricas)

```typescript
{
  mes: number;
  anio: number;
  resumen: {
    gastoTotalEstimado: number;       // suma de todas las campañas
    ventasAtribuidas: number;          // suma total
    cpaPromedio: number;               // gastoTotal / ventasTotal
    roas: number;                      // ingresos atribuidos / gastoTotal
  };
  campanas: CampanaConMetricas[];
}

interface CampanaConMetricas {
  id: number;
  nombre: string;
  plataforma: PlataformaAds;
  producto: { id: number; descripcion: string; precioUnitario: number; costoUnitario: number; costoFijo: number } | null;
  presupuestoDiario: number;
  moneda: string;
  fechaInicio: string;
  fechaFin: string | null;
  estado: EstadoCampana;
  // calculados
  diasActivos: number;               // días ACTIVA dentro del mes consultado
  gastoEstimado: number;             // presupuestoDiario × diasActivos
  ventasAtribuidas: number;          // ventasAjustadas ?? count de comprobantes del producto en el período
  ventasAjustadas: number | null;    // override manual si existe
  ingresoAtribuido: number;          // precioUnitario × ventasAtribuidas
  cpa: number;                       // gastoEstimado / ventasAtribuidas
  roas: number;                      // ingresoAtribuido / gastoEstimado
  // mini P&L por unidad
  pnlUnidad: {
    precio: number;
    costoProducto: number;
    costoFijo: number;               // envío/empaque por unidad
    costoCpa: number;                // CPA de esta campaña
    gananciaReal: number;            // precio - costoProducto - costoFijo - costoCpa
  } | null;
}
```

### Lógica de cálculo (service)

```
diasActivos = días dentro del mes [fechaInicio, min(fechaFin ?? hoy, fin_del_mes)]
              donde estado = ACTIVA (pausas descuentan días si se implementan en v2)

gastoEstimado = presupuestoDiario × diasActivos

ventasAtribuidas =
  si ventasAjustadas != null → ventasAjustadas
  si no → SUM(ComprobanteDetalle.cantidad)
          WHERE productoId = X
            AND Comprobante.fechaEmision BETWEEN fechaInicio AND min(fechaFin ?? hoy, fin_del_mes)
            AND Comprobante.estadoEnvioSunat != 'ANULADO'
  // cuenta unidades vendidas, no número de comprobantes

cpa = gastoEstimado / ventasAtribuidas  (0 si ventas = 0)
roas = (precioUnitario × ventasAtribuidas) / gastoEstimado  (0 si gasto = 0)
```

---

## Frontend

### Navegación

Nuevo ítem en `AdminLayout.tsx` sidebar:

```
Marketing
  └── Campañas  →  /administrador/marketing/campanas
```

Ícono: `solar:target-bold-duotone`  
Requiere módulo: `MARKETING` (nuevo) o sin restricción en v1 para simplificar.

### Estructura de archivos

```
src/features/admin/marketing/
  campanas/
    CampanasView.tsx          ← vista principal (lista + KPIs)
    CampanaFormModal.tsx      ← modal crear / editar
    useCampanasViewModel.ts   ← lógica, fetch, estado
    CampanasModel.ts          ← interfaces, constantes

src/pages/admin/marketing/
  Campanas.tsx                ← página wrapper (lazy import)

src/app/AdminApp.tsx          ← nueva ruta /marketing/campanas
```

### CampanasView — estructura visual

```
[Header: "Campañas de Publicidad"]          [+ Nueva Campaña]

[KPIs: Gasto mes | Ventas atribuidas | CPA promedio | ROAS]

[Tabs: Todas | META | TIKTOK | Otro]     [Selector mes/año]

[CampañaCard]
  ├── Badge plataforma + nombre + producto + estado + acciones
  └── Métricas: presupuesto/día | días activos | gasto est. | ventas | CPA
      Mini P&L: precio - costo - envío - ads = ganancia real/unidad
```

### CampanaFormModal — campos

```
Nombre (text, required)
Plataforma (toggle: META / TIKTOK / OTRO)
Producto estrella (selector buscable, opcional)
Presupuesto diario (number) + Moneda toggle (S/ | $)
Fecha inicio (date, required)
Fecha fin (date, opcional — default: campaña continua)

Vista previa en tiempo real:
  S/ X/día × N días = gasto estimado S/ Y (±20%)
```

### Estados de campaña

- **ACTIVA** → badge verde, botón "Pausar"
- **PAUSADA** → badge gris, botón "Activar"
- Botón "Editar" siempre visible
- Sin botón de eliminar en la card (acción destructiva — solo en edición)

---

## Integración con P&L

El módulo de Rentabilidad (`analisis-financiero.service.ts`) **no se modifica** en v1. El CPA se muestra únicamente en la pantalla de Campañas (mini P&L por unidad dentro de cada card).

En v2 se puede agregar la línea `costoPublicidad` al P&L mensual sumando el gasto de todas las campañas activas del período.

---

## Límites de alcance (fuera de v1)

- Integración automática con la API de Facebook/TikTok (requiere OAuth por empresa)
- Tracking de pausas parciales dentro de un mes (descuento exacto de días pausados)
- Múltiples productos por campaña con distribución porcentual de presupuesto
- Alertas de ROAS bajo umbral configurable
- Historial de cambios de presupuesto

---

## Criterios de éxito

1. El dueño puede crear una campaña en menos de 60 segundos.
2. Al entrar a Marketing ve de inmediato su CPA y ROAS del mes.
3. El mini P&L de cada campaña muestra la ganancia real por unidad vendida incluyendo ads.
4. Un negocio con 5 campañas paralelas (textil) puede verlas todas en una sola pantalla sin scrollear en desktop.
