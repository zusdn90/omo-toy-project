import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { EnrichedRestaurant } from './lib/types';

export const defaultVisitKoreaDbPath = '.omx/cache/visitkorea-restaurants.sqlite';

export type StoredVisitKoreaSnapshot = {
  restaurants: EnrichedRestaurant[];
  fetchedAt: string;
};

type RestaurantRow = {
  payload_json: string;
  fetched_at: string;
};

export class VisitKoreaChartStore {
  private readonly db: DatabaseSync;

  constructor(dbPath = defaultVisitKoreaDbPath) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS visitkorea_restaurants (
        neighborhood_id TEXT NOT NULL,
        restaurant_id TEXT NOT NULL,
        rank INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        PRIMARY KEY (neighborhood_id, restaurant_id)
      );
      CREATE INDEX IF NOT EXISTS idx_visitkorea_restaurants_neighborhood_rank
        ON visitkorea_restaurants (neighborhood_id, rank);
    `);
  }

  read(neighborhoodId: string): StoredVisitKoreaSnapshot | null {
    const rows = this.db
      .prepare(
        `
        SELECT payload_json, fetched_at
        FROM visitkorea_restaurants
        WHERE neighborhood_id = ?
        ORDER BY rank ASC
      `
      )
      .all(neighborhoodId) as RestaurantRow[];

    if (rows.length === 0) {
      return null;
    }

    return {
      restaurants: rows.map((row) => JSON.parse(row.payload_json) as EnrichedRestaurant),
      fetchedAt: rows[0].fetched_at
    };
  }

  write(neighborhoodId: string, restaurants: EnrichedRestaurant[]) {
    const fetchedAt = new Date().toISOString();
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM visitkorea_restaurants WHERE neighborhood_id = ?').run(neighborhoodId);
      const insert = this.db.prepare(`
        INSERT INTO visitkorea_restaurants (neighborhood_id, restaurant_id, rank, payload_json, fetched_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      restaurants.forEach((restaurant, index) => {
        insert.run(neighborhoodId, restaurant.id, index + 1, JSON.stringify(restaurant), fetchedAt);
      });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.db.close();
  }
}
