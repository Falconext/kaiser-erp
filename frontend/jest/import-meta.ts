/**
 * Transformador de ts-jest: sustituye `import.meta` por `{ env: process.env }`.
 *
 * Vite expone la configuración en `import.meta.env`, pero Jest ejecuta los
 * módulos como CommonJS, donde `import.meta` es un error de sintaxis — no algo
 * que se pueda mockear. Por eso reviente al importar `apiClient`, y con él
 * media suite.
 *
 * La alternativa era refactorizar las 26 apariciones repartidas en 13 archivos
 * para leer la configuración a través de un intermediario, o meter una
 * dependencia más. Esto es local, son 20 líneas y no toca el código de la app.
 *
 * Con esto, `import.meta.env.VITE_API_URL` pasa a ser `process.env.VITE_API_URL`
 * dentro de los tests, así que se puede fijar desde el propio test.
 */
import type * as ts from 'typescript';

export const name = 'import-meta-a-process-env';
export const version = 1;

export function factory(cs: { configSet: { compilerModule: typeof ts } }) {
  const tsm = cs.configSet.compilerModule;

  return (ctx: ts.TransformationContext) => (sf: ts.SourceFile): ts.SourceFile => {
    const visitar = (node: ts.Node): ts.Node => {
      if (tsm.isMetaProperty(node) && node.keywordToken === tsm.SyntaxKind.ImportKeyword) {
        // { env: process.env }
        return tsm.factory.createParenthesizedExpression(
          tsm.factory.createObjectLiteralExpression([
            tsm.factory.createPropertyAssignment(
              'env',
              tsm.factory.createPropertyAccessExpression(
                tsm.factory.createIdentifier('process'),
                'env',
              ),
            ),
          ]),
        );
      }
      return tsm.visitEachChild(node, visitar, ctx);
    };
    return tsm.visitNode(sf, visitar) as ts.SourceFile;
  };
}
