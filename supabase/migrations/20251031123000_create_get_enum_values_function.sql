CREATE OR REPLACE FUNCTION get_enum_values(enum_type text)
RETURNS text[] AS $$
DECLARE
    vals text[];
BEGIN
    SELECT array_agg(e.enumlabel)
    INTO vals
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = enum_type;
    RETURN vals;
END;
$$ LANGUAGE plpgsql;