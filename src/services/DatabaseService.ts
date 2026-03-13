import Database from "better-sqlite3";
import { Logger } from "../helpers/Logger";
import { DatabaseLatestNp } from "../types/DatabaseLatestNp";

export class DatabaseService {
  private db: Database.Database;

  constructor(dbPath: string = "cache.db") {
    this.db = new Database(dbPath);
  }

  public Initialize() {
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");

    Logger.success("Database initialized!");
  }

  public registerLatestMap(
    userId: string | number,
    beatmapId: string | number,
  ) {
    Logger.info(
      `Inserting latest beatmap sent by user (user_id=${userId}, beatmap_id=${beatmapId})`,
    );
    const stmt = this.db.prepare(
      "INSERT INTO latest_map (user_id, beatmap_id) VALUES (?, ?)",
    );
    return stmt.run(String(userId), String(beatmapId));
  }

  public registerLatestMapWithSet(
    userId: string | number,
    beatmapId: string | number,
    beatmapsetId: string | number,
  ) {
    Logger.info(
      `Inserting latest beatmap (with set) sent by user (user_id=${userId}, beatmap_id=${beatmapId}, beatmapset_id=${beatmapsetId})`,
    );
    const stmt = this.db.prepare(
      "INSERT INTO latest_map (user_id, beatmap_id, beatmapset_id) VALUES (?, ?, ?)",
    );
    return stmt.run(String(userId), String(beatmapId), String(beatmapsetId));
  }

  public getLatestMapByUserId(userId: number) {
    const stmt = this.db.prepare(
      "SELECT * FROM latest_map WHERE user_id = ? ORDER BY date DESC",
    );
    return stmt.get(String(userId)) as DatabaseLatestNp;
  }
}
