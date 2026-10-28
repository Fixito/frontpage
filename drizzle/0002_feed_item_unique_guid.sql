-- Merge duplicate Feed Items before making (feed_id, guid) unique. Per
-- (feed_id, guid) the earliest fetched row is kept; read state and bookmarks
-- on the other rows move to it, then those rows are deleted. Each statement
-- recomputes the duplicates so no temporary table outlives a statement.
INSERT INTO "read_state" ("user_id", "item_id", "read_at")
SELECT rs."user_id", d."keep_id", min(rs."read_at")
FROM "read_state" rs
JOIN (
	SELECT "id", first_value("id") OVER (PARTITION BY "feed_id", "guid" ORDER BY "fetched_at", "id") AS "keep_id"
	FROM "feed_item"
) d ON d."id" = rs."item_id" AND d."id" <> d."keep_id"
GROUP BY rs."user_id", d."keep_id"
ON CONFLICT ("user_id", "item_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "bookmark" ("user_id", "item_id", "created_at")
SELECT b."user_id", d."keep_id", min(b."created_at")
FROM "bookmark" b
JOIN (
	SELECT "id", first_value("id") OVER (PARTITION BY "feed_id", "guid" ORDER BY "fetched_at", "id") AS "keep_id"
	FROM "feed_item"
) d ON d."id" = b."item_id" AND d."id" <> d."keep_id"
GROUP BY b."user_id", d."keep_id"
ON CONFLICT ("user_id", "item_id") DO NOTHING;--> statement-breakpoint
-- Read state and bookmarks on the deleted rows go with them (ON DELETE cascade).
DELETE FROM "feed_item"
WHERE "id" IN (
	SELECT "id" FROM (
		SELECT "id", first_value("id") OVER (PARTITION BY "feed_id", "guid" ORDER BY "fetched_at", "id") AS "keep_id"
		FROM "feed_item"
	) d
	WHERE d."id" <> d."keep_id"
);--> statement-breakpoint
CREATE UNIQUE INDEX "feed_item_feed_guid_idx" ON "feed_item" USING btree ("feed_id","guid");
