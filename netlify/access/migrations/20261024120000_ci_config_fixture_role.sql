-- Least-privilege browser fixture for the user-confirmed internal test database.
-- This LOGIN role has no password until set through Supabase Dashboard.
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='access_ci_fixture') THEN
  CREATE ROLE access_ci_fixture LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
 ELSE
  ALTER ROLE access_ci_fixture LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
 END IF;
END
$$;
GRANT USAGE ON SCHEMA access_control TO access_ci_fixture;
CREATE OR REPLACE FUNCTION access_control.ci_create_config_fixture_grant(p_id uuid,p_token_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_id IS NULL OR coalesce(p_token_hash,'') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid CI fixture grant input'; END IF;
 INSERT INTO access_control.access_grants(id,recipient_email,scope,token_hash,issued_by_identity_id,expires_at)
 VALUES(p_id,'ci-config@fixture.example','config',p_token_hash,'ci-isolated-fixture',now()+interval '5 minutes');
 RETURN p_id;
END
$$;
CREATE OR REPLACE FUNCTION access_control.ci_revoke_config_fixture_grant(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE did_revoke boolean := false;
BEGIN
 UPDATE access_control.access_sessions AS s SET revoked_at=now()
 WHERE s.grant_id=p_id AND s.revoked_at IS NULL
 AND EXISTS(SELECT 1 FROM access_control.access_grants AS g WHERE g.id=p_id AND g.recipient_email='ci-config@fixture.example' AND g.issued_by_identity_id='ci-isolated-fixture');
 UPDATE access_control.access_grants AS g SET revoked_at=now(),revoked_by_identity_id='ci-isolated-fixture'
 WHERE g.id=p_id AND g.recipient_email='ci-config@fixture.example' AND g.issued_by_identity_id='ci-isolated-fixture' AND g.revoked_at IS NULL
 RETURNING true INTO did_revoke;
 RETURN coalesce(did_revoke,false);
END
$$;
REVOKE ALL ON FUNCTION access_control.ci_create_config_fixture_grant(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION access_control.ci_revoke_config_fixture_grant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION access_control.ci_create_config_fixture_grant(uuid,text) TO access_ci_fixture;
GRANT EXECUTE ON FUNCTION access_control.ci_revoke_config_fixture_grant(uuid) TO access_ci_fixture;
