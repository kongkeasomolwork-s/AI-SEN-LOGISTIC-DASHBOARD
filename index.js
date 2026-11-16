export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 0. LOGIN: Authenticate user against D1 login table
      if (url.pathname === '/api/login' && request.method === 'POST') {
        const { username, password } = await request.json();
        
        const { results } = await env.DB.prepare(
          'SELECT * FROM login WHERE username = ? AND password = ?'
        ).bind(username, password).all();

        if (results && results.length > 0) {
          return Response.json({ success: true }, { headers: corsHeaders });
        } else {
          return Response.json({ success: false, message: 'Invalid username or password' }, { status: 401, headers: corsHeaders });
        }
      }

      // 1. GET: Fetch records by category
      if (request.method === 'GET' && category) {
        const { results } = await env.DB.prepare(
          'SELECT data FROM logistics_records WHERE category = ?'
        ).bind(category).all();

        const records = results.map(row => JSON.parse(row.data));
        return Response.json(records, { headers: corsHeaders });
      }

      // 2. POST: Save or Update a record
      if (request.method === 'POST') {
        const body = await request.json();
        const { id, category, recordData } = body;

        await env.DB.prepare(`
          INSERT INTO logistics_records (id, category, data) 
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET data = ?
        `).bind(id, category, JSON.stringify(recordData), JSON.stringify(recordData)).run();

        return Response.json({ success: true }, { headers: corsHeaders });
      }

      // 3. DELETE: Remove a record
      if (request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        await env.DB.prepare('DELETE FROM logistics_records WHERE id = ?').bind(id).run();
        return Response.json({ success: true }, { headers: corsHeaders });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};