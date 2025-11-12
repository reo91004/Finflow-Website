import { getDb } from "./db"

export interface StoredUser {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: string
  updatedAt: string | null
}

interface UserRow {
  id: number
  email: string
  name: string
  hashed_password: string
  created_at: string
  updated_at: string | null
}

type SaveUserInput = {
  id?: string
  email: string
  name: string
  passwordHash: string
}

const SELECT_USER_COLUMNS = `
  id,
  email,
  name,
  hashed_password,
  created_at,
  updated_at
`

const db = getDb()

const selectUserByEmailStmt = db.prepare<[string], UserRow>(
  `SELECT ${SELECT_USER_COLUMNS}
   FROM users
   WHERE email = ?
   COLLATE NOCASE`
)

const selectUserByIdStmt = db.prepare<[number], UserRow>(
  `SELECT ${SELECT_USER_COLUMNS}
   FROM users
   WHERE id = ?`
)

const updateUserStmt = db.prepare<[string, string, string, string, number]>(
  `UPDATE users
   SET email = ?,
       name = ?,
       hashed_password = ?,
       updated_at = ?
   WHERE id = ?`
)

const insertUserStmt = db.prepare<[string, string, string, string, string]>(
  `INSERT INTO users (email, name, hashed_password, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?)`
)

function mapRowToStoredUser(row: UserRow): StoredUser {
  return {
    id: row.id.toString(),
    email: row.email,
    name: row.name,
    passwordHash: row.hashed_password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const row = selectUserByEmailStmt.get(email)

  if (!row) {
    return undefined
  }

  return mapRowToStoredUser(row)
}

export async function saveUser(user: SaveUserInput): Promise<StoredUser> {
  const now = new Date().toISOString()

  if (user.id) {
    const numericId = Number(user.id)
    if (!Number.isInteger(numericId)) {
      throw new Error("Invalid user id")
    }

    const result = updateUserStmt.run(user.email, user.name, user.passwordHash, now, numericId)

    if (result.changes === 0) {
      throw new Error("Failed to update user")
    }

    const updatedRow = selectUserByIdStmt.get(numericId)
    if (!updatedRow) {
      throw new Error("Failed to load updated user")
    }
    return mapRowToStoredUser(updatedRow)
  }

  const result = insertUserStmt.run(user.email, user.name, user.passwordHash, now, now)
  const insertedId = Number(result.lastInsertRowid)

  const insertedRow = selectUserByIdStmt.get(insertedId)
  if (!insertedRow) {
    throw new Error("Failed to load inserted user")
  }

  return mapRowToStoredUser(insertedRow)
}

export async function getUserById(id: string): Promise<StoredUser | undefined> {
  const numericId = Number(id)

  if (!Number.isInteger(numericId) || numericId < 1) {
    return undefined
  }

  const row = selectUserByIdStmt.get(numericId)

  if (!row) {
    return undefined
  }

  return mapRowToStoredUser(row)
}
