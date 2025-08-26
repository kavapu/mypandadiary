const { runQuery, getRow, getAll } = require('../database/connection');

class DiaryEntry {
    // Get all entries for a device
    static async getAllEntries(deviceId) {
        try {
            const sql = `
                SELECT * FROM diary_entries 
                WHERE device_id = ? 
                ORDER BY date DESC
            `;
            return await getAll(sql, [deviceId]);
        } catch (error) {
            throw new Error(`Error fetching entries: ${error.message}`);
        }
    }

    // Get entry by date
    static async getEntryByDate(date, deviceId) {
        try {
            const sql = `
                SELECT * FROM diary_entries 
                WHERE date = ? AND device_id = ?
            `;
            return await getRow(sql, [date, deviceId]);
        } catch (error) {
            throw new Error(`Error fetching entry: ${error.message}`);
        }
    }

    // Create new entry
    static async createEntry(date, content, deviceId) {
        try {
            const sql = `
                INSERT INTO diary_entries (date, content, device_id, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `;
            const result = await runQuery(sql, [date, content, deviceId]);
            return { id: result.id, date, content, deviceId };
        } catch (error) {
            throw new Error(`Error creating entry: ${error.message}`);
        }
    }

    // Update existing entry
    static async updateEntry(date, content, deviceId) {
        try {
            const sql = `
                UPDATE diary_entries 
                SET content = ?, updated_at = CURRENT_TIMESTAMP
                WHERE date = ? AND device_id = ?
            `;
            const result = await runQuery(sql, [content, date, deviceId]);
            return { changes: result.changes, date, content, deviceId };
        } catch (error) {
            throw new Error(`Error updating entry: ${error.message}`);
        }
    }

    // Upsert entry (create if not exists, update if exists)
    static async upsertEntry(date, content, deviceId) {
        try {
            const existingEntry = await this.getEntryByDate(date, deviceId);
            
            if (existingEntry) {
                return await this.updateEntry(date, content, deviceId);
            } else {
                return await this.createEntry(date, content, deviceId);
            }
        } catch (error) {
            throw new Error(`Error upserting entry: ${error.message}`);
        }
    }

    // Delete entry
    static async deleteEntry(date, deviceId) {
        try {
            const sql = `
                DELETE FROM diary_entries 
                WHERE date = ? AND device_id = ?
            `;
            const result = await runQuery(sql, [date, deviceId]);
            return { changes: result.changes, date, deviceId };
        } catch (error) {
            throw new Error(`Error deleting entry: ${error.message}`);
        }
    }

    // Get entries within date range
    static async getEntriesInRange(startDate, endDate, deviceId) {
        try {
            const sql = `
                SELECT * FROM diary_entries 
                WHERE date BETWEEN ? AND ? AND device_id = ?
                ORDER BY date DESC
            `;
            return await getAll(sql, [startDate, endDate, deviceId]);
        } catch (error) {
            throw new Error(`Error fetching entries in range: ${error.message}`);
        }
    }

    // Get recent entries (last N days)
    static async getRecentEntries(days, deviceId) {
        try {
            const sql = `
                SELECT * FROM diary_entries 
                WHERE date >= date('now', '-${days} days') AND device_id = ?
                ORDER BY date DESC
            `;
            return await getAll(sql, [deviceId]);
        } catch (error) {
            throw new Error(`Error fetching recent entries: ${error.message}`);
        }
    }

    // Check if entry exists
    static async entryExists(date, deviceId) {
        try {
            const entry = await this.getEntryByDate(date, deviceId);
            return !!entry;
        } catch (error) {
            throw new Error(`Error checking entry existence: ${error.message}`);
        }
    }
}

module.exports = DiaryEntry;