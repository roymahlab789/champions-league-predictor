import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import path from 'node:path'

export async function getDBConnection() {
    const dbPath = path.join('database.db')

    return open({
        filename: dbPath,
        driver:sqlite3.Database
    })
}