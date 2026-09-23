import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CATALOG, USERS, POSTS, cardById, registerCards, clearIndexedCards, userById as seedUser } from './data';
import { useAuth } from './auth';
import { supabase, isBackendReady } from './supabase';
import type { CatalogCard, CollectionItem, Conversation, GradeLabel, GradingSubmission, MarketplaceAccount, Post, ProfileBlockDef, ProfileBlockKind, ProfileMediaItem, ScanHistoryRecord, ServiceTier, SlabRecord, SlabStatus, SubmissionStatus, User, VcaNotification } from './types';
import type { SlabConfig } from '@/components/HoloSlab';
import { assertCertSerial, nextCertSerial } from './serial';
export interface InspectionNote { notes: string; front?: string; back?: string; pins: { id: string; x: number; y: number; side: 'front' | 'back'; label: string }[]; checks: string[]; guides: { left: number; right: number; top: number; bottom: number } }
type EditableProfile = Pick<User, 'displayName' | 'bio' | 'location' | 'favoritePokemon' | 'favoriteSet'>;
interface Workspace { profile?: EditableProfile; cards: CatalogCard[]; collection: CollectionItem[]; slabs: SlabRecord[]; scans: ScanHistoryRecord[]; inspections: Record<string, InspectionNote>; presets: Record<string, SlabConfig>; blocks: ProfileBlockDef[]; media: ProfileMediaItem[]; posts: Post[]; marketplace: Record<string, MarketplaceAccount> }
const empty = (): Workspace => ({ cards: [], collection: [], slabs: [], scans: [], inspections: {}, presets: {}, blocks: [{ id: 'stats', kind: 'stats' }, { id: 'featured', kind: 'featured' }, { id: 'media', kind: 'media' }], media: [], posts: [], marketplace: {} });
const uid = (prefix: string): string => `${prefix}-${crypto.randomUUID()}`;
interface ScanResult { cardId: string; passed: boolean; confidence: number; signals: { label: string; ok: boolean }[]; flaggedReason?: string }
export interface SubmissionInput { cardId: string; tier: ServiceTier; declaredCondition: string; declaredValue: number; notes: string; contactEmail: string; shippingName: string; shippingAddress: string }
interface SubmissionRow { id: string; user_id: string; card_id: string; details: SubmissionInput & { cardName: string; cardSet: string; cardArt: string; ownerName: string; inspection?: InspectionNote }; status: SubmissionStatus; final_grade: GradeLabel | null; cert_serial: string | null; created_at: string; vca_submission_events?: { status: SubmissionStatus; created_at: string; note: string }[] }
function submissionFrom(row: SubmissionRow): GradingSubmission { return { ...row.details, id: row.id, cardId: row.card_id, userId: row.user_id, status: row.status, finalGrade: row.final_grade, certSerial: row.cert_serial, createdAt: row.created_at, events: (row.vca_submission_events ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(e => ({ status: e.status, at: e.created_at, note: e.note })) }; }

function useWorkspace() {
  const { session, isAdmin } = useAuth();
  const owner = session?.user.id ?? 'guest';
  const queryClient = useQueryClient();
  const [workspace, setWorkspace] = useState<Workspace>(empty);
  const ref = useRef<Workspace>(workspace);
  const revision = useRef<number>(0);
  const hydrated = useRef<boolean>(!session);
  const alive = useRef<boolean>(true);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [saveError, setSaveError] = useState<string>('');
  const [notifications, setNotifications] = useState<VcaNotification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [follows, setFollows] = useState<Record<string, boolean>>({});
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [slabDraftCardId, setSlabDraftCardId] = useState<string | null>(null);
  const currentUser: User = { id: owner, username: session?.user.email?.split('@')[0] ?? 'guest', displayName: session?.user.user_metadata?.display_name ?? session?.user.email?.split('@')[0] ?? 'Guest collector', bio: '', location: '', favoritePokemon: '', favoriteSet: '', level: 1, joined: session?.user.created_at?.slice(0, 10) ?? '', online: Boolean(session), badges: [], stats: { cards: workspace.collection.length, graded: 0, value: 0, favorites: workspace.collection.filter(i => i.favorite).length }, avatarHue: 220, isSelf: true, ...workspace.profile };
  const load = useQuery({ queryKey: ['workspace', owner], enabled: Boolean(session), queryFn: async () => { const { data, error } = await supabase!.from('vca_workspace').select('data,revision').eq('user_id', owner).maybeSingle(); if (error) throw new Error('Could not load your private workspace. Retry before editing.'); return data as { data: Partial<Workspace>; revision: number } | null; }, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: false, retry: 1 });
  useEffect(() => { clearIndexedCards(); alive.current = true; return () => { alive.current = false; clearIndexedCards(); }; }, []);
  useEffect(() => {
    if (!session || hydrated.current || !load.isSuccess || load.isFetching) return;
    const next = { ...empty(), ...load.data?.data };
    next.collection = next.collection.map(i => ({ ...i, ownerId: owner, grade: null }));
    next.slabs = next.slabs.filter(s => s.kind === 'digital').map(s => ({ ...s, grade: null }));
    next.cards = next.cards.map(c => ({ ...c, prices: { raw: Number.isFinite(c.prices?.raw) ? c.prices.raw : NaN, g8: Number.isFinite(c.prices?.g8) ? c.prices.g8 : NaN, g9: Number.isFinite(c.prices?.g9) ? c.prices.g9 : NaN, g10: Number.isFinite(c.prices?.g10) ? c.prices.g10 : NaN } }));
    registerCards(next.cards); ref.current = next; revision.current = load.data?.revision ?? 0; setWorkspace(next); hydrated.current = true;
  }, [load.data, load.isSuccess, load.isFetching, owner, session]);
  const saving = useMutation({ mutationFn: async (next: Workspace) => {
    if (!session) return;
    const result = queue.current.catch(() => undefined).then(async () => {
      if (!alive.current) throw new Error('Session changed. Sign in again.');
      const identity = await supabase!.auth.getUser();
      if (identity.data.user?.id !== owner) throw new Error('Session changed. Reload your workspace.');
      const { data, error } = await supabase!.rpc('vca_save_workspace_owned', { payload: next, expected_revision: revision.current, expected_owner: owner });
      if (error) throw new Error(error.message.includes('another device') ? 'This workspace changed on another device. Reload to avoid overwriting it.' : 'Cloud save failed. Your changes remain in this tab. Retry before closing.');
      revision.current = Number(data);
      queryClient.setQueryData(['workspace', owner], { data: next, revision: revision.current });
      if (alive.current) setSaveError('');
    });
    queue.current = result; await result;
  }, onError: (error) => { if (alive.current) setSaveError(error.message); } });
  const commit = useCallback(async (update: (old: Workspace) => Workspace): Promise<void> => {
    if (!hydrated.current) throw new Error('Wait for your workspace to load, or retry loading.');
    const next = update(ref.current); ref.current = next; setWorkspace(next);
    await saving.mutateAsync(next);
  }, [saving.mutateAsync]);
  const edit = useCallback((update: (old: Workspace) => Workspace): void => { void commit(update).catch(e => toast.error(e.message)); }, [commit]);
  const retrySave = (): void => { if (!hydrated.current) void load.refetch(); else void saving.mutateAsync(ref.current).catch(() => undefined); };
  const pushNotification = useCallback((n: Omit<VcaNotification, 'id' | 'time' | 'read'>): void => setNotifications(old => [{ ...n, id: uid('notice'), time: 'now', read: false }, ...old]), []);
  const saveCard = async (card: CatalogCard, photo?: string): Promise<void> => {
    registerCards([card]);
    await commit(old => ({ ...old, cards: [...old.cards.filter(c => c.id !== card.id), card], inspections: photo ? { ...old.inspections, [card.id]: { notes: '', pins: [], checks: [], guides: { left: 5, right: 95, top: 5, bottom: 95 }, ...old.inspections[card.id], front: photo } } : old.inspections }));
  };
  const addToCollection = useCallback(async (cardId: string, _opts?: { grade?: GradeLabel | null; slab?: SlabStatus }): Promise<string> => {
    const id = uid('card'); const card = cardById(cardId);
    if (!card) throw new Error('Confirm a card first.');
    await commit(old => ({ ...old, cards: [...old.cards.filter(c => c.id !== card.id), card], collection: [{ id, cardId, ownerId: owner, addedAt: new Date().toISOString(), grade: null, serial: null, slab: 'none', favorite: false, wishlist: false, quantity: 1 }, ...old.collection] }));
    toast.success(session ? 'Card saved to your private collection.' : 'Card added for this session. Sign in to save across devices.'); return id;
  }, [commit, owner, session]);
  const createDigitalSlab = async (cardId: string, _grade: GradeLabel | null = null): Promise<SlabRecord> => {
    const record: SlabRecord = { id: uid('slab'), serial: uid('VCA-D').toUpperCase(), kind: 'digital', cardId, grade: null, ownerName: currentUser.displayName, createdAt: new Date().toISOString() };
    const card = cardById(cardId); if (!card) throw new Error('Select a card first.');
    await commit(old => ({ ...old, cards: [...old.cards.filter(c => c.id !== card.id), card], slabs: [record, ...old.slabs] })); return record;
  };
  const submissionsQuery = useQuery({ queryKey: ['submissions', owner, isAdmin], enabled: Boolean(session), queryFn: async () => { const { data, error } = await supabase!.from('vca_submissions').select('*,vca_submission_events(*)').order('created_at', { ascending: false }); if (error) throw new Error('Could not load grading requests.'); return (data as SubmissionRow[]).map(submissionFrom); }, staleTime: 15000 });
  const submissions = submissionsQuery.data ?? [];
  const submissionMutation = useMutation({ mutationFn: async (input: SubmissionInput): Promise<GradingSubmission> => {
    if (!session) throw new Error('Sign in before creating a grading request.');
    if (input.tier === 'bulk') throw new Error('Bulk requests require multi-card intake and are not available here.');
    const max = { bulk: 200, regular: 999, express: 4999, walkthrough: 100000 }[input.tier];
    if (!Number.isFinite(input.declaredValue) || input.declaredValue <= 0 || input.declaredValue > max) throw new Error('Enter a declared value within the selected tier limit.');
    const card = cardById(input.cardId); if (!card) throw new Error('Select a card.');
    const details = { ...input, ownerName: currentUser.displayName, cardName: card.name, cardSet: card.set, cardArt: card.artUrl, inspection: ref.current.inspections[card.id] ?? null };
    const { data, error } = await supabase!.from('vca_submissions').insert({ user_id: owner, card_id: card.id, details }).select('*,vca_submission_events(*)').single();
    if (error) throw new Error('Request was not saved. Check your details and retry.'); return submissionFrom(data as SubmissionRow);
  }, onSuccess: (sub) => { queryClient.setQueryData(['submissions', owner, isAdmin], (old: GradingSubmission[] | undefined) => [sub, ...(old ?? [])]); } });
  const advance = useMutation({ mutationFn: async ({ id, status, grade, note }: { id: string; status: SubmissionStatus; grade?: GradeLabel; note?: string }) => {
    const { error } = await supabase!.rpc('vca_advance_submission', { submission: id, next_status: status, grade: grade ?? null, evidence_note: note ?? '' });
    if (error) throw new Error('Update rejected. Check your permissions, current status and inspection / shipping evidence.');
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }) });
  const assignSerial = useMutation({ mutationFn: async ({ id, serial }: { id: string; serial: string }) => {
    const issued = assertCertSerial(serial);
    const taken = submissions.some(s => s.id !== id && s.certSerial === issued);
    if (taken) throw new Error(`${issued} is already on another slab.`);
    const { data, error } = await supabase!.rpc('vca_assign_cert_serial', { submission: id, requested: issued });
    if (error) throw new Error(error.message.includes('schema cache') || error.message.includes('could not find') ? 'Apply backend/migrations/20260923_cert_serial.sql in Supabase, then retry.' : error.message.includes('not authorized') ? 'Administrator role required to assign a serial.' : `Could not assign ${issued}. ${error.message}`);
    return (typeof data === 'string' && data) ? data : issued;
  }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }) });
  const certified: SlabRecord[] = submissions.filter(s => s.finalGrade && s.certSerial && s.userId === owner).map(s => ({ id: s.id, serial: s.certSerial!, cardId: s.cardId, grade: s.finalGrade, kind: 'physical', ownerName: s.ownerName, createdAt: s.createdAt }));
  const userById = (id: string): User => id === owner ? currentUser : seedUser(id);
  const collection = useMemo<CollectionItem[]>(() => [...workspace.collection.filter(i => i.ownerId === owner).map(i => ({ ...i, grade: null })), ...submissions.filter(s => s.userId === owner && s.finalGrade && s.certSerial).map(s => ({ id: `cert-${s.id}`, cardId: s.cardId, ownerId: owner, addedAt: s.createdAt, grade: s.finalGrade, serial: s.certSerial, slab: 'physical' as const, favorite: false, wishlist: false, quantity: 1 }))], [workspace.collection, submissions, owner]);
  const myItems = useCallback((): CollectionItem[] => collection, [collection]);
  const disabledCertification = (): void => { toast.error('Use a submitted grading request with an authorized administrator.'); };
  return {
    users: [currentUser, ...USERS.filter(u => !u.isSelf)], currentUser, collection, myItems, collectionValue: (): number => 0,
    posts: [...workspace.posts, ...POSTS], conversations, notifications, slabs: [...certified, ...workspace.slabs], follows, connections, lastScan, slabDraftCardId, marketplace: workspace.marketplace,
    profileBlocks: workspace.blocks, profileMedia: workspace.media, scanHistory: workspace.scans, inspections: workspace.inspections, presets: workspace.presets,
    backendReady: isBackendReady && Boolean(session), saveError: saveError || load.error?.message || '', saving: saving.isPending, workspaceReady: !session || (load.isSuccess && !load.isFetching && hydrated.current), retrySave,
    submissions, submissionsError: submissionsQuery.error?.message ?? '', submissionPending: submissionMutation.isPending, adminPending: advance.isPending || assignSerial.isPending,
    createSubmission: submissionMutation.mutateAsync,
    updateSubmissionStatus: (id: string, status: SubmissionStatus, note?: string) => advance.mutateAsync({ id, status, note }),
    certifySubmission: async (id: string, grade: GradeLabel, note?: string, serial?: string) => {
      await advance.mutateAsync({ id, status: 'GRADED', grade, note });
      const issued = serial && serial.trim() ? assertCertSerial(serial) : nextCertSerial(submissions.map(s => s.certSerial));
      return assignSerial.mutateAsync({ id, serial: issued });
    },
    assignCertSerial: (id: string, serial: string) => assignSerial.mutateAsync({ id, serial }),
    suggestedCertSerial: () => nextCertSerial(submissions.map(s => s.certSerial)),
    nextDigitalSerial: () => uid('VCA-D'), nextPhysicalSerial: () => nextCertSerial(submissions.map(s => s.certSerial)),
    addToCollection, createDigitalSlab, sendToGrading: disabledCertification, activatePhysicalSlab: disabledCertification, gradeSlab: disabledCertification,
    updateProfile: (profile: EditableProfile) => commit(old => ({ ...old, profile: { displayName: profile.displayName.trim().slice(0, 80) || 'Collector', bio: profile.bio.slice(0, 1000), location: profile.location.slice(0, 100), favoritePokemon: profile.favoritePokemon.slice(0, 80), favoriteSet: profile.favoriteSet.slice(0, 120) } })),
    saveCard, saveInspection: (cardId: string, note: InspectionNote) => commit(old => ({ ...old, inspections: { ...old.inspections, [cardId]: note } })),
    savePreset: (cardId: string, preset: SlabConfig) => commit(old => ({ ...old, presets: { ...old.presets, [cardId]: preset } })),
    toggleFavorite: (id: string) => edit(old => ({ ...old, collection: old.collection.map(i => i.id === id ? { ...i, favorite: !i.favorite } : i) })),
    toggleWishlistItem: (id: string) => edit(old => ({ ...old, collection: old.collection.map(i => i.id === id ? { ...i, wishlist: !i.wishlist } : i) })),
    addPost: (text: string, card?: Post['card']) => { edit(old => ({ ...old, posts: [{ id: uid('post'), userId: owner, text, card, time: 'now', images: [], likes: 0, likedByMe: false, comments: [], shares: 0, saved: false, kind: 'post' }, ...old.posts] })); toast.info('Post added to your workspace. Public community publishing is not connected.'); },
    toggleLike: (id: string) => edit(old => ({ ...old, posts: old.posts.map(p => p.id === id ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) } : p) })),
    toggleSave: (id: string) => edit(old => ({ ...old, posts: old.posts.map(p => p.id === id ? { ...p, saved: !p.saved } : p) })),
    addComment: (id: string, text: string) => edit(old => ({ ...old, posts: old.posts.map(p => p.id === id ? { ...p, comments: [...p.comments, { id: uid('comment'), userId: owner, text, time: 'now' }] } : p) })),
    sharePost: (_id: string) => toast.info('Copy the card link to share it. Private photos remain private.'),
    toggleFollow: (id: string) => setFollows(old => ({ ...old, [id]: !old[id] })), toggleConnection: (id: string) => setConnections(old => ({ ...old, [id]: !old[id] })),
    sendMessage: (_id: string, _text: string, _cardId?: string) => toast.info('Direct messaging is not connected yet.'), reactToMessage: (_id: string, _message: string, _reaction: string) => undefined,
    markConversationRead: (id: string) => setConversations(old => old.map(c => c.id === id ? { ...c, unread: 0 } : c)), markNotificationsRead: useCallback(() => setNotifications(old => old.map(n => ({ ...n, read: true }))), []), pushNotification,
    setLastScan, setSlabDraftCardId, cardById, userById,
    connectMarketplace: (platformId: string, handle: string) => { edit(old => ({ ...old, marketplace: { ...old.marketplace, [platformId]: { platformId, handle, connectedAt: new Date().toISOString(), listings: 0, sold30d: 0, revenue30d: 0, lastSynced: null } } })); toast.info('Handle saved. Live marketplace synchronization is not connected.'); },
    disconnectMarketplace: (id: string) => edit(old => { const marketplace = { ...old.marketplace }; delete marketplace[id]; return { ...old, marketplace }; }), syncMarketplace: (_id: string) => toast.info('Live marketplace synchronization is not connected.'),
    addBlock: (kind: ProfileBlockKind) => edit(old => ({ ...old, blocks: [...old.blocks, { id: uid('block'), kind }].slice(0, 8) })),
    moveBlock: (id: string, direction: -1 | 1) => edit(old => { const blocks = [...old.blocks]; const index = blocks.findIndex(b => b.id === id); const next = index + direction; if (index >= 0 && next >= 0 && next < blocks.length) [blocks[index], blocks[next]] = [blocks[next], blocks[index]]; return { ...old, blocks }; }),
    removeBlock: (id: string) => edit(old => ({ ...old, blocks: old.blocks.filter(b => b.id !== id) })),
    addProfileMedia: (m: Omit<ProfileMediaItem, 'id'>) => edit(old => ({ ...old, media: [...old.media, { ...m, id: uid('media') }] })), removeProfileMedia: (id: string) => edit(old => ({ ...old, media: old.media.filter(m => m.id !== id) })),
    recordScan: (scan: Omit<ScanHistoryRecord, 'id' | 'createdAt'>) => commit(old => ({ ...old, scans: [{ ...scan, id: uid('scan'), createdAt: new Date().toISOString() }, ...old.scans].slice(0, 100) })),
  };
}
type VcaStore = ReturnType<typeof useWorkspace>;
const VcaContext = createContext<VcaStore | null>(null);
function WorkspaceProvider({ children }: { children: ReactNode }) { const value = useWorkspace(); return <VcaContext.Provider value={value}>{children}</VcaContext.Provider>; }
export function VcaProvider({ children }: { children: ReactNode }) { const { session, ready } = useAuth(); if (!ready) return <div className="p-8 text-center text-muted-foreground">Opening your workspace…</div>; return <WorkspaceProvider key={session?.user.id ?? 'guest'}>{children}</WorkspaceProvider>; }
export function useVca(): VcaStore { const state = useContext(VcaContext); if (!state) throw new Error('VcaProvider is required'); return state; }
export { CATALOG };
