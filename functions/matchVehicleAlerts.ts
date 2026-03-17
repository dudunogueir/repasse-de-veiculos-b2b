import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { vehicle } = await req.json();
        
        // Find users with matching alerts
        const users = await base44.asServiceRole.entities.User.list();
        
        for (const user of users) {
            if (user.email === vehicle.created_by) continue; // Don't alert the creator
            
            let match = false;
            
            // Check if user has any alerts configured
            if (user.alert_makes?.length > 0 || user.alert_max_price || user.alert_states?.length > 0 || user.alert_transmission) {
                match = true;
                
                if (user.alert_makes?.length > 0 && !user.alert_makes.includes(vehicle.make)) match = false;
                if (user.alert_max_price && vehicle.price > user.alert_max_price) match = false;
                if (user.alert_states?.length > 0 && !user.alert_states.includes(vehicle.state)) match = false;
                if (user.alert_transmission && user.alert_transmission !== 'Todos' && vehicle.transmission !== user.alert_transmission) match = false;
            }
            
            if (match) {
                // Create notification
                await base44.asServiceRole.entities.Notification.create({
                    recipient_id: user.id,
                    type: 'system',
                    message: `🚗 Novo veículo no seu radar: ${vehicle.make} ${vehicle.model} por R$ ${vehicle.price.toLocaleString('pt-BR')}`,
                    link: `/VehicleDetails?id=${vehicle.id}`,
                    read: false
                });
            }
        }
        
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});