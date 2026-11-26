-- A payment to a card points at the card's movement that received it
-- (12.3e). When that movement goes, as another version of its statement
-- replaces it, only the link empties: the payment stays, and the next save
-- pairs it again. Drizzle can't declare a key that sets one of its columns
-- to null, so the schema only notes it.
ALTER TABLE transactions DROP CONSTRAINT transactions_paid_card_fk;
--> statement-breakpoint
ALTER TABLE transactions
  ADD CONSTRAINT transactions_paid_card_fk
  FOREIGN KEY (paid_card_movement_id, user_id)
  REFERENCES transactions (id, user_id)
  ON DELETE SET NULL (paid_card_movement_id);
