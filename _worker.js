// _worker.js — TCW site entry.
// Serves static assets (HTML) AND handles POST /api/intake -> Airtable direct.
// AIRTABLE_TOKEN is a Cloudflare secret (Worker Settings > Variables and Secrets).

const BASE_ID = 'app2PgD5bXvQH6pRz';
const T = {
  clients:   'tblo3D6RXnEN1hAXJ',
  checklist: 'tblEiBC30aBGjvIFL',
  leads:     'tblQe8Eypgj8M8zdz',
};
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/intake') {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
      if (request.method !== 'POST') return j({ ok:false, error:'POST only' }, 405);
      return handleIntake(request, env);
    }

    // Everything else -> static assets (your HTML pages)
    return env.ASSETS.fetch(request);
  },
};

async function handleIntake(request, env) {
  const token = env.AIRTABLE_TOKEN;
  if (!token) return j({ ok:false, error:'AIRTABLE_TOKEN not set' }, 500);

  let p;
  try { p = await request.json(); }
  catch { return j({ ok:false, error:'bad json' }, 400); }

  const event = p.event || 'enrollment_completed';
  try {
    if (event === 'enrollment_completed') {
      await create(token, T.clients, {
        'Name': p.client_name||'', 'Email': p.email||'', 'Phone': p.phone||'',
        'Business Name': p.business_name||'', 'Business Type': p.business_type||'',
        'Biggest Challenge': p.biggest_challenge||'', '90-Day Goals': p.ninety_day_goals||'',
        'Lead Source': p.lead_source||'', 'Service Tier': p.service_tier||'',
        'Annual Price': n(p.tier_annual_price), 'Payment Plan': p.payment_plan||'',
        'Amount Due Today': n(p.amount_due_today),
        'Enrolled Date': p.timestamp||new Date().toISOString(),
        'Portal ID': p.portal_id||'', 'Portal URL': p.portal_url||'',
        'Payment Confirmed': p.payment_confirmed===true,
      });
    } else if (event === 'checklist_step_completed') {
      await create(token, T.checklist, {
        'Client Email': p.client_email||'', 'Step Title': p.step_title||'',
        'Step Number': n(p.step_number), 'Tier': p.step_tier||'',
        'Details': typeof p.details==='object' ? JSON.stringify(p.details) : (p.details||''),
        'Completed At': p.timestamp||new Date().toISOString(),
      });
    } else if (event === 'checklist_step_reverted') {
      return j({ ok:true, skipped:'reverted' });
    } else if (event === 'tier_selected') {
      await create(token, T.clients, {
        'Name': p.client_name||'', 'Email': p.email||'', 'Phone': p.phone||'',
        'Business Name': p.business_name||'', 'Service Tier': p.service_tier||'',
        'Annual Price': n(p.tier_annual_price),
        'Lead Source': 'Tier selected (warm lead)',
        'Tier Selected Date': p.timestamp||new Date().toISOString(),
      });
    } else if (event === 'website_lead') {
      await create(token, T.leads, {
        'Full Name': p.full_name||p.client_name||'', 'Business Name': p.business_name||'',
        'Email': p.email||'', 'Phone': p.phone||'', 'Entity Status': p.entity_status||'',
        'Texas Business Address': p.business_address||'', 'Service Requested': p.service_requested||'',
        'Registered Agent Needed': p.registered_agent||'', 'Number of Entities': p.number_of_entities||'',
        'Industry': p.industry||'', 'Goals': p.goals||'',
        'Preferred Callback Time': p.callback_time||'',
        'Submitted At': p.timestamp||new Date().toISOString(),
        'Source': p.source||'Landing page intake',
      });
    } else if (event === 'compliance_lead_submitted') {
      await create(token, T.clients, {
        'Name': p.client_name||'', 'Email': p.email||'', 'Phone': p.phone||'',
        'Business Name': p.business_name||'', 'Business Type': p.business_type||'',
        'Biggest Challenge': p.biggest_challenge||'', '90-Day Goals': p.ninety_day_goals||'',
        'Lead Source': p.lead_source||'Texas Compliance Rescue Landing Page',
        'Amount Due Today': n(p.amount_due_today),
        'Enrolled Date': p.timestamp||new Date().toISOString(),
        'Payment Confirmed': p.payment_confirmed===true,
      });
    } else {
      return j({ ok:false, error:'unknown event: '+event }, 400);
    }
    return j({ ok:true, event });
  } catch (e) {
    return j({ ok:false, error:String(e.message||e) }, 502);
  }
}

async function create(token, table, fields) {
  const r = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${table}`, {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ fields, typecast:true }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(d));
  return d;
}
function n(v){ const x=Number(v); return isNaN(x)?null:x; }
function j(o,s=200){ return new Response(JSON.stringify(o), { status:s, headers:{ 'Content-Type':'application/json', ...CORS } }); }
