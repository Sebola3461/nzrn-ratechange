CREATE TABLE "latest_map" (
	"user_id"	TEXT NOT NULL,
	"beatmapset_id"	TEXT,
	"beatmap_id"	TEXT NOT NULL,
	"date"	TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
)

CREATE INDEX "idx_user_beatmap" ON "latest_map" (
    "user_id",
    "beatmap_id"
);