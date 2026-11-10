-- Latest event wins; event_id breaks timestamp ties deterministically.
-- The event fixture is test-created, isolated from the frozen purchase records.
WITH ranked AS (
 SELECT *,ROW_NUMBER() OVER(PARTITION BY mapping_id ORDER BY event_time DESC,event_id DESC) AS sequence
 FROM mapping_event
)
SELECT mapping_id,target,event_id FROM ranked WHERE sequence=1 ORDER BY mapping_id;
