-- Postgres trigger: fires pg_notify on 'low_balance' channel
-- whenever a wallet balance drops below 5.00 SGD (minimum balance threshold).
-- The wallet service LISTEN client picks this up and calls the AutoTopup composite.

CREATE OR REPLACE FUNCTION notify_low_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when balance crosses below 5.00 (not on every update)
  IF NEW.balance::numeric < 5.00 AND OLD.balance::numeric >= 5.00 THEN
    PERFORM pg_notify(
      'low_balance',
      json_build_object('card_id', NEW.card_id, 'balance', NEW.balance)::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallet_low_balance_trigger ON wallets;

CREATE TRIGGER wallet_low_balance_trigger
  AFTER UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_balance();
