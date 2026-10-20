import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readWorkspace, addOrganization, updateMembers, STORAGE_KEY, LEGACY_KEY } from '../src/organizations.ts'
const member = { id: 'm1', name: 'Taylor', email: 't@example.com', amount: 50, paid: false }
const storage = values => ({ getItem: key => values[key] ?? null })
test('legacy members migrate once; original data is untouched', () => {
  const values = { [LEGACY_KEY]: JSON.stringify([member]) }
  const initial = readWorkspace(storage(values))
  assert.deepEqual(initial.organizations[0].members, [member])
  const changed = updateMembers(initial, 'default', () => [])
  values[STORAGE_KEY] = JSON.stringify(changed)
  assert.deepEqual(readWorkspace(storage(values)).organizations[0].members, [])
  assert.equal(values[LEGACY_KEY], JSON.stringify([member]))
})
test('creating and editing organizations keeps member records independent, even with matching member IDs', () => {
  let state = readWorkspace(storage({ [LEGACY_KEY]: JSON.stringify([member]) }))
  state = addOrganization(state, 'club2', 'Second club')
  assert.equal(state.activeOrganizationId, 'club2')
  assert.deepEqual(state.organizations[1].members, [])
  state = updateMembers(state, 'club2', () => [{ ...member, amount: 100 }])
  state = updateMembers(state, 'club2', members => members.map(m => ({ ...m, paid: true })))
  assert.deepEqual(state.organizations[0].members, [member])
  assert.equal(state.organizations[1].members[0].paid, true)
  assert.deepEqual(readWorkspace(storage({ [STORAGE_KEY]: JSON.stringify(state) })), state)
  state = updateMembers(state, 'club2', () => [])
  assert.equal(state.organizations[0].members.length, 1)
})
test('rejects blank and duplicate organization names', () => {
  const state = readWorkspace(storage({}))
  assert.throws(() => addOrganization(state, 'x', '   '))
  assert.throws(() => addOrganization(state, 'x', ' MY ORGANIZATION '))
})
test('invalid selected organization falls back to an existing one', () => {
  const state = readWorkspace(storage({}))
  state.activeOrganizationId = 'missing'
  assert.equal(readWorkspace(storage({ [STORAGE_KEY]: JSON.stringify(state) })).activeOrganizationId, 'default')
})
test('corrupt or inaccessible storage throws instead of resetting data', () => {
  assert.throws(() => readWorkspace(storage({ [STORAGE_KEY]: '{bad' })))
  assert.throws(() => readWorkspace(storage({ [STORAGE_KEY]: '{"version":2,"organizations":[]}' })))
  assert.throws(() => readWorkspace(storage({ [LEGACY_KEY]: '[{}]' })))
  assert.throws(() => readWorkspace({ getItem() { throw new Error('blocked') } }))
})
