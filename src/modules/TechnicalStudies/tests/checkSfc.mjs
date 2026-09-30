// Compile only this module's Vue scripts and templates, without bundling or opening a browser.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, compileScript, registerTS } from '@vue/compiler-sfc';
import ts from 'typescript';
registerTS(() => ts);
const root = fileURLToPath(new URL('../', import.meta.url));
function files(dir) {
   return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : entry.name.endsWith('.vue') ? [join(dir, entry.name)] : []);
}
let checked = 0;
for (const filename of files(root)) {
   const source = readFileSync(filename, 'utf8');
   const { descriptor, errors } = parse(source, { filename });
   if (errors.length) throw new Error(`${filename}: ${errors.join('\n')}`);
   const compiled = compileScript(descriptor, { id: `technical-study-${checked}`, inlineTemplate: true, fs: { fileExists: existsSync, readFile: path => readFileSync(path, 'utf8') } });
   const syntax = ts.transpileModule(compiled.content, { fileName: `${filename}.ts`, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true });
   const diagnostics = syntax.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error) || [];
   if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: path => path, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
   checked++;
}
console.log(`${checked} Vue scripts/templates compiled successfully; no build generated.`);
