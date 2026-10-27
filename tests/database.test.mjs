import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite()
const alice = '11111111-1111-4111-8111-111111111111'
const bob = '22222222-2222-4222-8222-222222222222'
const orgA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const orgB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const memberA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
before(async () => {
  // Supabase provides these roles and auth.uid(); emulate that platform contract.
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${alice}'), ('${bob}');`)
  await db.exec(await readFile(new URL('../supabase/migrations/202610270001_organizations.sql', import.meta.url), 'utf8'))
  await db.exec(`insert into public.organizations(id, owner_id, name) values ('${orgA}', '${alice}', 'Club A'), ('${orgB}', '${bob}', 'Club B');
    insert into public.members(id, organization_id, name, email, amount) values ('${memberA}', '${orgA}', 'Taylor', 't@example.com', 50);`)
})
after(() => db.close())
async function asUser(user, action, role = 'authenticated') {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${user}', false);`)
  try { return await action() } finally { await db.exec('reset role') }
}
test('anonymous callers cannot read organizations or members', async () => {
  await asUser('', async () => {
    await assert.rejects(db.query('select * from organizations'), /permission denied/)
    await assert.rejects(db.query('select * from members'), /permission denied/)
  }, 'anon')
})
test('owners can read only their organizations and members', async () => {
  await asUser(alice, async () => {
    assert.deepEqual((await db.query('select id from organizations')).rows, [{ id: orgA }])
    assert.equal((await db.query('select * from members')).rows.length, 1)
  })
  await asUser(bob, async () => assert.equal((await db.query('select * from members')).rows.length, 0))
})
test('forged cross-account inserts are rejected', async () => {
  await asUser(bob, async () => {
    await assert.rejects(db.query(`insert into organizations(owner_id,name) values ('${alice}', 'Forged')`), /row-level security/)
    await assert.rejects(db.query(`insert into members(organization_id,name,email,amount) values ('${orgA}', 'Forged', 'f@example.com', 10)`), /row-level security/)
  })
})
test('cross-account updates and deletes affect no rows', async () => {
  await asUser(bob, async () => {
    assert.equal((await db.query(`update members set paid=true where id='${memberA}' returning id`)).rows.length, 0)
    assert.equal((await db.query(`delete from members where id='${memberA}' returning id`)).rows.length, 0)
  })
  assert.equal((await db.query(`select paid from members where id='${memberA}'`)).rows[0].paid, false)
})
test('owners can create organizations and members, record dues, and delete their members', async () => {
  await asUser(bob, async () => {
    const { rows: [org] } = await db.query(`insert into organizations(owner_id,name) values ('${bob}', 'Second club') returning id`)
    const { rows: [member] } = await db.query(`insert into members(organization_id,name,email,amount) values ('${org.id}', 'Sam', 'sam@example.com', 20) returning id`)
    assert.equal((await db.query(`update members set paid=true where id='${member.id}' returning paid`)).rows[0].paid, true)
    assert.equal((await db.query(`delete from members where id='${member.id}' returning id`)).rows.length, 1)
  })
})
test('ownership and organization reassignment are not permitted', async () => {
  await asUser(alice, async () => {
    await assert.rejects(db.query(`update organizations set owner_id='${bob}' where id='${orgA}'`), /permission denied/)
    await assert.rejects(db.query(`update members set organization_id='${orgB}' where id='${memberA}'`), /permission denied/)
  })
})
test('invalid amounts and blank or duplicate organization names are rejected', async () => {
  await asUser(alice, async () => {
    for (const amount of ['-1', '1000001', "'NaN'"]) {
      await assert.rejects(db.query(`insert into members(organization_id,name,email,amount) values ('${orgA}', 'Bad', 'b@example.com', ${amount})`), /constraint/)
    }
    await assert.rejects(db.query(`insert into organizations(owner_id,name) values ('${alice}', '  ')`), /constraint/)
    await assert.rejects(db.query(`insert into organizations(owner_id,name) values ('${alice}', ' CLUB A ')`), /unique/)
  })
})
