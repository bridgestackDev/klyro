-- Add booking_code to appointments and enforce no-overlap constraint
-- on active (pending/confirmed) appointments for the same staff slot.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS booking_code TEXT;

-- Unique booking code per appointment (NULL rows excluded — old/cancelled appointments)
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_booking_code
  ON appointments (booking_code)
  WHERE booking_code IS NOT NULL;

-- Prevent double-booking: no two active appointments for the same staff at the same start time
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_slot_overlap
  ON appointments (staff_id, starts_at)
  WHERE status IN ('pending', 'confirmed');
