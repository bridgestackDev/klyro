-- Migration: 0007_wizard_replace_branch_services
-- Creates an atomic RPC function that replaces all services for a branch
-- in a single transaction, preventing orphaned rows on partial failure.

CREATE OR REPLACE FUNCTION replace_branch_services(
  p_branch_id     uuid,
  p_business_id   uuid,
  p_services      jsonb  -- array of {name, duration_minutes, price, buffer_minutes}
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_service_ids uuid[];
  v_new_service_id  uuid;
  v_svc             jsonb;
BEGIN
  -- Collect existing service IDs linked to this branch (scoped to business for safety)
  SELECT ARRAY_AGG(s.id)
    INTO v_old_service_ids
    FROM branch_services bs
    JOIN services s ON s.id = bs.service_id
   WHERE bs.branch_id = p_branch_id
     AND s.business_id = p_business_id;

  -- Remove existing branch_service links
  DELETE FROM branch_services
   WHERE branch_id = p_branch_id;

  -- Remove existing service rows that belonged to this branch (scoped to business)
  IF v_old_service_ids IS NOT NULL AND array_length(v_old_service_ids, 1) > 0 THEN
    DELETE FROM services
     WHERE id = ANY(v_old_service_ids)
       AND business_id = p_business_id;
  END IF;

  -- Insert new services and link them to the branch
  FOR v_svc IN SELECT * FROM jsonb_array_elements(p_services)
  LOOP
    INSERT INTO services (business_id, name, duration_minutes, price, currency)
    VALUES (
      p_business_id,
      v_svc->>'name',
      (v_svc->>'duration_minutes')::int,
      (v_svc->>'price')::numeric,
      COALESCE(v_svc->>'currency', 'HNL')
    )
    RETURNING id INTO v_new_service_id;

    INSERT INTO branch_services (branch_id, service_id)
    VALUES (p_branch_id, v_new_service_id);
  END LOOP;
END;
$$;
