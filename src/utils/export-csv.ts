import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseRecord } from '../database';

/**
 * Gera um arquivo CSV a partir de um array de tasks
 *
 * @param tasks - Array de tasks do database
 * @param filePath - Caminho onde o arquivo será salvo
 *
 * Conceito: Esta função cria um arquivo CSV de forma síncrona.
 * Em seguida, usaremos fs.createReadStream para ler e enviar via HTTP.
 */
export function generateCSVFile(tasks: DatabaseRecord[], filePath: string): void {
  // Header do CSV
  const header = 'id,title,description,completed\n';

  // Converte cada task em linha CSV
  const rows = tasks.map(task => {
    const title = task.title || '';
    const description = task.description || '';
    const completed = task.completed || false;

    // Escapa vírgulas e quebras de linha colocando entre aspas
    const escapedTitle = `"${String(title).replace(/"/g, '""')}"`;
    const escapedDescription = `"${String(description).replace(/"/g, '""')}"`;

    return `${task.id},${escapedTitle},${escapedDescription},${completed}`;
  }).join('\n');

  // Escreve o arquivo (poderia usar createWriteStream para arquivos grandes)
  const content = header + rows;
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Deleta um arquivo temporário
 */
export function deleteTempFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Erro ao deletar arquivo temporário:', error);
  }
}

/**
 * Gera um caminho único para arquivo temporário
 */
export function getTempFilePath(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return path.join(process.cwd(), 'tmp', `tasks-export-${timestamp}-${random}.csv`);
}

/**
 * Garante que o diretório tmp existe
 */
export function ensureTmpDir(): void {
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
}
