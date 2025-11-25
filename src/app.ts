import express from 'express'
import fs from 'node:fs'
import { Database } from '@/database'
import {
  generateCSVFile,
  getTempFilePath,
  ensureTmpDir,
  deleteTempFile,
} from '@/utils/export-csv'

export const app = express()

const database = new Database()

app.use(express.json())

app.post('/tasks', async (request, response) => {
  const task = request.body
  database.insert('tasks', task)

  return response.status(201).json(task)
})

app.get('/tasks', async (request, response) => {
  const tasks = database.select('tasks')
  console.log(tasks)

  return response.status(200).json(tasks)
})

/**
 * Endpoint de export usando fs.createReadStream
 *
 * CONCEITOS DEMONSTRADOS:
 * 1. fs.createReadStream() - Cria um Readable Stream a partir de um arquivo
 * 2. .pipe() - Conecta o stream de leitura com o stream de escrita (HTTP response)
 * 3. Streaming de arquivo - Envia dados em chunks, não tudo de uma vez na memória
 * 4. Backpressure - O Node.js gerencia automaticamente a velocidade de leitura/escrita
 * 5. Event listeners - 'finish' e 'error' para controlar o ciclo de vida do stream
 */
app.get('/tasks/export/csv', async (request, response) => {
  // 1. Busca as tasks do database (in-memory)
  const tasks = database.select('tasks')

  // Se não houver tasks, retorna array vazio
  if (!tasks || !Array.isArray(tasks)) {
    return response.status(200).json([])
  }

  try {
    // 2. Garante que o diretório tmp existe
    ensureTmpDir()

    // 3. Gera um caminho único para o arquivo temporário
    const tempFilePath = getTempFilePath()

    // 4. Gera o arquivo CSV (write síncrono - para arquivos pequenos é ok)
    generateCSVFile(tasks, tempFilePath)

    // 5. Configura headers HTTP para download do arquivo
    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="tasks-export.csv"',
    )

    // 6. Cria um Readable Stream do arquivo
    // Este é o conceito principal: ler o arquivo em chunks (pedaços)
    const readStream = fs.createReadStream(tempFilePath, {
      encoding: 'utf-8',
      highWaterMark: 64 * 1024, // 64KB por chunk (padrão é 16KB)
    })

    // 7. Pipe: conecta o stream de leitura com o stream de resposta HTTP
    // O Node.js gerencia automaticamente o backpressure aqui
    // Se o cliente é lento, o stream de leitura pausa automaticamente
    readStream.pipe(response)

    // 8. Quando o stream terminar de enviar, deletamos o arquivo temporário
    readStream.on('finish', () => {
      console.log('Stream finalizado, deletando arquivo temporário...')
    })

    // 9. Tratamento de erro no stream
    readStream.on('error', (error) => {
      console.error('Erro no stream de leitura:', error)

      if (!response.headersSent) {
        response.status(500).json({ error: 'Erro ao gerar CSV' })
      }
    })

    // 10. Cleanup quando a resposta é fechada (cliente desconectou)
    response.on('close', () => {
      console.log('Cliente desconectou')
      readStream.destroy() // Para o stream
    })
  } catch (error) {
    console.error('Erro ao exportar CSV:', error)
    return response.status(500).json({ error: 'Erro ao exportar tasks' })
  }
})
