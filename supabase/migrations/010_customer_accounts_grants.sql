-- "Automatically expose new tables" is off for this project, so new tables get
-- no PostgREST grants by default (see 004_grants.sql). The account service
-- reads and writes profiles and addresses with the service role.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE profiles, addresses TO service_role;
