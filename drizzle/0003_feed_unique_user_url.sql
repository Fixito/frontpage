-- Merge a User's duplicate Feeds before making (user_id, url) unique. Per
-- (user_id, url) the earliest created Feed is kept. Feed Items of the others
-- that the kept Feed already has (same guid) hand their read state and
-- bookmarks to its copy and are deleted; the rest move to the kept Feed. Then
-- the other Feeds are deleted. Each statement recomputes the duplicates so no
-- temporary table outlives a statement.
INSERT INTO "read_state" ("user_id", "item_id", "read_at")
SELECT rs."user_id", d."keep_id", min(rs."read_at")
FROM "read_state" rs
JOIN (
	SELECT fi."id", first_value(fi."id") OVER (
		PARTITION BY f."keep_feed_id", fi."guid"
		ORDER BY (fi."feed_id" = f."keep_feed_id") DESC, fi."fetched_at", fi."id"
	) AS "keep_id"
	FROM "feed_item" fi
	JOIN (
		SELECT "id", first_value("id") OVER (PARTITION BY "user_id", "url" ORDER BY "created_at", "id") AS "keep_feed_id"
		FROM "feed"
	) f ON f."id" = fi."feed_id"
) d ON d."id" = rs."item_id" AND d."id" <> d."keep_id"
GROUP BY rs."user_id", d."keep_id"
ON CONFLICT ("user_id", "item_id") DO UPDATE
SET "read_at" = least("read_state"."read_at", excluded."read_at");--> statement-breakpoint
INSERT INTO "bookmark" ("user_id", "item_id", "created_at")
SELECT b."user_id", d."keep_id", min(b."created_at")
FROM "bookmark" b
JOIN (
	SELECT fi."id", first_value(fi."id") OVER (
		PARTITION BY f."keep_feed_id", fi."guid"
		ORDER BY (fi."feed_id" = f."keep_feed_id") DESC, fi."fetched_at", fi."id"
	) AS "keep_id"
	FROM "feed_item" fi
	JOIN (
		SELECT "id", first_value("id") OVER (PARTITION BY "user_id", "url" ORDER BY "created_at", "id") AS "keep_feed_id"
		FROM "feed"
	) f ON f."id" = fi."feed_id"
) d ON d."id" = b."item_id" AND d."id" <> d."keep_id"
GROUP BY b."user_id", d."keep_id"
ON CONFLICT ("user_id", "item_id") DO UPDATE
SET "created_at" = least("bookmark"."created_at", excluded."created_at");--> statement-breakpoint
-- Read state and bookmarks on the deleted rows go with them (ON DELETE cascade).
DELETE FROM "feed_item"
WHERE "id" IN (
	SELECT "id" FROM (
		SELECT fi."id", first_value(fi."id") OVER (
			PARTITION BY f."keep_feed_id", fi."guid"
			ORDER BY (fi."feed_id" = f."keep_feed_id") DESC, fi."fetched_at", fi."id"
		) AS "keep_id"
		FROM "feed_item" fi
		JOIN (
			SELECT "id", first_value("id") OVER (PARTITION BY "user_id", "url" ORDER BY "created_at", "id") AS "keep_feed_id"
			FROM "feed"
		) f ON f."id" = fi."feed_id"
	) d
	WHERE d."id" <> d."keep_id"
);--> statement-breakpoint
-- The guids left are unique per kept Feed, so moving them keeps (feed_id, guid) unique.
UPDATE "feed_item" fi
SET "feed_id" = f."keep_feed_id"
FROM (
	SELECT "id", first_value("id") OVER (PARTITION BY "user_id", "url" ORDER BY "created_at", "id") AS "keep_feed_id"
	FROM "feed"
) f
WHERE f."id" = fi."feed_id" AND f."id" <> f."keep_feed_id";--> statement-breakpoint
DELETE FROM "feed"
WHERE "id" IN (
	SELECT "id" FROM (
		SELECT "id", first_value("id") OVER (PARTITION BY "user_id", "url" ORDER BY "created_at", "id") AS "keep_feed_id"
		FROM "feed"
	) f
	WHERE f."id" <> f."keep_feed_id"
);--> statement-breakpoint
CREATE UNIQUE INDEX "feed_user_url_idx" ON "feed" USING btree ("user_id","url");
