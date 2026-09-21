import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
/** Legacy floating entry now uses the verified account role rather than localStorage. */
export default function VcaComputerDrawer() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return <Link to="/admin" className="fixed bottom-24 right-4 z-20 flex min-h-11 items-center gap-2 rounded-full border bg-white px-4 text-sm font-semibold text-primary shadow-lg"><ShieldCheck className="h-4 w-4"/>VCA operations</Link>;
}
