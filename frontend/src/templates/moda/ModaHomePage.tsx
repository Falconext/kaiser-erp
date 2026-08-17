/**
 * ModaHomePage
 * Wrapper fino sobre ModaLayout. Recibe los props estándar de TemplateHomePageProps
 * y los pasa directamente al layout ya existente.
 */
import ModaLayout from '@/components/tienda/ModaLayout';
import type { TemplateHomePageProps } from '@/templates/shared/types';

export default function ModaHomePage(props: TemplateHomePageProps) {
  return <ModaLayout {...props} />;
}
