import { test, expect } from '@playwright/test'

test('server records, organization switching, failed writes, and sign-out', async ({ page }) => {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'owner@example.com', aud: 'authenticated', role: 'authenticated', created_at: new Date().toISOString() }
  const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, role:'authenticated' })).toString('base64url'), 'signature'].join('.')
  let failWrite = false
  const records: Record<string, { id: string; name: string; email: string; amount: number; paid: boolean }[]> = { a: [{ id: 'm1', name: 'Taylor', email: 't@example.com', amount: 50, paid: false }], b: [] }
  await page.route('https://test.supabase.co/**', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method()
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType:'application/json', body: JSON.stringify(body) })
    if (url.pathname.endsWith('/token')) return json({ access_token: jwt, refresh_token:'refresh', expires_in:3600, token_type:'bearer', user })
    if (url.pathname.endsWith('/logout')) return json({})
    if (url.pathname.endsWith('/user')) return json(user)
    if (url.pathname.endsWith('/organizations')) return json([{ id:'a', name:'Club A' },{ id:'b', name:'Club B' }])
    if (url.pathname.endsWith('/members')) {
      const org = url.searchParams.get('organization_id')?.replace('eq.','') ?? 'a'
      if (method === 'GET') return json(records[org])
      if (failWrite) return json({ message:'Database unavailable', code:'XX000' }, 500)
      if (method === 'PATCH') { Object.assign(records[org][0], req.postDataJSON()); return json(records[org][0]) }
      if (method === 'POST') { const data = { ...req.postDataJSON(), id:'m2' }; records[data.organization_id].push(data); return json(data) }
    }
    return json({ message:'Unexpected request' },400)
  })
  await page.goto('/')
  await page.getByLabel('Email', { exact:true }).fill(user.email)
  await page.getByLabel('Password', { exact:true }).fill('test-password-123')
  await page.getByRole('button', { name:'Sign in', exact:true }).click()
  await expect(page.getByText('Taylor', { exact:true })).toBeVisible()
  await page.getByRole('button', { name:'Mark paid', exact:true }).click()
  await expect(page.getByRole('button', { name:'Mark unpaid', exact:true })).toBeVisible()
  failWrite = true
  await page.getByRole('button', { name:'Mark unpaid', exact:true }).click()
  await expect(page.getByRole('alert')).toContainText('Database unavailable')
  await expect(page.getByRole('button', { name:'Mark unpaid', exact:true })).toBeVisible()
  failWrite = false
  await page.getByLabel('Organization', { exact:true }).selectOption('b')
  await expect(page.getByText('Taylor', { exact:true })).toHaveCount(0)
  await page.getByRole('button', { name:'Add first member' }).click()
  await page.getByLabel('Full name').fill('Sam')
  await page.getByLabel('Email address').fill('sam@example.com')
  await page.getByRole('button', { name:'Save member' }).click()
  await expect(page.getByText('Sam', { exact:true })).toBeVisible()
  await page.getByRole('button', { name:'Refresh records' }).click()
  await expect(page.getByText('Sam', { exact:true })).toBeVisible()
  await page.getByLabel('Organization', { exact:true }).selectOption('a')
  await expect(page.getByText('Taylor', { exact:true })).toBeVisible()
  await expect(page.getByText('Sam', { exact:true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Taylor', { exact:true })).toBeVisible()
  await expect(page.getByRole('button', { name:'Sign in', exact:true })).toHaveCount(0)
  await page.getByRole('button', { name:'Sign out' }).click()
  await expect(page.getByRole('heading', { name:'Sign in to DuesNest' })).toBeVisible()
  await expect(page.getByText('Taylor', { exact:true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name:'Sign in to DuesNest' })).toBeVisible()
})
