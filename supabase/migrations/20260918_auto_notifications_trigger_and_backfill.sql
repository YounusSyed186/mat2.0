-- Migration: Automatic trigger & backfill for interest and message notifications

-- 0. Ensure columns exist on notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata TEXT;

-- 1. Function to handle auto notification creation on interest INSERT or UPDATE
CREATE OR REPLACE FUNCTION notify_on_interest_change()
RETURNS TRIGGER AS $$
DECLARE
  sender_profile_name TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    SELECT name INTO sender_profile_name FROM profiles WHERE id = NEW.sender_id;
    INSERT INTO notifications (user_id, type, reference_id, is_read, metadata)
    VALUES (
      NEW.receiver_id,
      'interest_received',
      NEW.sender_id,
      false,
      COALESCE(sender_profile_name, 'Someone')
    );
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.status = 'accepted') THEN
    SELECT name INTO sender_profile_name FROM profiles WHERE id = NEW.receiver_id;
    INSERT INTO notifications (user_id, type, reference_id, is_read, metadata)
    VALUES (
      NEW.sender_id,
      'interest_accepted',
      NEW.receiver_id,
      false,
      COALESCE(sender_profile_name, 'Someone')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on interests table
DROP TRIGGER IF EXISTS trg_notify_on_interest_change ON interests;
CREATE TRIGGER trg_notify_on_interest_change
AFTER INSERT OR UPDATE ON interests
FOR EACH ROW EXECUTE FUNCTION notify_on_interest_change();

-- 3. Function to handle auto notification creation on message INSERT
CREATE OR REPLACE FUNCTION notify_on_message_insert()
RETURNS TRIGGER AS $$
DECLARE
  sender_profile_name TEXT;
BEGIN
  SELECT name INTO sender_profile_name FROM profiles WHERE id = NEW.sender_id;
  INSERT INTO notifications (user_id, type, reference_id, is_read, metadata)
  VALUES (
    NEW.receiver_id,
    'message',
    NEW.sender_id,
    false,
    COALESCE(sender_profile_name, 'Someone')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger on messages table
DROP TRIGGER IF EXISTS trg_notify_on_message_insert ON messages;
CREATE TRIGGER trg_notify_on_message_insert
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION notify_on_message_insert();

-- 5. Backfill missing notifications for existing pending interests
INSERT INTO notifications (user_id, type, reference_id, is_read, metadata)
SELECT
  i.receiver_id,
  'interest_received',
  i.sender_id,
  false,
  COALESCE(p.name, 'Someone')
FROM interests i
LEFT JOIN profiles p ON p.id = i.sender_id
WHERE i.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_id = i.receiver_id
      AND n.type = 'interest_received'
      AND n.reference_id = i.sender_id
  );

-- 6. Backfill missing notifications for existing accepted interests
INSERT INTO notifications (user_id, type, reference_id, is_read, metadata)
SELECT
  i.sender_id,
  'interest_accepted',
  i.receiver_id,
  false,
  COALESCE(p.name, 'Someone')
FROM interests i
LEFT JOIN profiles p ON p.id = i.receiver_id
WHERE i.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_id = i.sender_id
      AND n.type = 'interest_accepted'
      AND n.reference_id = i.receiver_id
  );
