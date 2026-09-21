import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const schema = z.object({ email: z.string().email('Enter a valid email address.'), password: z.string() });
interface Values { email: string; password: string }
type Mode = 'signin' | 'signup' | 'reset';
export default function Account() {
  const { session, ready, recovery, finishRecovery, isAdmin } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [message, setMessage] = useState<string>('');
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  const mutation = useMutation({ mutationFn: async (values: Values) => {
    if (!supabase) throw new Error('Accounts are not configured. Please try again later.');
    if (mode !== 'reset' && values.password.length < (mode === 'signup' ? 10 : 1)) throw new Error(mode === 'signup' ? 'Use at least 10 characters for your password.' : 'Enter your password.');
    const redirect = `${window.location.origin}/account`;
    if (mode === 'reset') { const { error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo: redirect }); if (error) throw new Error('Could not send a recovery email. Please wait a moment and retry.'); return 'If this email has an account, a recovery link will arrive shortly.'; }
    if (mode === 'signup') { const { data, error } = await supabase.auth.signUp({ email: values.email, password: values.password, options: { emailRedirectTo: redirect } }); if (error) throw new Error(error.status === 429 ? 'Email requests are limited. Please wait before trying again.' : 'Registration could not be completed. Check your details or try signing in.'); return data.session ? 'Your account is ready.' : 'Check your email to confirm your account, then sign in.'; }
    const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password }); if (error) throw new Error('Sign-in failed. Check your email/password and confirm your email first.'); return 'Signed in.';
  }, onSuccess: setMessage });
  const password = useMutation({ mutationFn: async () => { const next = form.getValues('password'); if (next.length < 10) throw new Error('Use at least 10 characters.'); const { error } = await supabase!.auth.updateUser({ password: next }); if (error) throw new Error('Password update failed. Request a fresh recovery link.'); }, onSuccess: () => { finishRecovery(); setMessage('Password updated.'); } });
  const logout = useMutation({ mutationFn: async () => { const { error } = await supabase!.auth.signOut(); if (error) throw new Error('Could not sign out. Retry.'); } });
  if (!ready) return <p className="p-8">Restoring your session…</p>;
  return <div className="mx-auto max-w-md py-8"><div className="glass space-y-6 rounded-3xl p-7"><LockKeyhole className="h-9 w-9 text-primary"/><div><p className="eyebrow">YOUR PRIVATE VCA WORKSPACE</p><h1 className="mt-2 font-display text-3xl font-extrabold">{recovery ? 'Set a new password' : session ? 'Welcome back.' : mode === 'signup' ? 'Start your collection.' : mode === 'reset' ? 'Recover your account' : 'Your cards. Your account.'}</h1></div>
  {session && !recovery ? <div className="space-y-4"><p className="break-all text-sm text-muted-foreground">{session.user.email}</p><p className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-primary"/>Private cloud saves enabled</p><Button asChild className="w-full"><Link to="/collection">Open my collection</Link></Button><Button asChild variant="outline" className="w-full"><Link to="/submit">My grading requests</Link></Button>{isAdmin && <Button asChild variant="outline" className="w-full"><Link to="/admin">Administration</Link></Button>}<Button variant="ghost" disabled={logout.isPending} onClick={() => logout.mutate()}>Sign out</Button></div> : recovery ? <div className="space-y-4"><label className="text-sm">New password<Input {...form.register('password')} type="password" autoComplete="new-password"/></label><Button disabled={password.isPending} onClick={() => password.mutate()}>Update password</Button></div> : <form className="space-y-4" onSubmit={form.handleSubmit(v => { setMessage(''); mutation.mutate(v); })}><label className="block space-y-2 text-sm font-medium">Email<Input {...form.register('email')} type="email" autoComplete="email"/></label>{form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}{mode !== 'reset' && <label className="block space-y-2 text-sm font-medium">Password<Input {...form.register('password')} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}/></label>}<Button className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send recovery link'}</Button><div className="flex flex-wrap justify-between gap-3 text-xs">{(['signin', 'signup', 'reset'] as Mode[]).filter(m => m !== mode).map(m => <button type="button" key={m} className="min-h-11 text-primary underline" onClick={() => { setMode(m); mutation.reset(); setMessage(''); }}>{m === 'signin' ? 'Back to sign in' : m === 'signup' ? 'Create an account' : 'Forgot password?'}</button>)}</div></form>}
  {(mutation.error || password.error || logout.error) && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{(mutation.error ?? password.error ?? logout.error)?.message}</p>}{message && <p role="status" className="flex gap-2 rounded-xl bg-blue-50 p-3 text-sm text-primary"><Mail className="h-5 w-5 shrink-0"/>{message}</p>}<p className="text-xs leading-relaxed text-muted-foreground">Photos and collection records belong to your account. Scanning is identification guidance, not physical authentication.</p></div></div>;
}
