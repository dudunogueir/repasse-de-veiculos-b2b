import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const { make, model, year } = await req.json();
        
        // 1. Get marcas
        const marcasRes = await fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas');
        const marcas = await marcasRes.json();
        
        // Find marca
        const marca = marcas.find(m => m.nome.toLowerCase().includes(make.toLowerCase()) || make.toLowerCase().includes(m.nome.toLowerCase()));
        if (!marca) return Response.json({ error: 'Marca não encontrada' }, { status: 404 });

        // 2. Get modelos
        const modelosRes = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${marca.codigo}/modelos`);
        const modelosData = await modelosRes.json();
        const modelos = modelosData.modelos;
        
        // Find modelo
        const modelWords = model.toLowerCase().split(' ');
        let bestMatch = null;
        let maxMatches = 0;
        
        for (const m of modelos) {
            const mName = m.nome.toLowerCase();
            let matches = 0;
            for (const word of modelWords) {
                if (mName.includes(word)) matches++;
            }
            if (matches > maxMatches) {
                maxMatches = matches;
                bestMatch = m;
            }
        }
        
        if (!bestMatch) return Response.json({ error: 'Modelo não encontrado' }, { status: 404 });

        // 3. Get anos
        const anosRes = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${marca.codigo}/modelos/${bestMatch.codigo}/anos`);
        const anos = await anosRes.json();
        
        // Find ano
        const anoMatch = anos.find(a => a.nome.includes(year.toString()));
        if (!anoMatch) return Response.json({ error: 'Ano não encontrado' }, { status: 404 });

        // 4. Get price
        const priceRes = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${marca.codigo}/modelos/${bestMatch.codigo}/anos/${anoMatch.codigo}`);
        const priceData = await priceRes.json();
        
        const numericPrice = parseFloat(priceData.Valor.replace('R$ ', '').replaceAll('.', '').replace(',', '.'));
        
        return Response.json({ 
            fipe_price: numericPrice,
            fipe_string: priceData.Valor,
            fipe_code: priceData.CodigoFipe,
            fipe_month: priceData.MesReferencia,
            matched_model: bestMatch.nome
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});