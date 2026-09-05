-- HarvestHub — guard the "submit application" transition.
--
-- farmer_verification columns can't be NOT NULL (0004's stub is inserted
-- empty and filled in gradually by the onboarding wizard), so nothing at
-- the DB layer otherwise stops a buggy client from setting submitted_at on
-- an incomplete application. This RPC is the one place that's checked
-- server-side; the onboarding wizard calls it instead of a raw update on
-- submitted_at.

create or replace function public.submit_farmer_verification()
returns void
language plpgsql
security invoker
as $$
declare
  v_verification record;
begin
  select * into v_verification from farmer_verification where id = auth.uid();

  if v_verification is null then
    raise exception 'No verification record found for the current user';
  end if;

  if v_verification.business_license_number is null
     or v_verification.business_license_file_path is null
     or v_verification.insurance_file_path is null
     or v_verification.insurance_expiration_date is null
     or v_verification.gov_id_file_path is null
     or v_verification.land_proof_file_path is null
     or not exists (select 1 from farmer_certifications where farmer_id = auth.uid())
  then
    raise exception 'Application is missing required documents';
  end if;

  update farmer_verification set submitted_at = now() where id = auth.uid();
end;
$$;

grant execute on function public.submit_farmer_verification() to authenticated;
