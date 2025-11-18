
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });


const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const getSchema = async () => {
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type')
        .eq('table_schema', 'public');

    if (error) {
        console.error('Error fetching schema:', error);
        return;
    }

    console.log('Schema of public tables:', data);
}

getSchema();
