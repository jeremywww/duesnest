export type Member = { id: string; name: string; email: string; amount: number; paid: boolean }
export type Organization = { id: string; name: string; members: Member[] }
export type Workspace = { version: 2; activeOrganizationId: string; organizations: Organization[] }
export const STORAGE_KEY = 'duesnest:organizations:v2'
export const LEGACY_KEY = 'duesnest:members:v1'

type StorageReader = Pick<Storage, 'getItem'>
const isMember = (x: unknown): x is Member => {
  if (typeof x !== 'object' || x === null) return false
  const m = x as Member
  return typeof m.id === 'string' && typeof m.name === 'string' && typeof m.email === 'string' &&
    typeof m.amount === 'number' && Number.isFinite(m.amount) && m.amount >= 0 && typeof m.paid === 'boolean'
}

export function readWorkspace(storage: StorageReader): Workspace {
  const raw = storage.getItem(STORAGE_KEY)
  if (raw !== null) {
    const state = JSON.parse(raw) as Workspace
    if (!state || state.version !== 2 || !Array.isArray(state.organizations) || !state.organizations.length ||
      !state.organizations.every(o => o && typeof o.id === 'string' && o.id.length > 0 &&
        typeof o.name === 'string' && o.name.trim().length > 0 && Array.isArray(o.members) && o.members.every(isMember) &&
        new Set(o.members.map(m => m.id)).size === o.members.length) ||
      new Set(state.organizations.map(o => o.id)).size !== state.organizations.length) {
      throw new Error('Invalid organization data')
    }
    return { ...state, activeOrganizationId: state.organizations.some(o => o.id === state.activeOrganizationId)
      ? state.activeOrganizationId : state.organizations[0].id }
  }
  const legacy = storage.getItem(LEGACY_KEY)
  const members: unknown = legacy === null ? [] : JSON.parse(legacy)
  if (!Array.isArray(members) || !members.every(isMember)) throw new Error('Invalid legacy member data')
  return { version: 2, activeOrganizationId: 'default', organizations: [{ id: 'default', name: 'My organization', members }] }
}

export function addOrganization(state: Workspace, id: string, name: string): Workspace {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 120) throw new Error('Enter an organization name between 1 and 120 characters.')
  if (state.organizations.some(o => o.name.toLowerCase() === trimmed.toLowerCase())) throw new Error('An organization with this name already exists.')
  if (state.organizations.some(o => o.id === id)) throw new Error('Organization ID already exists.')
  return { ...state, activeOrganizationId: id, organizations: [...state.organizations, { id, name: trimmed, members: [] }] }
}

export function updateMembers(state: Workspace, organizationId: string, update: (members: Member[]) => Member[]): Workspace {
  return { ...state, organizations: state.organizations.map(o => o.id === organizationId ? { ...o, members: update(o.members) } : o) }
}
