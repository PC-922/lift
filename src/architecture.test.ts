// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const root = resolve(import.meta.dirname);
const allowed: Record<string, readonly string[]> = {
  domain: ['domain'],
  application: ['application', 'domain'],
  UI: ['UI', 'application', 'domain'],
  infrastructure: ['infrastructure', 'application', 'domain'],
};

const allowedRootImports = new Set(['../../../package.json']);

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : /\.tsx?$/.test(path) && !path.includes('.test.') ? [path] : [];
  });
}

describe('hexagonal dependency boundaries', () => {
  for (const layer of Object.keys(allowed)) {
    it(`${layer} only imports permitted layers and dependencies`, () => {
      const violations: string[] = [];
      for (const file of files(resolve(root, layer))) {
        const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        function visit(node: ts.Node) {
          let specifier: string | undefined;
          if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            specifier = node.moduleSpecifier.text;
          }
          if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
            specifier = node.arguments[0].text;
          }
          if (specifier && !allowedRootImports.has(specifier)) {
            const local = specifier.startsWith('.') || specifier.startsWith('@/');
            const target = local ? relative(root, specifier.startsWith('@/')
              ? resolve(root, '..', specifier.slice(2)) : resolve(dirname(file), specifier)).split('/')[0] : specifier;
            if ((local && !allowed[layer].includes(target)) || (!local && (layer === 'domain' || layer === 'application')) || specifier.startsWith('firebase') && layer !== 'infrastructure') {
              violations.push(`${relative(root, file)} -> ${specifier}`);
            }
          }
          if (ts.isIdentifier(node) && ['localStorage', 'sessionStorage'].includes(node.text) && layer !== 'infrastructure') {
            violations.push(`${relative(root, file)} uses ${node.text}`);
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
      expect(violations).toEqual([]);
    });
  }
});
