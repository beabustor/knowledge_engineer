-- One atomic review batch. Caller binds values and handles rollback on constraint failure.
SAVEPOINT review_batch;
INSERT INTO review_decision(mapping_id,version,target,actor,reason)
VALUES(:mapping_id,:release,:target,:actor,:reason)
ON CONFLICT(mapping_id,version) DO UPDATE SET
 target=excluded.target,actor=excluded.actor,reason=excluded.reason;
RELEASE review_batch;
