import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email } = await req.json();
        
        // Use service role to bypass user security rules
        const users = await base44.asServiceRole.entities.User.filter({ email });
        
        if (users.length > 0) {
            const u = users[0];
            return Response.json({ 
                company_name: u.company_name, 
                cnpj_verified: u.cnpj_verified,
                verified_at: u.verified_at
            });
        }
        
        return Response.json({ error: 'User not found' }, { status: 404 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});