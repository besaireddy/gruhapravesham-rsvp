import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, 
  Settings as SettingsIcon, 
  BarChart3, 
  Send, 
  LogOut, 
  Plus, 
  FileUp, 
  Search,
  MessageCircle,
  Smartphone,
  Check,
  X,
  Trash2,
  Edit2,
  Heart,
  Loader2,
  MessageSquare,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings, Settings } from '../contexts/SettingsContext';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import Papa from 'papaparse';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, updateSettings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-[#717171] font-medium">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#ebebeb] flex flex-col hidden md:flex">
        <div className="p-6 border-b border-[#ebebeb]">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface text-[#717171] hover:text-[#222222] transition-colors"
              aria-label="Back to invitation"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 text-center flex-1">
              <h2 className="text-lg font-bold tracking-tight">
                Welcome{user?.displayName ? `, ${user.displayName}` : ''}
              </h2>
              {user?.email && (
                <p className="text-xs font-medium text-[#717171] truncate">{user.email}</p>
              )}
            </div>
            <button
              onClick={() => auth.signOut()}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface text-[#717171] hover:text-[#222222] transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <SidebarLink to="/admin" icon={<BarChart3 className="w-5 h-5" />} label="Dashboard" active={location.pathname === '/admin'} />
          <SidebarLink to="/admin/invites" icon={<Users className="w-5 h-5" />} label="Contacts & Invites" active={location.pathname === '/admin/invites' || location.pathname === '/admin/guests'} />
          <SidebarLink to="/admin/settings" icon={<SettingsIcon className="w-5 h-5" />} label="Settings" active={location.pathname === '/admin/settings'} />
          <SidebarLink to="/admin/thank-you" icon={<Heart className="w-5 h-5" />} label="Thank You" active={location.pathname === '/admin/thank-you'} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="flex justify-between items-center gap-3 p-4 md:hidden bg-white border-b border-[#ebebeb]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface text-[#717171] hover:text-[#222222] transition-colors"
            aria-label="Back to invitation"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2 className="text-lg font-bold tracking-tight">
              Welcome{user?.displayName ? `, ${user.displayName}` : ''}
            </h2>
            {user?.email && (
              <p className="text-xs font-medium text-[#717171] truncate">{user.email}</p>
            )}
          </div>
          <button
            onClick={() => auth.signOut()}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface text-[#717171] hover:text-[#222222] transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 md:p-12">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="invites" element={<InvitePage />} />
            <Route path="guests" element={<InvitePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="thank-you" element={<ThankYouPage />} />
          </Routes>
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[#ebebeb] flex justify-around p-3 z-50 safe-area-bottom">
        <Link to="/admin" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/admin' ? 'text-brand' : 'text-[#717171]'}`}>
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Stats</span>
        </Link>
        <Link to="/admin/invites" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/admin/invites' || location.pathname === '/admin/guests' ? 'text-brand' : 'text-[#717171]'}`}>
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold">Contacts</span>
        </Link>
        <Link to="/admin/settings" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/admin/settings' ? 'text-brand' : 'text-[#717171]'}`}>
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold">Settings</span>
        </Link>
        <Link to="/admin/thank-you" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/admin/thank-you' ? 'text-brand' : 'text-[#717171]'}`}>
          <Heart className="w-5 h-5" />
          <span className="text-[10px] font-bold">Thanks</span>
        </Link>
      </div>
    </div>
  );
}

function SidebarLink({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link 
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active ? 'bg-[#222222] text-white' : 'text-[#717171] hover:text-[#222222] hover:bg-surface'
      }`}
    >
      {icon}
      <span className="font-bold text-sm">{label}</span>
    </Link>
  );
}

function Dashboard() {
  const [guests, setGuests] = useState<any[]>([]);
  const [selectedResponseIds, setSelectedResponseIds] = useState<string[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'guests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guests');
    });
    return unsubscribe;
  }, []);

  const stats = {
    total: guests.length,
    attending: guests.filter(g => g.status === 'attending').length,
    maybe: guests.filter(g => g.status === 'maybe').length,
    declined: guests.filter(g => g.status === 'declined').length,
    pending: guests.filter(g => g.status === 'pending').length,
    adults: guests.reduce((acc, g) => acc + (g.adults || 0), 0),
    children: guests.reduce((acc, g) => acc + (g.children || 0), 0)
  };

  const totalPeopleAttending = stats.adults + stats.children;
  const respondedGuests = guests.filter(g => g.status !== 'pending');
  const allResponsesSelected = respondedGuests.length > 0 && respondedGuests.every(g => selectedResponseIds.includes(g.id));

  const toggleResponseSelection = (guestId: string) => {
    setSelectedResponseIds((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId]
    );
  };

  const toggleSelectAllResponses = () => {
    if (allResponsesSelected) {
      setSelectedResponseIds([]);
      return;
    }
    setSelectedResponseIds(respondedGuests.map((guest) => guest.id));
  };

  const deleteSelectedResponses = async () => {
    if (selectedResponseIds.length === 0) return;
    if (!confirm(`Delete ${selectedResponseIds.length} selected response(s)? This will clear the RSVP details but keep the guests in your guest list.`)) {
      return;
    }

    try {
      await Promise.all(
        selectedResponseIds.map((guestId) =>
          updateDoc(doc(db, 'guests', guestId), {
            status: 'pending',
            adults: 0,
            children: 0,
            message: '',
            lastUpdated: serverTimestamp()
          })
        )
      );
      setSelectedResponseIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'guests');
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
      
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <SnapshotCard
          title="Attendance"
          subtitle="Guest count"
          accent="bg-[#f6efe3]"
          badge="bg-[#fff1d6]"
          icon="people"
          stats={[
            { label: 'Total people attending', value: totalPeopleAttending.toString() },
            { label: 'Adults attending', value: stats.adults.toString() },
            { label: 'Children attending', value: stats.children.toString() }
          ]}
        />
        <SnapshotCard
          title="RSVPs"
          subtitle="Response summary"
          accent="bg-[#f3efe8]"
          badge="bg-[#efe5d6]"
          icon="status"
          stats={[
            { label: 'Total RSVPs', value: stats.total.toString() },
            { label: 'Attending', value: stats.attending.toString() },
            { label: 'Declined + pending', value: String(stats.declined + stats.pending) }
          ]}
        />
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-xl font-bold">Responses</h3>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#6b4b3a]">
              <input
                type="checkbox"
                checked={allResponsesSelected}
                onChange={toggleSelectAllResponses}
                className="h-4 w-4 rounded border-[#d7c3a4] text-[#5b3624] focus:ring-[#5b3624]"
              />
              <span>Select all</span>
            </label>
            <button
              type="button"
              onClick={deleteSelectedResponses}
              disabled={selectedResponseIds.length === 0}
              className="inline-flex items-center gap-2 rounded-full border border-[#e7c485]/40 bg-[#fff8ee] px-4 py-2 text-sm font-semibold text-[#8a3b2e] hover:bg-[#f8ead0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete selected</span>
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {respondedGuests.map((guest) => (
            <div key={guest.id} className="p-6 bg-white rounded-2xl border border-[#ebebeb] hover:shadow-md transition-all">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedResponseIds.includes(guest.id)}
                      onChange={() => toggleResponseSelection(guest.id)}
                      className="mt-1 h-4 w-4 rounded border-[#d7c3a4] text-[#5b3624] focus:ring-[#5b3624]"
                    />
                    <p className="font-bold text-lg text-[#222222] truncate">{guest.name}</p>
                  </div>
                  <p className="text-sm font-bold text-[#4d2718] whitespace-nowrap">
                    {(guest.adults || 0) + (guest.children || 0)} guests
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#6b4b3a]">
                  <span className="capitalize">{guest.status}</span>
                  {guest.status !== 'declined' && (
                    <>
                      <span className="mx-2 text-[#b79361]">-</span>
                      <span>[{guest.adults || 0}A]</span>
                      <span className="mx-1">[{guest.children || 0}C]</span>
                    </>
                  )}
                </p>
                {guest.message && (
                  <p className="mt-2 text-sm text-[#717171] line-clamp-2">{guest.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({
  title,
  subtitle,
  accent,
  badge,
  icon,
  stats
}: {
  title: string,
  subtitle: string,
  accent: string,
  badge: string,
  icon: 'people' | 'status',
  stats: { label: string, value: string }[]
}) {
  const isPeople = icon === 'people';

  return (
    <div className="rounded-[1.5rem] md:rounded-[2rem] bg-white border border-[#e8e3da] shadow-[0_18px_40px_rgba(44,30,18,0.08)] p-4 md:p-8">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_220px] gap-5 md:gap-10 items-center">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className={`relative mb-4 flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded-full ${accent}`}>
            <div className={`absolute -bottom-1 -right-1 flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full ${badge} border-4 border-white shadow-sm`}>
              {isPeople ? (
                <Users className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#5b3624]" />
              ) : (
                <Check className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 text-[#5b3624]" />
              )}
            </div>
            {isPeople ? (
              <div className="flex items-end gap-1.5 md:gap-2">
                <div className="h-5 w-5 md:h-8 md:w-8 rounded-full bg-[#d9b58a]" />
                <div className="h-8 w-8 md:h-11 md:w-11 rounded-full bg-[#c48d57]" />
                <div className="h-4.5 w-4.5 md:h-7 md:w-7 rounded-full bg-[#e8c79d]" />
              </div>
            ) : (
              <div className="flex items-end gap-1.5 md:gap-2">
                <div className="w-2.5 md:w-3.5 rounded-t-full bg-[#e6c083]" style={{ height: '18px' }} />
                <div className="w-2.5 md:w-3.5 rounded-t-full bg-[#c97b52]" style={{ height: '30px' }} />
                <div className="w-2.5 md:w-3.5 rounded-t-full bg-[#8b6244]" style={{ height: '14px' }} />
              </div>
            )}
          </div>
          <h3 className="text-xl md:text-4xl font-bold tracking-tight text-[#222222]">{title}</h3>
          <p className="mt-1 md:mt-2 text-xs md:text-base text-[#555555] font-semibold">{subtitle}</p>
        </div>

        <div className="space-y-3 md:space-y-5">
          {stats.map((stat, index) => (
            <div key={stat.label} className={index < stats.length - 1 ? 'pb-3 md:pb-5 border-b border-[#ece7df]' : ''}>
              <p className="text-2xl md:text-4xl font-bold tracking-tight text-[#2f2f2f]">{stat.value}</p>
              <p className="text-xs md:text-base text-[#555555] font-medium leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GuestManagement() {
  const [guests, setGuests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const formatUsPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const normalizeUsPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 ? `+1${digits}` : value;
  };

  const formatEditableUsPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const localDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    return formatUsPhoneNumber(localDigits);
  };

  const formatDisplayUsPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const localDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    return localDigits ? `+1 ${formatUsPhoneNumber(localDigits)}` : '';
  };

  useEffect(() => {
    const q = query(collection(db, 'guests'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guests');
    });
    return unsubscribe;
  }, []);

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    const phoneDigits = newPhone.replace(/\D/g, '');
    if (newPhone && phoneDigits.length !== 10) {
      alert('Please enter a valid 10-digit US mobile number.');
      return;
    }
    try {
      await addDoc(collection(db, 'guests'), {
        name: newName,
        phone: normalizeUsPhoneNumber(newPhone),
        status: 'pending',
        adults: 0,
        children: 0,
        message: '',
        invited: false,
        lastUpdated: serverTimestamp()
      });
      setNewName('');
      setNewPhone('');
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'guests');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this guest?')) {
      try {
        await deleteDoc(doc(db, 'guests', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `guests/${id}`);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          results.data.forEach(async (row: any) => {
            if (row.name) {
              await addDoc(collection(db, 'guests'), {
                name: row.name,
                phone: row.phone || '',
                status: 'pending',
                adults: 0,
                children: 0,
                message: '',
                invited: false,
                lastUpdated: serverTimestamp()
              });
            }
          });
        }
      });
    }
  };

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.phone.includes(search)
  );

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Guest List</h1>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <label className="apple-button bg-white border border-[#ebebeb] flex items-center gap-2 cursor-pointer hover:bg-surface text-xs md:text-sm px-3 md:px-6 py-2 md:py-3">
            <FileUp className="w-4 h-4" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={() => setIsAdding(true)}
            className="apple-button bg-[#222222] text-white flex items-center gap-2 text-xs md:text-sm px-3 md:px-6 py-2 md:py-3"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Guest</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171]" />
        <input 
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search guests..."
          className="w-full bg-white border border-[#ebebeb] rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
        />
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="apple-card p-8"
        >
          <form onSubmit={handleAddGuest} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              required
              placeholder="Guest Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-4 py-3 bg-surface rounded-xl focus:outline-none"
            />
            <input 
              placeholder="(602) 642-7380"
              value={newPhone}
              onChange={(e) => setNewPhone(formatUsPhoneNumber(e.target.value))}
              inputMode="tel"
              className="px-4 py-3 bg-surface rounded-xl focus:outline-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-brand text-white font-bold rounded-xl">Save</button>
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 bg-[#ebebeb] rounded-xl"><X /></button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left hidden sm:table">
            <thead>
              <tr className="bg-surface border-b border-[#ebebeb]">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#717171]">Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#717171]">Phone</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#717171]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebebeb]">
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 font-bold">{guest.name}</td>
                  <td className="px-6 py-4 text-[#717171]">{guest.phone}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(guest.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile View */}
          <div className="sm:hidden divide-y divide-[#ebebeb]">
            {filteredGuests.map((guest) => (
              <div key={guest.id} className="p-4 space-y-3 bg-white mb-4 rounded-2xl border border-[#ebebeb]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg">{guest.name}</p>
                    <p className="text-sm text-[#717171]">{guest.phone}</p>
                  </div>
                  <button onClick={() => handleDelete(guest.id)} className="p-2 text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InvitePage() {
  const [guests, setGuests] = useState<any[]>([]);
  const { settings } = useSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingContactName, setEditingContactName] = useState('');
  const [editingContactPhone, setEditingContactPhone] = useState('');
  const [customMsgs, setCustomMsgs] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const formatUsPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const normalizeUsPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 ? `+1${digits}` : value;
  };

  const formatEditableUsPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const localDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    return formatUsPhoneNumber(localDigits);
  };

  const formatDisplayUsPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const localDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    return localDigits ? formatUsPhoneNumber(localDigits) : '';
  };

  useEffect(() => {
    const q = query(collection(db, 'guests'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guestData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setGuests(guestData);
      
      const msgs: Record<string, string> = {};
      guestData.forEach(g => {
        msgs[g.id] = `Dear ${g.name},\n\nWith joy in our hearts, we are stepping into our new home and would be delighted to celebrate this special occasion with you. Please join us for our Gruhapravesham (housewarming) on ${settings.eventDate}.\n\nYour presence would mean a lot to us.\n\nKindly RSVP here:\n${window.location.origin}?guestId=${g.id}\n\nWith love,\n${settings.hostName}`;
      });
      setCustomMsgs(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guests');
    });
    return unsubscribe;
  }, [settings.eventDate]);

  const filteredGuests = guests.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.phone || '').includes(search)
  );

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    const phoneDigits = newPhone.replace(/\D/g, '');
    if (newPhone && phoneDigits.length !== 10) {
      alert('Please enter a valid 10-digit US mobile number.');
      return;
    }
    try {
      await addDoc(collection(db, 'guests'), {
        name: newName,
        phone: normalizeUsPhoneNumber(newPhone),
        status: 'pending',
        adults: 0,
        children: 0,
        message: '',
        invited: false,
        lastUpdated: serverTimestamp()
      });
      setNewName('');
      setNewPhone('');
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'guests');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          results.data.forEach(async (row: any) => {
            if (row.name) {
              await addDoc(collection(db, 'guests'), {
                name: row.name,
                phone: row.phone ? normalizeUsPhoneNumber(String(row.phone)) : '',
                status: 'pending',
                adults: 0,
                children: 0,
                message: '',
                invited: false,
                lastUpdated: serverTimestamp()
              });
            }
          });
        }
      });
    }
  };

  const sendWhatsApp = (guest: any) => {
    const msg = encodeURIComponent(customMsgs[guest.id]);
    const phone = guest.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    try {
      updateDoc(doc(db, 'guests', guest.id), { invited: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `guests/${guest.id}`);
    }
  };

  const sendSMS = (guest: any) => {
    const msg = encodeURIComponent(customMsgs[guest.id]);
    const phone = guest.phone.replace(/\D/g, '');
    window.open(`sms:${phone}?body=${msg}`, '_blank');
    try {
      updateDoc(doc(db, 'guests', guest.id), { invited: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `guests/${guest.id}`);
    }
  };

  const startEditingContact = (guest: any) => {
    setEditingContactId(guest.id);
    setEditingContactName(guest.name || '');
    setEditingContactPhone(formatEditableUsPhoneNumber(guest.phone || ''));
  };

  const saveContact = async (guestId: string) => {
    const trimmedName = editingContactName.trim();
    const phoneDigits = editingContactPhone.replace(/\D/g, '');

    if (!trimmedName) {
      alert('Please enter a guest name.');
      return;
    }

    if (editingContactPhone && phoneDigits.length !== 10) {
      alert('Please enter a valid 10-digit US mobile number.');
      return;
    }

    try {
      await updateDoc(doc(db, 'guests', guestId), {
        name: trimmedName,
        phone: normalizeUsPhoneNumber(editingContactPhone),
        lastUpdated: serverTimestamp()
      });
      setEditingContactId(null);
      setEditingContactName('');
      setEditingContactPhone('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `guests/${guestId}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Contacts & Invites</h1>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <label className="apple-button bg-white border border-[#ebebeb] flex items-center gap-2 cursor-pointer hover:bg-surface text-xs md:text-sm px-3 md:px-6 py-2 md:py-3">
            <FileUp className="w-4 h-4" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={() => setIsAdding(true)}
            className="apple-button bg-[#222222] text-white flex items-center gap-2 text-xs md:text-sm px-3 md:px-6 py-2 md:py-3"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Contact</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts by name or phone..."
          className="w-full bg-white border border-[#ebebeb] rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
        />
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="apple-card p-8"
        >
          <form onSubmit={handleAddGuest} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              required
              placeholder="Guest Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-4 py-3 bg-surface rounded-xl focus:outline-none"
            />
            <input
              placeholder="(602) 642-7380"
              value={newPhone}
              onChange={(e) => setNewPhone(formatUsPhoneNumber(e.target.value))}
              inputMode="tel"
              className="px-4 py-3 bg-surface rounded-xl focus:outline-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-brand text-white font-bold rounded-xl">Save</button>
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 bg-[#ebebeb] rounded-xl"><X /></button>
            </div>
          </form>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredGuests.map((guest) => (
          <div key={guest.id} className="relative overflow-hidden rounded-[1.75rem] border border-[#eadfce] bg-gradient-to-br from-white via-[#fffaf4] to-[#f5ead9] p-4 md:p-5 shadow-[0_14px_28px_rgba(64,36,22,0.08)]">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#d8a033]/40 to-transparent" />
            <div>
              <div className="flex items-start gap-3 mb-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f0debf] text-[#6a4430] text-sm font-bold shadow-sm">
                  {guest.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part: string) => part[0]?.toUpperCase())
                    .join('')}
                  {guest.status !== 'pending' ? (
                    <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2f8a4b] text-white ring-2 ring-[#fffaf4] shadow-sm">
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    </span>
                  ) : guest.invited ? (
                    <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#2f8a4b] ring-2 ring-[#fffaf4] shadow-sm">
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  {editingContactId === guest.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingContactName}
                        onChange={(e) => setEditingContactName(e.target.value)}
                        className="w-full rounded-xl border border-[#e5d8c7] bg-white/90 px-3 py-2 text-sm font-semibold text-[#2f1b12] focus:outline-none focus:ring-2 focus:ring-brand/20"
                        placeholder="Guest name"
                      />
                      <div className="flex items-center rounded-xl border border-[#e5d8c7] bg-white/90 focus-within:ring-2 focus-within:ring-brand/20">
                        <span className="px-3 text-xs font-semibold text-[#7b6858]">+1</span>
                        <input
                          value={editingContactPhone}
                          onChange={(e) => setEditingContactPhone(formatUsPhoneNumber(e.target.value))}
                          inputMode="tel"
                          className="w-full rounded-r-xl bg-transparent py-2 pr-3 text-xs text-[#7b6858] focus:outline-none"
                          placeholder="(602) 642-7380"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-[1.05rem] font-bold leading-tight text-[#2f1b12] truncate">{guest.name}</h3>
                      {guest.phone && <p className="text-xs text-[#7b6858] truncate mt-1">{formatDisplayUsPhoneNumber(guest.phone)}</p>}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 self-start">
                  <button
                    onClick={() => {
                      if (editingContactId === guest.id) {
                        void saveContact(guest.id);
                      } else {
                        startEditingContact(guest);
                      }
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 border border-[#e5d8c7] text-[#7a6655] hover:text-[#3d281d] hover:bg-[#fffdf9] transition-colors shrink-0 shadow-sm"
                    aria-label={editingContactId === guest.id ? `Save ${guest.name}` : `Edit contact for ${guest.name}`}
                  >
                    {editingContactId === guest.id ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={async () => {
                      if (editingContactId === guest.id) {
                        setEditingContactId(null);
                        setEditingContactName('');
                        setEditingContactPhone('');
                        return;
                      }
                      if (!confirm(`Delete ${guest.name} from contacts?`)) return;
                      try {
                        await deleteDoc(doc(db, 'guests', guest.id));
                      } catch (error) {
                        handleFirestoreError(error, OperationType.DELETE, `guests/${guest.id}`);
                      }
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 border border-[#e5d8c7] text-[#7a6655] hover:text-[#3d281d] hover:bg-[#fffdf9] transition-colors shrink-0 shadow-sm"
                    aria-label={editingContactId === guest.id ? 'Cancel contact edit' : `Delete ${guest.name}`}
                  >
                    {editingContactId === guest.id ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {editingId === guest.id ? (
                <div className="rounded-2xl bg-white/80 border border-[#efe3d3] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3876a]">Invite Message</p>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#e5d8c7] text-[#7a6655] hover:text-[#3d281d] hover:bg-[#fffdf9] transition-colors shadow-sm"
                      aria-label="Close message editor"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea 
                    value={customMsgs[guest.id]}
                    onChange={(e) => setCustomMsgs({ ...customMsgs, [guest.id]: e.target.value })}
                    className="w-full text-sm bg-white/90 border border-[#e7d8c2] p-3 rounded-2xl min-h-[120px] focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(guest.id)}
                    className="min-w-0 flex-1 rounded-2xl bg-white/70 border border-[#efe3d3] px-3 py-2.5 text-left transition-colors hover:bg-white/90 hover:text-[#3d281d]"
                    aria-label={`Edit message for ${guest.name}`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3876a]">Invite Message</p>
                    <p className="mt-1 text-[11px] text-[#6b4b3a] line-clamp-1">
                      {(() => {
                        const previewLines = (customMsgs[guest.id] || '')
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .slice(0, 2);
                        return previewLines.join(' ');
                      })() || 'Invite message available'}
                    </p>
                  </button>
                  <button 
                    onClick={() => sendWhatsApp(guest)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 border border-[#d7ead9] hover:bg-[#f6fbf7] transition-colors shadow-sm"
                    aria-label={`Send WhatsApp invite to ${guest.name}`}
                  >
                    <img src="/whatsapp-logo.svg" alt="" className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => sendSMS(guest)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 border border-[#e5d8c7] hover:bg-[#f7f7f7] transition-colors shadow-sm"
                    aria-label={`Send Google Messages invite to ${guest.name}`}
                  >
                    <img src="/google-messages-logo.svg" alt="" className="w-5 h-5 rounded-full" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateSettings(localSettings);
    setIsSaving(false);
    alert('Settings saved!');
  };

  const updateSchedule = (index: number, field: string, value: string) => {
    const newSchedule = [...localSettings.schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setLocalSettings({ ...localSettings, schedule: newSchedule });
  };

  return (
    <div className="space-y-10 md:space-y-12 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <button 
          disabled={isSaving}
          onClick={handleSave}
          className="apple-button bg-[#222222] text-white px-8 py-3 hidden md:block"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      
      <div className="space-y-12 max-w-3xl">
        {/* Hero & Welcome */}
        <section className="space-y-6">
          <div className="border-b border-[#ebebeb] pb-4">
            <h3 className="text-xl font-bold">Hero & Welcome</h3>
            <p className="text-sm text-[#717171]">Customize the first thing your guests see.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#717171]">Hero Title</label>
              <input 
                value={localSettings.heroTitle}
                onChange={(e) => setLocalSettings({ ...localSettings, heroTitle: e.target.value })}
                className="w-full px-4 py-4 bg-white border border-[#ebebeb] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                placeholder="e.g., Gruhapravesham aahwanam"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#717171]">Hero Subtitle (English)</label>
              <input 
                value={localSettings.heroSubtitle}
                onChange={(e) => setLocalSettings({ ...localSettings, heroSubtitle: e.target.value })}
                className="w-full px-4 py-4 bg-white border border-[#ebebeb] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                placeholder="e.g., Housewarming Ceremony Invitation"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#717171]">Welcome Message</label>
              <textarea 
                value={localSettings.welcomeMessage}
                onChange={(e) => setLocalSettings({ ...localSettings, welcomeMessage: e.target.value })}
                className="w-full px-4 py-4 bg-white border border-[#ebebeb] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all min-h-[120px]"
                placeholder="A warm message for your guests"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#717171]">Cover Photo URL</label>
              <input 
                value={localSettings.coverPhotoUrl}
                onChange={(e) => setLocalSettings({ ...localSettings, coverPhotoUrl: e.target.value })}
                className="w-full px-4 py-4 bg-white border border-[#ebebeb] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                placeholder="https://images.unsplash.com/..."
              />
              {localSettings.coverPhotoUrl && (
                <div className="mt-4 rounded-2xl overflow-hidden h-48 border border-[#ebebeb] shadow-sm">
                  <img src={localSettings.coverPhotoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Event Details */}
        <section className="space-y-6">
          <div className="border-b border-[#ebebeb] pb-4">
            <h3 className="text-xl font-bold">Event Details</h3>
            <p className="text-sm text-[#717171]">Essential information for your guests.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#717171]">Host Name(s)</label>
              <input 
                value={localSettings.hostName}
                onChange={(e) => setLocalSettings({ ...localSettings, hostName: e.target.value })}
                className="w-full px-4 py-4 bg-white border border-[#ebebeb] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#717171]">Event Date</label>
              <input 
                value={localSettings.eventDate}
                onChange={(e) => setLocalSettings({ ...localSettings, eventDate: e.target.value })}
                className="w-full px-4 py-4 bg-white border border-[#ebebeb] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#717171]">Address</label>
              <input 
                value={localSettings.address}
                onChange={(e) => setLocalSettings({ ...localSettings, address: e.target.value })}
                className="w-full px-4 py-4 bg-white border border-[#ebebeb] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#717171]">Dress Code</label>
              <input 
                value={localSettings.dressCode}
                onChange={(e) => setLocalSettings({ ...localSettings, dressCode: e.target.value })}
                className="w-full px-4 py-4 bg-white border border-[#ebebeb] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>
          </div>
        </section>

        {/* Schedule */}
        <section className="space-y-6">
          <div className="border-b border-[#ebebeb] pb-4">
            <h3 className="text-xl font-bold">Schedule</h3>
            <p className="text-sm text-[#717171]">What's happening and when.</p>
          </div>
          <div className="space-y-4">
            {localSettings.schedule.map((item, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input 
                  value={item.time}
                  onChange={(e) => updateSchedule(index, 'time', e.target.value)}
                  placeholder="Time"
                  className="px-4 py-4 bg-white border border-[#ebebeb] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                />
                <input 
                  value={item.event}
                  onChange={(e) => updateSchedule(index, 'event', e.target.value)}
                  placeholder="Event"
                  className="px-4 py-4 bg-white border border-[#ebebeb] rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                />
              </div>
            ))}
          </div>
        </section>

        <button 
          disabled={isSaving}
          onClick={handleSave}
          className="apple-button bg-[#222222] text-white w-full py-5 text-lg md:hidden"
        >
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}

function ThankYouPage() {
  const [guests, setGuests] = useState<any[]>([]);
  const { settings } = useSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customMsgs, setCustomMsgs] = useState<Record<string, string>>({});

  const formatUsPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const formatDisplayUsPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const localDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    return localDigits ? `+1 ${formatUsPhoneNumber(localDigits)}` : '';
  };

  useEffect(() => {
    const q = query(collection(db, 'guests'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guestData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setGuests(guestData);

      const msgs: Record<string, string> = {};
      guestData.forEach((g) => {
        msgs[g.id] = `Hi ${g.name}!\n\nThank you so much for joining us for our Gruhapravesham. Your presence made the day even more special for us.\n\nWith love,\n${settings.hostName}`;
      });
      setCustomMsgs(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guests');
    });
    return unsubscribe;
  }, [settings.hostName]);

  const attendingGuests = guests.filter(g => g.status === 'attending');

  const sendThankYouWhatsApp = (guest: any) => {
    const msg = encodeURIComponent(customMsgs[guest.id] || '');
    const phone = guest.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const sendThankYouSMS = (guest: any) => {
    const msg = encodeURIComponent(customMsgs[guest.id] || '');
    const phone = guest.phone.replace(/\D/g, '');
    window.open(`sms:${phone}?body=${msg}`, '_blank');
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold tracking-tight">Send Thank You Messages</h1>
      <p className="text-[#717171]">Send gratitude to the {attendingGuests.length} guests who attended.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {attendingGuests.map((guest) => (
          <div key={guest.id} className="relative overflow-hidden rounded-[1.75rem] border border-[#eadfce] bg-gradient-to-br from-white via-[#fffaf4] to-[#f5ead9] p-4 md:p-5 shadow-[0_14px_28px_rgba(64,36,22,0.08)]">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#d8a033]/40 to-transparent" />
            <div>
              <div className="flex items-start gap-3 mb-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f0debf] text-[#6a4430] text-sm font-bold shadow-sm">
                  {guest.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part: string) => part[0]?.toUpperCase())
                    .join('')}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h3 className="text-[1.05rem] font-bold leading-tight text-[#2f1b12] truncate">{guest.name}</h3>
                  {guest.phone && <p className="text-xs text-[#7b6858] truncate mt-1">{formatDisplayUsPhoneNumber(guest.phone)}</p>}
                </div>
              </div>

              {editingId === guest.id ? (
                <div className="rounded-2xl bg-white/80 border border-[#efe3d3] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3876a]">Thank You Message</p>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#e5d8c7] text-[#7a6655] hover:text-[#3d281d] hover:bg-[#fffdf9] transition-colors shadow-sm"
                      aria-label="Close thank you editor"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={customMsgs[guest.id]}
                    onChange={(e) => setCustomMsgs({ ...customMsgs, [guest.id]: e.target.value })}
                    className="w-full text-sm bg-white/90 border border-[#e7d8c2] p-3 rounded-2xl min-h-[120px] focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(guest.id)}
                    className="min-w-0 flex-1 rounded-2xl bg-white/70 border border-[#efe3d3] px-3 py-2.5 text-left transition-colors hover:bg-white/90 hover:text-[#3d281d]"
                    aria-label={`Edit thank you message for ${guest.name}`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3876a]">Thank You Message</p>
                    <p className="mt-1 text-[11px] text-[#6b4b3a] line-clamp-1">
                      {(() => {
                        const previewLines = (customMsgs[guest.id] || '')
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .slice(0, 2);
                        return previewLines.join(' ');
                      })() || 'Thank you message available'}
                    </p>
                  </button>
                  <button
                    onClick={() => sendThankYouWhatsApp(guest)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 border border-[#d7ead9] hover:bg-[#f6fbf7] transition-colors shadow-sm"
                    aria-label={`Send thank you via WhatsApp to ${guest.name}`}
                  >
                    <img src="/whatsapp-logo.svg" alt="" className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => sendThankYouSMS(guest)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 border border-[#e5d8c7] hover:bg-[#f7f7f7] transition-colors shadow-sm"
                    aria-label={`Send thank you via Google Messages to ${guest.name}`}
                  >
                    <img src="/google-messages-logo.svg" alt="" className="w-5 h-5 rounded-full" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
