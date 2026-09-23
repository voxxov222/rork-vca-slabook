-- Official slab certificate numbers: VCA-26-0101, VCA-26-0102, ...
-- Apply in the Supabase SQL editor (or CLI) as a privileged role.
-- Does not rewrite vca_advance_submission. Certification still goes through
-- that RPC; this adds an admin-only assigner and a durable sequence.

CREATE SEQUENCE IF NOT EXISTS public.vca_cert_serial_seq AS bigint START WITH 101 MINVALUE 101 MAXVALUE 9999;

CREATE UNIQUE INDEX IF NOT EXISTS vca_submissions_cert_serial_key
  ON public.vca_submissions (cert_serial)
  WHERE cert_serial IS NOT NULL;

CREATE OR REPLACE FUNCTION public.vca_format_cert_serial(n bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'VCA-26-' || lpad(n::text, 4, '0')
$$;

CREATE OR REPLACE FUNCTION public.vca_assign_cert_serial(submission uuid, requested text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  row public.vca_submissions%ROWTYPE;
  serial text;
  n bigint;
BEGIN
  IF caller IS NULL OR NOT public.vca_is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO row FROM public.vca_submissions WHERE id = submission FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission not found';
  END IF;
  IF row.status NOT IN ('GRADING', 'GRADED') THEN
    RAISE EXCEPTION 'assign serial only while grading or after certification';
  END IF;
  IF row.status = 'SHIPPED' THEN
    RAISE EXCEPTION 'serial is locked after shipment';
  END IF;

  IF requested IS NULL OR btrim(requested) = '' THEN
    LOOP
      n := nextval('public.vca_cert_serial_seq');
      serial := public.vca_format_cert_serial(n);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vca_submissions s WHERE s.cert_serial = serial);
    END LOOP;
  ELSE
    serial := upper(btrim(requested));
    IF serial !~ '^VCA-26-[0-9]{4}$' THEN
      RAISE EXCEPTION 'use format VCA-26-0101';
    END IF;
    n := substring(serial FROM 8)::bigint;
    IF n < 101 THEN
      RAISE EXCEPTION 'first issued serial is VCA-26-0101';
    END IF;
    IF EXISTS (SELECT 1 FROM public.vca_submissions s WHERE s.cert_serial = serial AND s.id <> submission) THEN
      RAISE EXCEPTION 'serial already issued';
    END IF;
    PERFORM setval('public.vca_cert_serial_seq', GREATEST(n, (SELECT last_value FROM public.vca_cert_serial_seq)));
  END IF;

  UPDATE public.vca_submissions
     SET cert_serial = serial
   WHERE id = submission;

  INSERT INTO public.vca_submission_events(submission_id, status, note)
  VALUES (submission, row.status, 'Certificate serial assigned: ' || serial);

  RETURN serial;
END;
$$;

REVOKE ALL ON FUNCTION public.vca_assign_cert_serial(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vca_assign_cert_serial(uuid, text) TO authenticated;
