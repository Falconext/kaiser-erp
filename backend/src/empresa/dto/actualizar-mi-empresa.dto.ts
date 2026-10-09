import { OmitType } from '@nestjs/mapped-types';
import { UpdateEmpresaDto } from './update-empresa.dto';

/**
 * El cuerpo de `PUT /empresa/mia` y de `PUT /empresa/:id`.
 *
 * ⚠ Existe por una razón concreta, no por estética. Las dos rutas recibían el
 * cuerpo tipado como `Partial<UpdateEmpresaDto>` y `Omit<UpdateEmpresaDto,'id'>`,
 * y los dos son tipos de TypeScript: **en runtime `design:paramtypes` emite
 * `Object`**, así que el `ValidationPipe` global las saltaba ENTERAS. Ni
 * validación ni whitelist, para ningún campo de la empresa. Un `PUT` con
 * `precioBaseKgMoneda: 'EUR'` respondía 200 y dejaba `'EUR'` en la columna.
 *
 * `OmitType` de `@nestjs/mapped-types` sí construye una CLASE de verdad, con
 * los decoradores copiados, así que el pipe la reconoce y valida.
 *
 * Se omite `id` porque ninguna de las dos rutas lo acepta del cliente: en
 * `/mia` lo pone el token y en `/:id` la URL. Y en `UpdateEmpresaDto` es el
 * único campo obligatorio, así que dejarlo dentro haría fallar con 400 todo
 * guardado del formulario — que es justo lo que había que no romper.
 */
export class ActualizarMiEmpresaDto extends OmitType(UpdateEmpresaDto, [
  'id',
] as const) {}
