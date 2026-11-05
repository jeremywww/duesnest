import { supabase } from './supabase'

export type Member = { id: string; name: string; email: string; amount: number; paid: boolean }
export type Organization = { id: string; name: string }

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (!supabase) throw new Error('Authentication is not configured')
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('Please sign in again')
  const response = await fetch('/api' + path, {
    method,
    headers: { Authorization: 'Bearer ' + data.session.access_token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const payload: unknown = await response.json()
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : 'Request failed'
    throw new Error(message)
  }
  return payload as T
}
const org = (id: string) => '/organizations/' + encodeURIComponent(id) + '/members'
export const api = {
  organizations: () => request<Organization[]>('/organizations'),
  createOrganization: (name: string) => request<Organization>('/organizations', 'POST', { name }),
  members: (organizationId: string) => request<Member[]>(org(organizationId)),
  createMember: (organizationId: string, fields: Pick<Member, 'name'|'email'|'amount'>) => request<Member>(org(organizationId), 'POST', fields),
  updateMember: (organizationId: string, id: string, fields: Pick<Member, 'name'|'email'|'amount'>) => request<Member>(org(organizationId) + '/' + encodeURIComponent(id), 'PATCH', fields),
  updatePaid: (organizationId: string, id: string, paid: boolean) => request<Member>(org(organizationId) + '/' + encodeURIComponent(id), 'PATCH', { paid }),
  deleteMember: (organizationId: string, id: string) => request<{id:string}>(org(organizationId) + '/' + encodeURIComponent(id), 'DELETE'),
}
