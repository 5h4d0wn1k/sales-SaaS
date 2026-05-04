-- Expand step for session invalidation support.
-- Rollback note: dropping this column removes the forced re-auth cutoff used after password resets.
ALTER TABLE "users" ADD COLUMN "session_invalid_before" timestamp with time zone;
