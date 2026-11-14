ALTER TABLE "wallet_reservations"
  ADD COLUMN "settled_amount" DECIMAL(38,0);

ALTER TABLE "wallet_reservations"
  ADD CONSTRAINT "wallet_reservations_settled_amount_check"
  CHECK (
    ("status" = 'settled' AND "settled_amount" IS NOT NULL AND "settled_amount" >= 0 AND "settled_amount" <= "amount")
    OR
    ("status" <> 'settled' AND "settled_amount" IS NULL)
  );

CREATE OR REPLACE FUNCTION "guard_wallet_reservation_transition"() RETURNS trigger AS $$
BEGIN
  IF OLD."id" <> NEW."id" OR OLD."user_id" <> NEW."user_id"
     OR OLD."wallet_account_id" <> NEW."wallet_account_id"
     OR OLD."idempotency_key" <> NEW."idempotency_key"
     OR OLD."amount" <> NEW."amount" OR OLD."currency" <> NEW."currency"
     OR OLD."expires_at" <> NEW."expires_at" THEN
    RAISE EXCEPTION 'wallet reservation identity, hold amount and expiry are immutable';
  END IF;
  IF OLD."status" <> 'reserved' OR NEW."status" NOT IN ('settled','released','expired') THEN
    RAISE EXCEPTION 'invalid wallet reservation transition';
  END IF;
  IF NEW."status" = 'settled' AND (
    NEW."settled_amount" IS NULL OR NEW."settled_amount" < 0 OR NEW."settled_amount" > NEW."amount"
  ) THEN
    RAISE EXCEPTION 'settled wallet reservation must record actual charge within reserved amount';
  END IF;
  IF NEW."status" IN ('released','expired') AND NEW."settled_amount" IS NOT NULL THEN
    RAISE EXCEPTION 'released or expired reservation cannot have a settlement amount';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
