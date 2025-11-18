
import { supabase } from '@/integrations/supabase/client';

export const getMembers = async (filters: { role?: string | string[], active?: boolean } = {}) => {
    let query = supabase.from('members').select('*');

    if (filters.role) {
        if (Array.isArray(filters.role)) {
            query = query.in('role', filters.role);
        } else {
            query = query.eq('role', filters.role);
        }
    }

    if (filters.active !== undefined) {
        query = query.eq('active', filters.active);
    }

    const { data, error } = await query
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching members:', error);
        return [];
    }

    return data;
};
