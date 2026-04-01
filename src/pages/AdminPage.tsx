import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
import { hasEventPassed, parseConfiguredEventDate } from '../lib/eventUtils';
import {
  buildInviteMessage,
  buildReminderMessage,
  buildThankYouMessage,
  formatDisplayUsPhoneNumber,
  formatEditableUsPhoneNumber,
  formatUsPhoneNumber,
  getDashboardStats,
  getMessagePreview,
  matchesGuestSearch,
  normalizeGuestName,
  normalizeUsPhoneNumber
} from '../lib/guestUtils';
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
              className="flex items-center justify-center w-10 h-10 rounded-full border border-transparent bg-white text-[#717171] hover:border-[#eadfce] hover:bg-[#fff8ee] hover:text-[#222222] hover:shadow-[0_10px_20px_rgba(44,30,18,0.08)] transition-all duration-200"
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
              className="flex items-center justify-center w-10 h-10 rounded-full border border-transparent bg-white text-[#717171] hover:border-[#eadfce] hover:bg-[#fff8ee] hover:text-[#222222] hover:shadow-[0_10px_20px_rgba(44,30,18,0.08)] transition-all duration-200"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <SidebarLink to="/admin" icon={<BarChart3 className="w-5 h-5" />} label="Dashboard" active={location.pathname === '/admin'} />
          <SidebarLink to="/admin/invites" icon={<Users className="w-5 h-5" />} label="Contacts & Invites" active={location.pathname === '/admin/invites' || location.pathname === '/admin/guests' || location.pathname === '/admin/thank-you'} />
          <SidebarLink to="/admin/settings" icon={<SettingsIcon className="w-5 h-5" />} label="Settings" active={location.pathname === '/admin/settings'} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="flex justify-between items-center gap-3 p-4 md:hidden bg-white border-b border-[#ebebeb]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-transparent bg-white text-[#717171] hover:border-[#eadfce] hover:bg-[#fff8ee] hover:text-[#222222] hover:shadow-[0_10px_20px_rgba(44,30,18,0.08)] transition-all duration-200"
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
            className="flex items-center justify-center w-10 h-10 rounded-full border border-transparent bg-white text-[#717171] hover:border-[#eadfce] hover:bg-[#fff8ee] hover:text-[#222222] hover:shadow-[0_10px_20px_rgba(44,30,18,0.08)] transition-all duration-200"
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
            <Route path="thank-you" element={<InvitePage />} />
          </Routes>
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[#ebebeb] flex justify-around p-3 z-50 safe-area-bottom">
        <Link to="/admin" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/admin' ? 'text-brand' : 'text-[#717171]'}`}>
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Stats</span>
        </Link>
        <Link to="/admin/invites" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/admin/invites' || location.pathname === '/admin/guests' || location.pathname === '/admin/thank-you' ? 'text-brand' : 'text-[#717171]'}`}>
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold">Contacts</span>
        </Link>
        <Link to="/admin/settings" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/admin/settings' ? 'text-brand' : 'text-[#717171]'}`}>
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold">Settings</span>
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
  const navigate = useNavigate();
  const [guests, setGuests] = useState<any[]>([]);
  const [selectedResponseIds, setSelectedResponseIds] = useState<string[]>([]);
  const [expandedResponseIds, setExpandedResponseIds] = useState<string[]>([]);
  const [responseFilter, setResponseFilter] = useState<'all' | 'attending' | 'declined'>('all');
  const responsesSectionRef = useRef<HTMLDivElement | null>(null);
  const longPressRef = useRef<{ timeoutId: number | null; guestId: string | null; triggered: boolean }>({
    timeoutId: null,
    guestId: null,
    triggered: false
  });

  useEffect(() => {
    const q = query(collection(db, 'guests'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guests');
    });
    return unsubscribe;
  }, []);

  const stats = useMemo(() => getDashboardStats(guests), [guests]);
  const totalPeopleAttending = stats.totalPeopleAttending;
  const respondedGuests = useMemo(() => guests.filter(g => g.status !== 'pending'), [guests]);
  const filteredResponses = useMemo(() => {
    if (responseFilter === 'all') {
      return respondedGuests;
    }
    return respondedGuests.filter((guest) => guest.status === responseFilter);
  }, [respondedGuests, responseFilter]);
  const allResponsesSelected = filteredResponses.length > 0 && filteredResponses.every(g => selectedResponseIds.includes(g.id));

  const toggleResponseSelection = (guestId: string) => {
    setSelectedResponseIds((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId]
    );
  };

  const toggleSelectAllResponses = () => {
    if (allResponsesSelected) {
      const filteredIds = new Set(filteredResponses.map((guest) => guest.id));
      setSelectedResponseIds((current) => current.filter((id) => !filteredIds.has(id)));
      return;
    }
    setSelectedResponseIds((current) => {
      const next = new Set(current);
      filteredResponses.forEach((guest) => next.add(guest.id));
      return Array.from(next);
    });
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

  const toggleResponseMessage = (guestId: string) => {
    setExpandedResponseIds((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId]
    );
  };

  const exportDashboardData = () => {
    const escapeCsvValue = (value: string | number) => {
      const stringValue = String(value ?? '');
      return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
    };

    const summaryRows = [
      ['Metric', 'Value'],
      ['Total RSVPs', stats.total],
      ['Attending', stats.attending],
      ['Declined', stats.declined],
      ['Pending', stats.pending],
      ['Total people attending', totalPeopleAttending],
      ['Adults attending', stats.adults],
      ['Children attending', stats.children]
    ];

    const responseRows = [
      ['Name', 'Status', 'Adults', 'Children', 'Total Guests', 'Message'],
      ...respondedGuests.map((guest) => [
        guest.name || '',
        guest.status || '',
        guest.adults || 0,
        guest.children || 0,
        (guest.adults || 0) + (guest.children || 0),
        guest.message || ''
      ])
    ];

    const csvContent = [
      ...summaryRows.map((row) => row.map(escapeCsvValue).join(',')),
      '',
      'Responses',
      ...responseRows.map((row) => row.map(escapeCsvValue).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `gruhapravesham-dashboard-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const beginResponseLongPress = (guestId: string) => {
    if (selectedResponseIds.includes(guestId)) return;

    longPressRef.current.guestId = guestId;
    longPressRef.current.triggered = false;
    longPressRef.current.timeoutId = window.setTimeout(() => {
      toggleResponseSelection(guestId);
      longPressRef.current.triggered = true;
      longPressRef.current.timeoutId = null;
    }, 450);
  };

  const endResponseLongPress = () => {
    if (longPressRef.current.timeoutId) {
      window.clearTimeout(longPressRef.current.timeoutId);
      longPressRef.current.timeoutId = null;
    }
  };

  const handleResponseCardClick = (guestId: string) => {
    if (longPressRef.current.triggered && longPressRef.current.guestId === guestId) {
      longPressRef.current.triggered = false;
      longPressRef.current.guestId = null;
      return;
    }

    if (selectedResponseIds.length > 0) {
      toggleResponseSelection(guestId);
    }
  };

  const focusResponses = (filter: 'all' | 'attending' | 'declined') => {
    setResponseFilter(filter);
    window.setTimeout(() => {
      responsesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
        <button
          type="button"
          onClick={exportDashboardData}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e7c485]/50 bg-[#fff8ee] px-4 py-2.5 text-sm font-semibold text-[#7a5035] transition-colors hover:bg-[#f8ead0]"
        >
          <FileUp className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>
      
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
          highlight={{ label: 'Total RSVPs', value: stats.total.toString() }}
          stats={[
            { label: 'Attending', value: stats.attending.toString(), onClick: () => focusResponses('attending') },
            { label: 'Declined', value: stats.declined.toString(), onClick: () => focusResponses('declined') },
            { label: 'Pending', value: stats.pending.toString(), onClick: () => navigate('/admin/invites?filter=pending') }
          ]}
        />
      </div>

      <div className="space-y-6" ref={responsesSectionRef}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-3">
            <h3 className="text-xl font-bold">Responses</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: `All Responses (${respondedGuests.length})` },
                { value: 'attending', label: `Attending (${stats.attending})` },
                { value: 'declined', label: `Declined (${stats.declined})` }
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setResponseFilter(filter.value as 'all' | 'attending' | 'declined')}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    responseFilter === filter.value
                      ? 'bg-[#222222] text-white'
                      : 'bg-[#fff8ee] text-[#7a5035] border border-[#e7c485]/40 hover:bg-[#f8ead0]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-3 text-sm font-medium text-[#6b4b3a]">
              <button
                type="button"
                onClick={toggleSelectAllResponses}
                className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                  allResponsesSelected
                    ? 'border-brand bg-brand text-white'
                    : 'border-[#d8c3aa] bg-white text-transparent hover:border-brand/60'
                }`}
                aria-label={allResponsesSelected ? 'Deselect all responses' : 'Select all responses'}
              >
                <Check className="w-3 h-3" strokeWidth={3} />
              </button>
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
          {filteredResponses.map((guest) => (
            <div
              key={guest.id}
              className={`relative overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_14px_28px_rgba(64,36,22,0.08)] transition-all ${
                selectedResponseIds.includes(guest.id)
                  ? 'border-[#d8a033] bg-gradient-to-br from-[#fff9ef] via-[#fff2db] to-[#f7e4be] ring-2 ring-[#d8a033]/35'
                  : 'border-[#eadfce] bg-gradient-to-br from-white via-[#fffaf4] to-[#f5ead9]'
              }`}
              onPointerDown={() => beginResponseLongPress(guest.id)}
              onPointerUp={endResponseLongPress}
              onPointerLeave={endResponseLongPress}
              onPointerCancel={endResponseLongPress}
              onClick={() => handleResponseCardClick(guest.id)}
            >
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#d8a033]/40 to-transparent" />
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                    selectedResponseIds.includes(guest.id)
                      ? 'bg-[#d8a033] text-white'
                      : 'bg-[#f0debf] text-[#6a4430]'
                  }`}>
                    {selectedResponseIds.includes(guest.id) ? (
                      <Check className="w-5 h-5" strokeWidth={3} />
                    ) : (
                      guest.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part: string) => part[0]?.toUpperCase())
                        .join('')
                    )}
                    <span className={`absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-[#fffaf4] shadow-sm ${
                      guest.status === 'attending'
                        ? 'bg-[#2f8a4b] text-white'
                        : 'bg-[#8a3b2e] text-white'
                    }`}>
                      {guest.status === 'attending' ? (
                        <Check className="w-3 h-3" strokeWidth={2.5} />
                      ) : (
                        <X className="w-3 h-3" strokeWidth={2.5} />
                      )}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-bold text-lg text-[#2f1b12] truncate">{guest.name}</p>
                        <p className="text-sm font-bold text-[#4d2718] whitespace-nowrap">
                          {(guest.adults || 0) + (guest.children || 0)} guests
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          guest.status === 'attending'
                            ? 'bg-[#e7f6ea] text-[#2f8a4b]'
                            : 'bg-[#f8ebe7] text-[#8a3b2e]'
                        }`}>
                          {guest.status}
                        </span>
                        {guest.status !== 'declined' && (
                          <>
                            <span className="inline-flex items-center rounded-full border border-[#eadfce] bg-white/85 px-3 py-1 text-xs font-semibold text-[#6b4b3a]">
                              {guest.adults || 0} adult{(guest.adults || 0) === 1 ? '' : 's'}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-[#eadfce] bg-white/85 px-3 py-1 text-xs font-semibold text-[#6b4b3a]">
                              {guest.children || 0} child{(guest.children || 0) === 1 ? '' : 'ren'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {guest.message && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (selectedResponseIds.length > 0) {
                            toggleResponseSelection(guest.id);
                            return;
                          }
                          toggleResponseMessage(guest.id);
                        }}
                        className="mt-3 w-full rounded-2xl bg-white/70 border border-[#efe3d3] px-3 py-3 text-left transition-colors hover:bg-white/90"
                        aria-label={`${expandedResponseIds.includes(guest.id) ? 'Collapse' : 'Expand'} message for ${guest.name}`}
                      >
                        <p className={`text-sm text-[#6b4b3a] leading-relaxed ${expandedResponseIds.includes(guest.id) ? '' : 'line-clamp-1'}`}>
                          {guest.message}
                        </p>
                      </button>
                    )}
                  </div>
                </div>
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
  highlight,
  stats
}: {
  title: string,
  subtitle: string,
  accent: string,
  badge: string,
  icon: 'people' | 'status',
  highlight?: { label: string, value: string },
  stats: { label: string, value: string, onClick?: () => void }[]
}) {
  const isPeople = icon === 'people';
  const isStatus = icon === 'status';

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
            ) : isStatus && highlight ? (
              <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-white/80 border border-[#e0d2bf] text-[#4d2718] shadow-sm px-1">
                <span className="text-base md:text-xl font-bold tracking-tight leading-none">{highlight.value}</span>
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

        <div className="space-y-3 md:space-y-5 text-center">
          {highlight && !isStatus && (
            <div className="pb-3 md:pb-5 border-b border-[#ece7df]">
              <div className="flex items-center justify-center gap-3 md:gap-4">
                <div className="flex h-14 w-14 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-full bg-[#fff6e6] border border-[#ead8bd] text-[#4d2718] shadow-sm">
                  <span className="text-lg md:text-2xl font-bold tracking-tight">{highlight.value}</span>
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm md:text-lg font-semibold text-[#2f2f2f]">{highlight.label}</p>
                </div>
              </div>
            </div>
          )}
          {stats.map((stat, index) => (
            <button
              key={stat.label}
              type="button"
              onClick={stat.onClick}
              disabled={!stat.onClick}
              className={`w-full text-center ${index < stats.length - 1 ? 'pb-3 md:pb-5 border-b border-[#ece7df]' : ''} ${
                stat.onClick ? 'transition-colors hover:text-[#7a5035] cursor-pointer' : 'cursor-default'
              }`}
            >
              <p className="text-2xl md:text-4xl font-bold tracking-tight text-[#2f2f2f]">{stat.value}</p>
              <p className="mt-1 text-xs md:text-base text-[#555555] font-medium leading-snug">{stat.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvitePage() {
  const location = useLocation();
  const [guests, setGuests] = useState<any[]>([]);
  const { settings } = useSettings();
  const [editingMessage, setEditingMessage] = useState<{ guestId: string; type: 'invite' | 'reminder' | 'thanks' } | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [editingContactName, setEditingContactName] = useState('');
  const [editingContactPhone, setEditingContactPhone] = useState('');
  const [inviteMsgs, setInviteMsgs] = useState<Record<string, string>>({});
  const [reminderMsgs, setReminderMsgs] = useState<Record<string, string>>({});
  const [thankMsgs, setThankMsgs] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [contactFilter, setContactFilter] = useState<'all' | 'ready' | 'sent' | 'pending' | 'responded'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [pendingNextGuestId, setPendingNextGuestId] = useState<string | null>(null);
  const [guidedNextGuestId, setGuidedNextGuestId] = useState<string | null>(null);
  const longPressRef = useRef<{ timeoutId: number | null; guestId: string | null; triggered: boolean }>({
    timeoutId: null,
    guestId: null,
    triggered: false
  });
  const contactCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const deferredSearch = useDeferredValue(search);
  const eventHasPassed = useMemo(() => hasEventPassed(settings.eventDate), [settings.eventDate]);
  const reminderUnlocked = useMemo(() => {
    const eventDate = parseConfiguredEventDate(settings.eventDate);
    const unlockDate = new Date(eventDate.getFullYear(), 3, 10, 0, 0, 0, 0);
    return new Date() >= unlockDate;
  }, [settings.eventDate]);
  const reminderAvailableLabel = useMemo(() => {
    const eventDate = parseConfiguredEventDate(settings.eventDate);
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(
      new Date(eventDate.getFullYear(), 3, 10, 0, 0, 0, 0)
    );
  }, [settings.eventDate]);
  const thankYouAvailableLabel = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(
      parseConfiguredEventDate(settings.eventDate)
    );
  }, [settings.eventDate]);
  const inviteReadyCount = useMemo(() => guests.filter((guest) => !guest.invited).length, [guests]);
  const inviteSentCount = useMemo(() => guests.filter((guest) => Boolean(guest.invited)).length, [guests]);
  const thankReadyCount = useMemo(
    () => guests.filter((guest) => guest.status === 'attending' && !guest.thanked).length,
    [guests]
  );
  const thankedCount = useMemo(
    () => guests.filter((guest) => guest.status === 'attending' && Boolean(guest.thanked)).length,
    [guests]
  );

  useEffect(() => {
    const q = query(collection(db, 'guests'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const guestData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setGuests(guestData);
      
      const nextInviteMsgs: Record<string, string> = {};
      const nextReminderMsgs: Record<string, string> = {};
      const nextThankMsgs: Record<string, string> = {};
      guestData.forEach(g => {
        nextInviteMsgs[g.id] = inviteMsgs[g.id] || buildInviteMessage(g.name, settings.eventDate, settings.hostName, g.id, window.location.origin);
        nextReminderMsgs[g.id] = reminderMsgs[g.id] || buildReminderMessage(g.name, settings.eventDate, settings.hostName, g.id, window.location.origin);
        nextThankMsgs[g.id] = thankMsgs[g.id] || buildThankYouMessage(g.name, settings.hostName);
      });
      setInviteMsgs(nextInviteMsgs);
      setReminderMsgs(nextReminderMsgs);
      setThankMsgs(nextThankMsgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'guests');
    });
    return unsubscribe;
  }, [inviteMsgs, reminderMsgs, settings.eventDate, settings.hostName, thankMsgs]);

  const filteredGuests = useMemo(
    () => guests.filter((guest) => {
      if (!matchesGuestSearch(guest, deferredSearch)) {
        return false;
      }
      if (contactFilter === 'pending') {
        return guest.status === 'pending' && guest.invited;
      }
      if (contactFilter === 'responded') {
        return guest.status === 'attending' || guest.status === 'declined';
      }
      if (contactFilter === 'ready') {
        return eventHasPassed
          ? guest.status === 'attending' && !guest.thanked
          : !guest.invited;
      }
      if (contactFilter === 'sent') {
        return eventHasPassed
          ? guest.status === 'attending' && Boolean(guest.thanked)
          : Boolean(guest.invited);
      }
      return true;
    }),
    [contactFilter, deferredSearch, eventHasPassed, guests]
  );
  const allFilteredContactsSelected = filteredGuests.length > 0 && filteredGuests.every((guest) => selectedContactIds.includes(guest.id));
  const selectedVisibleCount = filteredGuests.filter((guest) => selectedContactIds.includes(guest.id)).length;

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
                normalizedName: normalizeGuestName(String(row.name)),
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

  const getSendQueue = () => {
    const baseQueue = selectedContactIds.length > 0
      ? filteredGuests.filter((guest) => selectedContactIds.includes(guest.id))
      : filteredGuests;

    return baseQueue.filter((guest) => guest.phone && guest.phone.replace(/\D/g, '').length >= 10);
  };

  const queueNextContactAfterSend = (guestId: string) => {
    const queue = getSendQueue();
    const currentIndex = queue.findIndex((guest) => guest.id === guestId);
    const nextGuest = currentIndex >= 0 ? queue[currentIndex + 1] : null;
    const nextGuestId = nextGuest?.id ?? null;
    setPendingNextGuestId(nextGuestId);

    if (nextGuestId) {
      sessionStorage.setItem('nextContactGuestId', nextGuestId);
    } else {
      sessionStorage.removeItem('nextContactGuestId');
      setGuidedNextGuestId(null);
    }
  };

  const focusGuidedContact = (guestId: string) => {
    const nextCard = contactCardRefs.current[guestId];
    if (nextCard) {
      nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setGuidedNextGuestId(guestId);
      setPendingNextGuestId(null);
      sessionStorage.removeItem('nextContactGuestId');
    }
  };

  const getActiveMessageType = (guest: any): 'invite' | 'reminder' | 'thanks' | null => {
    if (eventHasPassed) {
      return guest.status === 'attending' ? 'thanks' : null;
    }

    if (reminderUnlocked && guest.status === 'pending' && guest.invited) {
      return 'reminder';
    }

    return 'invite';
  };

  const getMessageForGuest = (guest: any, type: 'invite' | 'reminder' | 'thanks') => {
    if (type === 'invite') return inviteMsgs[guest.id] || '';
    if (type === 'reminder') return reminderMsgs[guest.id] || '';
    return thankMsgs[guest.id] || '';
  };

  const sendWhatsApp = (guest: any) => {
    const activeMessageType = getActiveMessageType(guest);
    if (!activeMessageType) return;
    const msg = encodeURIComponent(getMessageForGuest(guest, activeMessageType));
    const phone = guest.phone.replace(/\D/g, '');
    queueNextContactAfterSend(guest.id);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    if (activeMessageType === 'invite') {
      try {
        updateDoc(doc(db, 'guests', guest.id), { invited: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `guests/${guest.id}`);
      }
    } else if (activeMessageType === 'reminder') {
      try {
        updateDoc(doc(db, 'guests', guest.id), { reminded: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `guests/${guest.id}`);
      }
    } else if (activeMessageType === 'thanks') {
      try {
        updateDoc(doc(db, 'guests', guest.id), { thanked: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `guests/${guest.id}`);
      }
    }
  };

  const sendSMS = (guest: any) => {
    const activeMessageType = getActiveMessageType(guest);
    if (!activeMessageType) return;
    const msg = encodeURIComponent(getMessageForGuest(guest, activeMessageType));
    const phone = guest.phone.replace(/\D/g, '');
    queueNextContactAfterSend(guest.id);
    window.open(`sms:${phone}?body=${msg}`, '_blank');
    if (activeMessageType === 'invite') {
      try {
        updateDoc(doc(db, 'guests', guest.id), { invited: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `guests/${guest.id}`);
      }
    } else if (activeMessageType === 'reminder') {
      try {
        updateDoc(doc(db, 'guests', guest.id), { reminded: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `guests/${guest.id}`);
      }
    } else if (activeMessageType === 'thanks') {
      try {
        updateDoc(doc(db, 'guests', guest.id), { thanked: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `guests/${guest.id}`);
      }
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
        normalizedName: normalizeGuestName(trimmedName),
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

  const toggleContactSelection = (guestId: string) => {
    setSelectedContactIds((current) =>
      current.includes(guestId) ? current.filter((id) => id !== guestId) : [...current, guestId]
    );
  };

  const toggleSelectAllContacts = () => {
    if (allFilteredContactsSelected) {
      const filteredIds = new Set(filteredGuests.map((guest) => guest.id));
      setSelectedContactIds((current) => current.filter((id) => !filteredIds.has(id)));
      return;
    }

    setSelectedContactIds((current) => {
      const next = new Set(current);
      filteredGuests.forEach((guest) => next.add(guest.id));
      return Array.from(next);
    });
  };

  const deleteSelectedContacts = async () => {
    if (selectedContactIds.length === 0) return;
    if (!confirm(`Delete ${selectedContactIds.length} selected contact(s)? This cannot be undone.`)) {
      return;
    }

    try {
      await Promise.all(selectedContactIds.map((guestId) => deleteDoc(doc(db, 'guests', guestId))));
      setSelectedContactIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'guests');
    }
  };

  const beginContactLongPress = (guestId: string) => {
    if (editingContactId) return;
    if (longPressRef.current.timeoutId) {
      window.clearTimeout(longPressRef.current.timeoutId);
    }

    longPressRef.current.guestId = guestId;
    longPressRef.current.triggered = false;
    longPressRef.current.timeoutId = window.setTimeout(() => {
      toggleContactSelection(guestId);
      longPressRef.current.triggered = true;
      longPressRef.current.timeoutId = null;
    }, 450);
  };

  const endContactLongPress = () => {
    if (longPressRef.current.timeoutId) {
      window.clearTimeout(longPressRef.current.timeoutId);
      longPressRef.current.timeoutId = null;
    }
  };

  const handleContactCardClick = (guest: any) => {
    if (longPressRef.current.triggered && longPressRef.current.guestId === guest.id) {
      longPressRef.current.triggered = false;
      longPressRef.current.guestId = null;
      return;
    }

    if (selectedContactIds.length > 0) {
      toggleContactSelection(guest.id);
    }
  };

  useEffect(() => {
    const handleReturnFocus = () => {
      const guestIdToFocus = pendingNextGuestId || sessionStorage.getItem('nextContactGuestId');
      if (!guestIdToFocus) return;
      focusGuidedContact(guestIdToFocus);
    };

    window.addEventListener('focus', handleReturnFocus);
    return () => window.removeEventListener('focus', handleReturnFocus);
  }, [pendingNextGuestId]);

  useEffect(() => {
    const guestIdToFocus = sessionStorage.getItem('nextContactGuestId');
    if (!guestIdToFocus) return;

    const timeoutId = window.setTimeout(() => {
      focusGuidedContact(guestIdToFocus);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [filteredGuests.length]);

  useEffect(() => {
    if (!guidedNextGuestId) return;

    const timeoutId = window.setTimeout(() => {
      setGuidedNextGuestId(null);
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [guidedNextGuestId]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const requestedFilter = searchParams.get('filter');

    if (requestedFilter === 'pending') {
      setContactFilter('pending');
      return;
    }

    if (requestedFilter === 'ready' || requestedFilter === 'sent' || requestedFilter === 'all' || requestedFilter === 'responded') {
      setContactFilter(requestedFilter);
    }
  }, [location.search]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">Contacts & Messages</h1>
          <p className="text-sm text-[#7b6858]">
            {eventHasPassed
              ? 'Thank-you messages are active now. Invite and reminder messages are shown in a muted state for reference.'
              : reminderUnlocked
                ? 'Reminder messages are active now for pending invited guests. Invite and thank-you messages are shown as reference.'
                : 'Invite messages are active now. Reminder messages unlock on April 10, and thank-you messages unlock after the event.'}
          </p>
        </div>
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

      <div>
        <div className="flex flex-wrap gap-2">
          {(
            eventHasPassed
              ? [
                  { value: 'all', label: `All Contacts (${guests.length})` },
                  { value: 'pending', label: `Pending (${guests.filter((guest) => guest.status === 'pending' && guest.invited).length})` },
                  { value: 'responded', label: `Responded (${guests.filter((guest) => guest.status === 'attending' || guest.status === 'declined').length})` },
                  { value: 'ready', label: `Thank You (${thankReadyCount})` },
                  { value: 'sent', label: `Thanked (${thankedCount})` }
                ]
              : [
                  { value: 'all', label: `All Contacts (${guests.length})` },
                  { value: 'pending', label: `Pending RSVP (${guests.filter((guest) => guest.status === 'pending' && guest.invited).length})` },
                  { value: 'responded', label: `Responded (${guests.filter((guest) => guest.status === 'attending' || guest.status === 'declined').length})` },
                  { value: 'ready', label: `Pending Invite (${inviteReadyCount})` },
                  { value: 'sent', label: `Invited (${inviteSentCount})` }
                ]
          ).map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setContactFilter(filter.value as 'all' | 'ready' | 'sent' | 'pending' | 'responded')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                contactFilter === filter.value
                  ? 'bg-[#222222] text-white'
                  : 'border border-[#e7c485]/40 bg-[#fff8ee] text-[#7a5035] hover:bg-[#f8ead0]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-3 text-sm font-medium text-[#4b2f20]">
          <button
            type="button"
            onClick={toggleSelectAllContacts}
            className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
              allFilteredContactsSelected
                ? 'border-brand bg-brand text-white'
                : 'border-[#d8c3aa] bg-white text-transparent hover:border-brand/60'
            }`}
            aria-label={allFilteredContactsSelected ? 'Deselect all contacts' : 'Select all contacts'}
          >
            <Check className="w-3 h-3" strokeWidth={3} />
          </button>
          <span>Select all</span>
        </label>
        <button
          onClick={() => void deleteSelectedContacts()}
          disabled={selectedContactIds.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f8ebe7] px-4 py-2 text-sm font-semibold text-[#9b3d2f] transition-colors hover:bg-[#f3ddd7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          <span>
            Delete {selectedContactIds.length > 0 ? (selectedVisibleCount > 0 ? selectedVisibleCount : selectedContactIds.length) : ''} selected
          </span>
        </button>
      </div>
      </div>

      {guidedNextGuestId && (
        <div className="rounded-2xl border border-[#d7ead9] bg-[#f6fbf7] px-4 py-3 text-sm text-[#2f6c44] shadow-sm">
          Next up: <span className="font-semibold">{filteredGuests.find((guest) => guest.id === guidedNextGuestId)?.name || 'Contact'}</span>
        </div>
      )}

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
          (() => {
            const canSendReminder = reminderUnlocked && !eventHasPassed && guest.status === 'pending' && guest.invited;
            const canSendThankYou = eventHasPassed && guest.status === 'attending';
            const activeMessageType = getActiveMessageType(guest);
            const showReminderMessage = guest.status === 'pending';
            const isSingleSelected = selectedContactIds.length === 1 && selectedContactIds[0] === guest.id;
            return (
          <div
            key={guest.id}
            ref={(node) => {
              contactCardRefs.current[guest.id] = node;
            }}
            className={`relative overflow-hidden rounded-[1.35rem] border p-3 md:rounded-[1.75rem] md:p-5 shadow-[0_14px_28px_rgba(64,36,22,0.08)] transition-all ${
              selectedContactIds.includes(guest.id)
                ? 'border-[#d8a033] bg-gradient-to-br from-[#fff9ef] via-[#fff2db] to-[#f7e4be] ring-2 ring-[#d8a033]/35'
                : guidedNextGuestId === guest.id
                  ? 'border-[#7db87a] bg-gradient-to-br from-white via-[#fffaf4] to-[#f5ead9] ring-2 ring-[#7db87a]/35'
                : 'border-[#eadfce] bg-gradient-to-br from-white via-[#fffaf4] to-[#f5ead9]'
            }`}
            onPointerDown={() => beginContactLongPress(guest.id)}
            onPointerUp={endContactLongPress}
            onPointerLeave={endContactLongPress}
            onPointerCancel={endContactLongPress}
          >
            <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#d8a033]/40 to-transparent md:inset-x-6" />
            <div>
              <div className="mb-2.5 flex items-start gap-2.5 md:mb-3 md:gap-3">
                <div
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm md:h-12 md:w-12 md:text-sm ${
                    selectedContactIds.includes(guest.id)
                      ? 'bg-[#d8a033] text-white'
                      : guidedNextGuestId === guest.id
                        ? 'bg-[#7db87a] text-white'
                      : 'bg-[#f0debf] text-[#6a4430]'
                  }`}
                >
                  {selectedContactIds.includes(guest.id) ? (
                    <Check className="w-5 h-5" strokeWidth={3} />
                  ) : (
                    guest.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part: string) => part[0]?.toUpperCase())
                      .join('')
                  )}
                  {guest.status === 'attending' ? (
                    <span className="absolute -right-1 -bottom-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#2f8a4b] text-white ring-2 ring-[#fffaf4] shadow-sm md:h-5 md:w-5">
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    </span>
                  ) : guest.status === 'declined' ? (
                    <span className="absolute -right-1 -bottom-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#8a3b2e] text-white ring-2 ring-[#fffaf4] shadow-sm md:h-5 md:w-5">
                      <X className="w-3 h-3" strokeWidth={2.5} />
                    </span>
                  ) : guest.invited ? (
                    <span className="absolute -right-1 -bottom-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white text-[#2f8a4b] ring-2 ring-[#fffaf4] shadow-sm md:h-5 md:w-5">
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleContactCardClick(guest)}
                  className="min-w-0 flex-1 pt-0.5 text-left"
                  aria-label={`Edit contact for ${guest.name}`}
                >
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
                    <div className="rounded-2xl px-1 py-0.5 transition-colors hover:bg-white/40">
                      <h3 className="truncate text-base font-bold leading-tight text-[#2f1b12] md:text-[1.05rem]">{guest.name}</h3>
                      {guest.phone && <p className="mt-0.5 truncate text-[11px] text-[#7b6858] md:mt-1 md:text-xs">{formatDisplayUsPhoneNumber(guest.phone)}</p>}
                    </div>
                  )}
                </button>
                {editingContactId === guest.id ? (
                <div className="flex items-center gap-1.5 shrink-0 self-start md:gap-2">
                  <button
                    onClick={() => {
                      void saveContact(guest.id);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-[#e5d8c7] text-[#7a6655] hover:text-[#3d281d] hover:bg-[#fffdf9] transition-colors shrink-0 shadow-sm md:h-10 md:w-10"
                    aria-label={`Save ${guest.name}`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingContactId(null);
                      setEditingContactName('');
                      setEditingContactPhone('');
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-[#e5d8c7] text-[#7a6655] hover:text-[#3d281d] hover:bg-[#fffdf9] transition-colors shrink-0 shadow-sm md:h-10 md:w-10"
                    aria-label="Cancel contact edit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                ) : isSingleSelected ? (
                <div className="flex items-center gap-1.5 shrink-0 self-start md:gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startEditingContact(guest);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-[#e5d8c7] text-[#7a6655] hover:text-[#3d281d] hover:bg-[#fffdf9] transition-colors shrink-0 shadow-sm md:h-10 md:w-10"
                    aria-label={`Edit ${guest.name}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (!confirm(`Delete ${guest.name}? This cannot be undone.`)) return;
                      try {
                        await deleteDoc(doc(db, 'guests', guest.id));
                        setSelectedContactIds([]);
                      } catch (error) {
                        handleFirestoreError(error, OperationType.DELETE, `guests/${guest.id}`);
                      }
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-[#ead2ca] text-[#9b3d2f] hover:text-[#7a2419] hover:bg-[#fff6f4] transition-colors shrink-0 shadow-sm md:h-10 md:w-10"
                    aria-label={`Delete ${guest.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                ) : null}
              </div>
              
              {editingMessage?.guestId === guest.id ? (
                <div className="space-y-3">
                  <div className={`rounded-2xl border p-3 ${editingMessage.type === 'invite' ? 'bg-white/90 border-[#e7d8c2]' : 'bg-white/60 border-[#efe3d3] opacity-65'}`}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3876a]">Invite Message</p>
                      {editingMessage.type === 'invite' && (
                        <button
                          onClick={() => setEditingMessage(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#e5d8c7] text-[#7a6655] hover:text-[#3d281d] hover:bg-[#fffdf9] transition-colors shadow-sm"
                          aria-label="Close message editor"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {editingMessage.type === 'invite' ? (
                      <textarea
                        value={inviteMsgs[guest.id]}
                        onChange={(e) => setInviteMsgs({ ...inviteMsgs, [guest.id]: e.target.value })}
                        className="w-full text-sm bg-white/90 border border-[#e7d8c2] p-3 rounded-2xl min-h-[120px] focus:outline-none focus:ring-2 focus:ring-brand/20"
                      />
                    ) : (
                      <p className="text-[11px] text-[#6b4b3a] line-clamp-2">
                        {getMessagePreview(inviteMsgs[guest.id] || '') || 'Invite message available'}
                      </p>
                    )}
                  </div>
                  {showReminderMessage && (
                    <div className={`rounded-2xl border p-3 ${editingMessage.type === 'reminder' ? 'bg-white/90 border-[#e7d8c2]' : 'bg-white/60 border-[#efe3d3] opacity-65'}`}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3876a]">
                          Reminder Message
                          <span className="ml-1 normal-case tracking-normal text-[#b08d6d]">(from {reminderAvailableLabel})</span>
                        </p>
                        {editingMessage.type === 'reminder' && (
                          <button
                            onClick={() => setEditingMessage(null)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#e5d8c7] text-[#7a6655] hover:text-[#3d281d] hover:bg-[#fffdf9] transition-colors shadow-sm"
                            aria-label="Close message editor"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {editingMessage.type === 'reminder' ? (
                        <textarea
                          value={reminderMsgs[guest.id]}
                          onChange={(e) => setReminderMsgs({ ...reminderMsgs, [guest.id]: e.target.value })}
                          className="w-full text-sm bg-white/90 border border-[#e7d8c2] p-3 rounded-2xl min-h-[120px] focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      ) : (
                        <p className="text-[11px] text-[#6b4b3a] line-clamp-2">
                          {getMessagePreview(reminderMsgs[guest.id] || '') || 'Reminder message available'}
                        </p>
                      )}
                    </div>
                  )}
                  <div className={`rounded-2xl border p-3 ${editingMessage.type === 'thanks' ? 'bg-white/90 border-[#e7d8c2]' : 'bg-white/60 border-[#efe3d3] opacity-65'}`}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3876a]">
                        Thank You Message
                        <span className="ml-1 normal-case tracking-normal text-[#b08d6d]">(after {thankYouAvailableLabel})</span>
                      </p>
                      {editingMessage.type === 'thanks' && (
                        <button
                          onClick={() => setEditingMessage(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#e5d8c7] text-[#7a6655] hover:text-[#3d281d] hover:bg-[#fffdf9] transition-colors shadow-sm"
                          aria-label="Close message editor"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {editingMessage.type === 'thanks' ? (
                      <textarea
                        value={thankMsgs[guest.id]}
                        onChange={(e) => setThankMsgs({ ...thankMsgs, [guest.id]: e.target.value })}
                        className="w-full text-sm bg-white/90 border border-[#e7d8c2] p-3 rounded-2xl min-h-[120px] focus:outline-none focus:ring-2 focus:ring-brand/20"
                      />
                    ) : (
                      <p className="text-[11px] text-[#6b4b3a] line-clamp-2">
                        {getMessagePreview(thankMsgs[guest.id] || '') || 'Thank-you message available'}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 space-y-1.5 md:mt-3 md:space-y-2">
                  <div className="flex items-stretch gap-1.5 md:gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeMessageType === 'invite') {
                          setEditingMessage({ guestId: guest.id, type: 'invite' });
                        }
                      }}
                      className={`min-w-0 flex-1 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                        activeMessageType === 'invite'
                          ? 'border-[#7db87a] bg-white/75 shadow-[0_0_0_1px_rgba(47,138,75,0.08)] hover:bg-white/90 hover:text-[#3d281d]'
                          : 'border-[#efe3d3] bg-white/55 text-[#9b8a78] opacity-60 cursor-not-allowed'
                      }`}
                      disabled={activeMessageType !== 'invite'}
                      aria-label={`Edit invite message for ${guest.name}`}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3876a]">Invite Message</p>
                        {activeMessageType === 'invite' && (
                          <p className="mt-0.5 text-[11px] text-[#6b4b3a] line-clamp-1">
                            {getMessagePreview(inviteMsgs[guest.id] || '') || 'Invite message available'}
                          </p>
                        )}
                      </div>
                    </button>
                    {activeMessageType === 'invite' && (
                      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                        <button 
                          onClick={() => sendWhatsApp(guest)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-[#d7ead9] hover:bg-[#f6fbf7] transition-colors shadow-sm md:h-10 md:w-10"
                          aria-label={`Send invite message via WhatsApp to ${guest.name}`}
                        >
                          <img src="/whatsapp-logo.svg" alt="" className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => sendSMS(guest)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-[#e5d8c7] hover:bg-[#f7f7f7] transition-colors shadow-sm md:h-10 md:w-10"
                          aria-label={`Send invite message via Google Messages to ${guest.name}`}
                        >
                          <img src="/google-messages-logo.svg" alt="" className="w-5 h-5 rounded-full" />
                        </button>
                      </div>
                    )}
                  </div>

                  {showReminderMessage && (
                    <div className="flex items-stretch gap-1.5 md:gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (canSendReminder) {
                            setEditingMessage({ guestId: guest.id, type: 'reminder' });
                          }
                        }}
                        disabled={!canSendReminder}
                        className={`min-w-0 flex-1 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                          canSendReminder
                            ? 'border-[#7db87a] bg-white/75 shadow-[0_0_0_1px_rgba(47,138,75,0.08)] hover:bg-white/90 hover:text-[#3d281d]'
                            : 'border-[#efe3d3] bg-white/55 text-[#9b8a78] opacity-60 cursor-not-allowed'
                        }`}
                        aria-label={`Edit reminder message for ${guest.name}`}
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3876a]">
                            Reminder Message
                            <span className="ml-1 normal-case tracking-normal text-[#b08d6d]">(from {reminderAvailableLabel})</span>
                          </p>
                          {canSendReminder && (
                            <p className="mt-0.5 text-[11px] text-[#6b4b3a] line-clamp-1">
                              {getMessagePreview(reminderMsgs[guest.id] || '') || 'Reminder message available'}
                            </p>
                          )}
                        </div>
                      </button>
                      {canSendReminder && (
                        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                          <button 
                            onClick={() => sendWhatsApp(guest)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-[#d7ead9] hover:bg-[#f6fbf7] transition-colors shadow-sm md:h-10 md:w-10"
                            aria-label={`Send reminder message via WhatsApp to ${guest.name}`}
                          >
                            <img src="/whatsapp-logo.svg" alt="" className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => sendSMS(guest)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-[#e5d8c7] hover:bg-[#f7f7f7] transition-colors shadow-sm md:h-10 md:w-10"
                            aria-label={`Send reminder message via Google Messages to ${guest.name}`}
                          >
                            <img src="/google-messages-logo.svg" alt="" className="w-5 h-5 rounded-full" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-stretch gap-1.5 md:gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (canSendThankYou) {
                          setEditingMessage({ guestId: guest.id, type: 'thanks' });
                        }
                      }}
                      disabled={!canSendThankYou}
                      className={`min-w-0 flex-1 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                        canSendThankYou
                          ? 'border-[#7db87a] bg-white/75 shadow-[0_0_0_1px_rgba(47,138,75,0.08)] hover:bg-white/90 hover:text-[#3d281d]'
                          : 'border-[#efe3d3] bg-white/55 text-[#9b8a78] opacity-60 cursor-not-allowed'
                      }`}
                      aria-label={`Edit thank you message for ${guest.name}`}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a3876a]">
                          Thank You Message
                          <span className="ml-1 normal-case tracking-normal text-[#b08d6d]">(after {thankYouAvailableLabel})</span>
                        </p>
                        {canSendThankYou && (
                          <p className="mt-0.5 text-[11px] text-[#6b4b3a] line-clamp-1">
                            {getMessagePreview(thankMsgs[guest.id] || '') || 'Thank-you message available'}
                          </p>
                        )}
                      </div>
                    </button>
                    {canSendThankYou && (
                      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                        <button 
                          onClick={() => sendWhatsApp(guest)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-[#d7ead9] hover:bg-[#f6fbf7] transition-colors shadow-sm md:h-10 md:w-10"
                          aria-label={`Send thank you message via WhatsApp to ${guest.name}`}
                        >
                          <img src="/whatsapp-logo.svg" alt="" className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => sendSMS(guest)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 border border-[#e5d8c7] hover:bg-[#f7f7f7] transition-colors shadow-sm md:h-10 md:w-10"
                          aria-label={`Send thank you message via Google Messages to ${guest.name}`}
                        >
                          <img src="/google-messages-logo.svg" alt="" className="w-5 h-5 rounded-full" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
            );
          })()
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
