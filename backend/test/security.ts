import { SQL } from 'bun';
// All fixture users, records and roles are rolled back, including on failure.
const db = new SQL(process.env.SUPABASE_DB_URL!, { prepare: false });
const rollback = new Error('TEST_ROLLBACK');
const a = crypto.randomUUID(); const b = crypto.randomUUID(); const admin = crypto.randomUUID();
let assertions = 0;
function check(condition: boolean, message: string): void { if (!condition) throw new Error(message); assertions++; }
try {
  await db.begin(async tx => {
    await tx.unsafe('SET LOCAL ROLE postgres');
    await tx`INSERT INTO auth.users(id,email,role,aud) VALUES(${a},${`vca-test-${a}@example.invalid`},'authenticated','authenticated'),(${b},${`vca-test-${b}@example.invalid`},'authenticated','authenticated'),(${admin},${`vca-test-${admin}@example.invalid`},'authenticated','authenticated')`;
    await tx`INSERT INTO public.vca_admins(user_id) VALUES(${admin})`;
    const asUser = async (id: string): Promise<void> => { await tx.unsafe('SET LOCAL ROLE authenticated'); await tx`SELECT set_config('request.jwt.claim.sub',${id},true),set_config('request.jwt.claims',${JSON.stringify({ sub: id, role: 'authenticated' })},true)`; };
    const denied = async (action: (sp: typeof tx) => Promise<unknown>, message: string): Promise<void> => {
      let failed = false;
      try { await tx.savepoint(async sp => { await action(sp); }); } catch { failed = true; }
      check(failed, message);
    };
    await asUser(a);
    const saved = await tx`SELECT public.vca_save_workspace_owned(${JSON.stringify({ cards: [], marker: 'owner-a' })}::text::jsonb,0,${a}::uuid) AS revision`;
    check(Number(saved[0].revision) === 1, 'First save must advance revision');
    await denied(sp => sp`SELECT public.vca_save_workspace_owned('{}'::jsonb,0,${a}::uuid)`, 'Stale writes must fail');
    const details = { tier: 'regular', declaredValue: 100, shippingAddress: 'Fixture address, never shipped', shippingName: 'Test collector', contactEmail: 'collector@example.invalid' };
    const inserted = await tx`INSERT INTO public.vca_submissions(card_id,details) VALUES('base1-4',${JSON.stringify(details)}::text::jsonb) RETURNING id`;
    const id = inserted[0].id;
    check((await tx`SELECT * FROM public.vca_submission_events WHERE submission_id=${id}`).length === 1, 'Submission must create an audit event');
    await asUser(b);
    check((await tx`SELECT * FROM public.vca_workspace WHERE user_id=${a}::uuid`).length === 0, 'Other user must not read workspace');
    check((await tx`SELECT * FROM public.vca_submissions WHERE id=${id}`).length === 0, 'Other user must not read submission');
    check((await tx`SELECT * FROM public.vca_submission_events WHERE submission_id=${id}`).length === 0, 'Other user must not read events');
    await denied(sp => sp`SELECT public.vca_save_workspace_owned('{}'::jsonb,1,${a}::uuid)`, 'Cross-account save must fail');
    await denied(sp => sp`INSERT INTO public.vca_admins(user_id) VALUES(${b}::uuid)`, 'Users must not grant themselves admin');
    await denied(sp => sp`SELECT public.vca_advance_submission(${id},'RECEIVED',NULL,'Unauthorized receive')`, 'Non-admin transitions must fail');
    await denied(sp => sp`INSERT INTO public.vca_submissions(card_id,details,status,final_grade) VALUES('base1-4',${JSON.stringify(details)}::text::jsonb,'GRADED','VCA 10')`, 'Self-certified inserts must fail');
    check((await tx`UPDATE public.vca_submissions SET status='GRADED' WHERE id=${id} RETURNING id`).length === 0, 'Direct client updates must not bypass RPC');
    await asUser(admin);
    check((await tx`SELECT * FROM public.vca_submissions WHERE id=${id}`).length === 1, 'Admin must see intake');
    await denied(sp => sp`SELECT public.vca_advance_submission(${id},'GRADED','VCA 10','Trying to skip required inspection')`, 'Cannot skip stages');
    await tx`SELECT public.vca_advance_submission(${id},'RECEIVED',NULL,'Receipt documented by test')`;
    await tx`SELECT public.vca_advance_submission(${id},'INSPECTING',NULL,'Physical inspection started')`;
    await tx`SELECT public.vca_record_inspection(${id},${JSON.stringify({ notes: 'Test fixture documented visual evidence', checks: ['Corners reviewed'], pins: [] })}::text::jsonb)`;
    await tx`SELECT public.vca_advance_submission(${id},'GRADING',NULL,'Documented test inspection evidence reviewed')`;
    await denied(sp => sp`SELECT public.vca_advance_submission(${id},'GRADED','VCA 10','')`, 'Certification must require notes');
    await tx`SELECT public.vca_advance_submission(${id},'GRADED','VCA 9','Test-only decision after physical review')`;
    const certified = await tx`SELECT cert_serial,final_grade FROM public.vca_submissions WHERE id=${id}`;
    check(certified[0].cert_serial.startsWith('VCA-') && certified[0].final_grade === 'VCA 9', 'Server must issue certificate');
    await denied(sp => sp`SELECT public.vca_advance_submission(${id},'GRADED','VCA 10','Duplicate certification attempt')`, 'Duplicate certification must fail');
    await asUser(a);
    check((await tx`SELECT * FROM public.vca_submissions WHERE id=${id}`)[0].final_grade === 'VCA 9', 'Owner must see authoritative grade');
    check((await tx`SELECT * FROM public.vca_workspace WHERE user_id=${a}::uuid`)[0].data.marker === 'owner-a', 'Workspace persists independently');
    throw rollback;
  });
} catch (error) { if (error !== rollback) throw error; console.log(`PASS: ${assertions} live database authorization, persistence, audit and transition assertions; all fixtures rolled back.`); }
finally { await db.close(); }
