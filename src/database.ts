export type DatabaseRecord = {
  id: string
  [key: string]: unknown
}

type DatabaseTable = {
  [key: string]: DatabaseRecord[]
}

export class Database {
  #database: DatabaseTable = {}

  insert(table: string, data: DatabaseRecord) {
    if (Array.isArray(this.#database[table])) {
      this.#database[table].push(data)
    } else {
      this.#database[table] = [data]
    }

    return data
  }

  select(table: string) {
    let tasks: unknown

    if (Array.isArray(this.#database[table])) {
      tasks = this.#database[table]
    } else {
      tasks = null
    }

    return tasks
  }
}
