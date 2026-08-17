import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './usuarios/usuarios.module';
import { EmpresaModule } from './empresa/empresa.module';
import { CategoriaModule } from './categoria/categoria.module';
import { ClienteModule } from './cliente/cliente.module';
import { ProductoModule } from './producto/producto.module';
import { ComprobanteModule } from './comprobante/comprobante.module';
import { KardexModule } from './kardex/kardex.module';
import { ExtensionesModule } from './extensiones/extensiones.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ContabilidadModule } from './contabilidad/contabilidad.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { PagoModule } from './pago/pago.module';
import { CajaModule } from './caja/caja.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { S3Module } from './s3/s3.module';
import { MarcaModule } from './marca/marca.module';
import { RubroModule } from './rubro/rubro.module';
import { ComprasModule } from './compras/compras.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { GuiaRemisionModule } from './guia-remision/guia-remision.module';
import { SedeModule } from './sede/sede.module';
import { ProduccionModule } from './produccion/produccion.module';
import { BrandingModule } from './branding/branding.module';
import { ReservaModule } from './reserva/reserva.module';
import { DigemidModule } from './digemid/digemid.module';
import { RepartidorModule } from './repartidor/repartidor.module';
import { EnvioDespachoModule } from './envio-despacho/envio-despacho.module';
import { ComisionesModule } from './comisiones/comisiones.module';
import { VentasModule } from './ventas/ventas.module';
import { TipoCambioModule } from './tipo-cambio/tipo-cambio.module';
import { FlujoComercialModule } from './flujo-comercial/flujo-comercial.module';

// ─── Kaiser ERP ──────────────────────────────────────────────────────────────
// ERP mono-empresa para Kaiser Corporation S.A. Derivado del monorepo Falconext,
// con la capa SaaS multi-tenant retirada (planes, suscripciones, resellers,
// tienda pública, marketing/e-commerce). Ver CLAUDE.md para el mapa de módulos.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EmpresaModule,
    SedeModule,
    // Catálogo
    CategoriaModule,
    MarcaModule,
    RubroModule,
    ProductoModule,
    DigemidModule,
    // Inventario
    KardexModule,
    ReservaModule,
    // Compras / Ventas / Cobros
    ComprasModule,
    ClienteModule,
    VentasModule,
    PagoModule,
    CajaModule,
    ComisionesModule,
    // Producción (BOM / órdenes)
    ProduccionModule,
    // Facturación SUNAT + despacho
    ComprobanteModule,
    GuiaRemisionModule,
    EnvioDespachoModule,
    RepartidorModule,
    // Gestión / finanzas
    DashboardModule,
    FinanzasModule,
    ContabilidadModule,
    TipoCambioModule,
    FlujoComercialModule,
    // Infraestructura
    ExtensionesModule,
    SchedulerModule,
    NotificacionesModule,
    WhatsAppModule,
    S3Module,
    BrandingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
