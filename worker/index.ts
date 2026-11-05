// Same-origin D1 API. Supabase Auth is retained temporarily for verified identity
// during the storage migration; no Supabase database access occurs here.
interface Env { DB: D1Database; SUPABASE_URL: string; SUPABASE_PUBLISHABLE_KEY: string; ASSETS: Fetcher }
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
const fail = (message: string, status = 400) => json({ error: message }, status)
const uuid = () => crypto.randomUUID()
const validEmail = (s: unknown): s is string => typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const validName = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0 && s.trim().length <= 120
async function readBody(request: Request): Promise<Record<string, unknown>> {
  const data: unknown = await request.json()
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid JSON object')
  return data as Record<string, unknown>
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)
    try {
      if (!env.DB || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return fail('Server is not configured', 503)
      const token = /^Bearer (.+)$/i.exec(request.headers.get('Authorization') || '')?.[1]
      if (!token) return fail('Authentication required', 401)
      const authUrl = new URL('/auth/v1/user', env.SUPABASE_URL)
      const auth = await fetch(authUrl, { headers: { Authorization: 'Bearer ' + token, apikey: env.SUPABASE_PUBLISHABLE_KEY } })
      if (!auth.ok) return fail('Invalid session', 401)
      const identity: { id?: string; email?: string } = await auth.json()
      if (!identity.id || !validEmail(identity.email)) return fail('Invalid identity', 401)
      await env.DB.prepare('INSERT OR IGNORE INTO users (id,email) VALUES (?,?)').bind(identity.id, identity.email).run()
      const db = env.DB
      const userId = identity.id
      const path = url.pathname
      const method = request.method
      if (path === '/api/organizations' && method === 'GET') {
        const rows = await db.prepare('SELECT id,name FROM organizations WHERE owner_id=? ORDER BY created_at,id').bind(userId).all()
        return json(rows.results)
      }
      if (path === '/api/organizations' && method === 'POST') {
        const body = await readBody(request)
        if (!validName(body.name)) return fail('Invalid organization name')
        const id = uuid(), name = body.name.trim()
        await db.prepare('INSERT INTO organizations (id,owner_id,name) VALUES (?,?,?)').bind(id,userId,name).run()
        return json({id,name},201)
      }
      const match = /^\/api\/organizations\/([^/]+)\/members(?:\/([^/]+))?$/.exec(path)
      if (!match) return fail('Not found',404)
      const orgId = match[1], memberId = match[2]
      const owner = await db.prepare('SELECT id FROM organizations WHERE id=? AND owner_id=?').bind(orgId,userId).first()
      if (!owner) return fail('Organization not found',404)
      const columns = 'id,name,email,amount_cents,paid'
      const map = (r: Record<string,unknown>) => ({id:r.id,name:r.name,email:r.email,amount:Number(r.amount_cents)/100,paid:r.paid===1})
      if (!memberId && method==='GET') {
        const rows=await db.prepare('SELECT '+columns+' FROM members WHERE organization_id=? ORDER BY created_at,id').bind(orgId).all()
        return json(rows.results.map(r=>map(r as Record<string,unknown>)))
      }
      if (!memberId && method==='POST') {
        const b=await readBody(request)
        if (!validName(b.name)||!validEmail(b.email)||typeof b.amount!=='number'||!Number.isFinite(b.amount)||b.amount<0||b.amount>1000000) return fail('Invalid member')
        const cents=Math.round(b.amount*100),id=uuid()
        await db.prepare('INSERT INTO members (id,organization_id,name,email,amount_cents,paid) VALUES (?,?,?,?,?,0)').bind(id,orgId,b.name.trim(),b.email.trim(),cents).run()
        return json({id,name:b.name.trim(),email:b.email.trim(),amount:cents/100,paid:false},201)
      }
      if (!memberId) return fail('Not found',404)
      if (method==='PATCH') {
        const b=await readBody(request)
        if (typeof b.paid==='boolean' && Object.keys(b).length===1) {
          const result=await db.prepare('UPDATE members SET paid=? WHERE id=? AND organization_id=?').bind(b.paid?1:0,memberId,orgId).run()
          if (!result.meta.changes) return fail('Member not found',404)
        } else {
          if (!validName(b.name)||!validEmail(b.email)||typeof b.amount!=='number'||!Number.isFinite(b.amount)||b.amount<0||b.amount>1000000) return fail('Invalid member')
          const result=await db.prepare('UPDATE members SET name=?,email=?,amount_cents=? WHERE id=? AND organization_id=?').bind(b.name.trim(),b.email.trim(),Math.round(b.amount*100),memberId,orgId).run()
          if (!result.meta.changes) return fail('Member not found',404)
        }
        const row=await db.prepare('SELECT '+columns+' FROM members WHERE id=? AND organization_id=?').bind(memberId,orgId).first()
        return json(map(row as Record<string,unknown>))
      }
      if (method==='DELETE') {
        const result=await db.prepare('DELETE FROM members WHERE id=? AND organization_id=?').bind(memberId,orgId).run()
        return result.meta.changes ? json({id:memberId}) : fail('Member not found',404)
      }
      return fail('Method not allowed',405)
    } catch(e) {
      if (e instanceof SyntaxError) return fail('Invalid JSON')
      if (e instanceof Error && /UNIQUE constraint/.test(e.message)) return fail('Duplicate record',409)
      return fail('Request failed',500)
    }
  }
} satisfies ExportedHandler<Env>
