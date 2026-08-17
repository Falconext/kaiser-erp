import React from 'react';
import type { 
  TemplateHomePageProps, 
  TemplateCatalogoPageProps, 
  TemplateCheckoutPageProps,
  TemplateSeguimientoPageProps
} from './shared/types';

// Moda
import ModaHomePage from './moda/ModaHomePage';
import ModaCatalogoPage from './moda/ModaCatalogoPage';
import ModaCheckoutPage from './moda/ModaCheckoutPage';
import ModaSeguimientoPage from './moda/ModaSeguimientoPage';

// Autopartes
import AutopartesHomePage from './autopartes/AutopartesHomePage';
import AutopartesCatalogoPage from './autopartes/AutopartesCatalogoPage';
import AutopartesCheckoutPage from './autopartes/AutopartesCheckoutPage';

// Tecnologia
import TecnologiaHomePage from './tecnologia/TecnologiaHomePage';
import TecnologiaCatalogoPage from './tecnologia/TecnologiaCatalogoPage';
import TecnologiaCheckoutPage from './tecnologia/TecnologiaCheckoutPage';

// Maye
import MayeHomePage from './maye/MayeHomePage';
import MayeCatalogoPage from './maye/MayeCatalogoPage';
import MayeCheckoutPage from './maye/MayeCheckoutPage';

// Gadgets
import GadgetsHomePage from './gadgets/GadgetsHomePage';
import GadgetsCatalogoPage from './gadgets/GadgetsCatalogoPage';
import GadgetsCheckoutPage from './gadgets/GadgetsCheckoutPage';

// Urbano
import UrbanoHomePage from './urbano/UrbanoHomePage';
import UrbanoCatalogoPage from './urbano/UrbanoCatalogoPage';
import UrbanoCheckoutPage from './urbano/UrbanoCheckoutPage';
import UrbanoSeguimientoPage from './urbano/UrbanoSeguimientoPage';

// Apicultura
import ApiculturaHomePage from './apicultura/ApiculturaHomePage';
import ApiculturaCatalogoPage from './apicultura/ApiculturaCatalogoPage';
import ApiculturaCheckoutPage from './apicultura/ApiculturaCheckoutPage';

// Construccion
import ConstruccionHomePage from './construccion/ConstruccionHomePage';
import ConstruccionCatalogoPage from './construccion/ConstruccionCatalogoPage';
import ConstruccionCheckoutPage from './construccion/ConstruccionCheckoutPage';

// Falcon (tecnología)
import FalconHomePage from './falcon/FalconHomePage';
import FalconCatalogoPage from './falcon/FalconCatalogoPage';
import FalconCheckoutPage from './falcon/FalconCheckoutPage';

export interface TemplateConfig {
  id: string;
  HomePage: React.ComponentType<TemplateHomePageProps>;
  CatalogoPage: React.ComponentType<TemplateCatalogoPageProps>;
  CheckoutPage: React.ComponentType<TemplateCheckoutPageProps>;
  SeguimientoPage?: React.ComponentType<TemplateSeguimientoPageProps>;
  // DetallePage (próximamente en otra iteración)
}

export const templateRegistry: Record<string, TemplateConfig> = {
  moda: {
    id: 'moda',
    HomePage: ModaHomePage,
    CatalogoPage: ModaCatalogoPage,
    CheckoutPage: ModaCheckoutPage,
    SeguimientoPage: ModaSeguimientoPage,
  },
  autopartes: {
    id: 'autopartes',
    HomePage: AutopartesHomePage,
    CatalogoPage: AutopartesCatalogoPage,
    CheckoutPage: AutopartesCheckoutPage,
  },
  tecnologia: {
    id: 'tecnologia',
    HomePage: TecnologiaHomePage,
    CatalogoPage: TecnologiaCatalogoPage,
    CheckoutPage: TecnologiaCheckoutPage,
  },
  maye: {
    id: 'maye',
    HomePage: MayeHomePage,
    CatalogoPage: MayeCatalogoPage,
    CheckoutPage: MayeCheckoutPage,
  },
  gadgets: {
    id: 'gadgets',
    HomePage: GadgetsHomePage,
    CatalogoPage: GadgetsCatalogoPage,
    CheckoutPage: GadgetsCheckoutPage,
  },
  'urbano': {
    id: 'urbano',
    HomePage: UrbanoHomePage,
    CatalogoPage: UrbanoCatalogoPage as any,
    CheckoutPage: UrbanoCheckoutPage,
    SeguimientoPage: UrbanoSeguimientoPage,
  },
  apicultura: {
    id: 'apicultura',
    HomePage: ApiculturaHomePage,
    CatalogoPage: ApiculturaCatalogoPage,
    CheckoutPage: ApiculturaCheckoutPage,
  },
  construccion: {
    id: 'construccion',
    HomePage: ConstruccionHomePage,
    CatalogoPage: ConstruccionCatalogoPage,
    CheckoutPage: ConstruccionCheckoutPage,
  },
  falcon: {
    id: 'falcon',
    HomePage: FalconHomePage,
    CatalogoPage: FalconCatalogoPage,
    CheckoutPage: FalconCheckoutPage,
  },
};
