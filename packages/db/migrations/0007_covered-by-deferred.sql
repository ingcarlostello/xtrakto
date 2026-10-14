-- The statement that hides a movement (ADR 0018) is checked when the
-- transaction ends. Checked at once, deleting a user failed whenever the
-- cascade reached a quarterly statement before the export's movements it
-- hides, as when the quarterly statement was saved first. A statement that
-- hides movements still can't be deleted without them. Drizzle can't declare
-- a deferred key, so the schema only notes it.
ALTER TABLE transactions
  ALTER CONSTRAINT transactions_covered_by_fk DEFERRABLE INITIALLY DEFERRED;
