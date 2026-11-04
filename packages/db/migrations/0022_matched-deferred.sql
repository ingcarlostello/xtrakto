-- The movement a hidden one repeats (10.1a) is checked when the transaction
-- ends, as the statement that hides it is (migration 0007): deleting a user
-- removes both whatever order the cascade takes. A movement that a hidden
-- one repeats still can't be deleted without it. Drizzle can't declare a
-- deferred key, so the schema only notes it.
ALTER TABLE transactions
  ALTER CONSTRAINT transactions_matched_fk DEFERRABLE INITIALLY DEFERRED;
