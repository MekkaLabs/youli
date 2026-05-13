import fs from 'node:fs';
import path from 'node:path';

const candidates = [
  path.join(process.env.HOME || '', 'Documents', 'aios-core'),
  path.join(process.env.HOME || '', 'Documents', 'aiox-core'),
  path.join(process.env.HOME || '', 'Documentos', 'aios-core')
];

const aiosPath = candidates.find((p) => fs.existsSync(p));
if (!aiosPath) {
  console.error('AIOX/AIOS core não encontrado nos caminhos padrão.');
  process.exit(1);
}

const squadsCandidates = [
  path.join(process.env.HOME || '', 'Downloads', 'squads'),
  path.join(process.env.HOME || '', 'Transferências', 'squads')
];

const squadsPath = squadsCandidates.find((p) => fs.existsSync(p));
if (!squadsPath) {
  console.error('Pasta squads não encontrada em Downloads/Transferências.');
  process.exit(1);
}

const envFile = path.join(process.cwd(), '.env.local');
const backupFile = path.join(process.cwd(), `.env.local.backup.${Date.now()}`);
if (fs.existsSync(envFile)) {
  fs.copyFileSync(envFile, backupFile);
}

const content = [
  `AIOS_CORE_PATH=${aiosPath}`,
  `SQUADS_PATH=${squadsPath}`
].join('\n');

const existing = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
const merged = `${existing}\n${content}`
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .filter((v, i, arr) => arr.findIndex((x) => x.split('=')[0] === v.split('=')[0]) === i)
  .join('\n');

fs.writeFileSync(envFile, `${merged}\n`);
console.log(`Configurado AIOS_CORE_PATH=${aiosPath}`);
console.log(`Configurado SQUADS_PATH=${squadsPath}`);
if (fs.existsSync(backupFile)) {
  console.log(`Backup salvo em ${backupFile}`);
}
