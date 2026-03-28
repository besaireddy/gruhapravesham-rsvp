import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, CheckCircle2, XCircle, HelpCircle, LogOut, Download, Mail, MessageSquare, Utensils, Send, Loader2, ChevronRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRSVPs } from '../services/firebaseService';
import { GuestRSVP } from '../types';
import { DEFAULT_EVENT } from '../constants';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'attending' | 'maybe' | 'declined'>('all');
  const [guests, setGuests] = useState<GuestRSVP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRSVPs = async () => {
      try {
        const data = await getRSVPs();
        setGuests(data);
      } catch (error) {
        console.error('Failed to fetch RSVPs:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRSVPs();
  }, []);

  const filteredGuests = guests.filter(g => {
    const matchesTab = activeTab === 'all' || g.status === activeTab;
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         g.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const stats = {
    total: guests.length,
    attending: guests.filter(g => g.status === 'attending').reduce((acc, g) => acc + g.guestsCount, 0),
    maybe: guests.filter(g => g.status === 'maybe').length,
    declined: guests.filter(g => g.status === 'declined').length,
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: DEFAULT_EVENT.title,
        text: `You're invited to our housewarming!`,
        url: window.location.origin
      });
    } else {
      navigator.clipboard.writeText(window.location.origin);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-[#222222] pb-20">
      <div className="max-w-6xl mx-auto px-6 pt-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Guest List</h1>
            <p className="text-[#717171] font-medium">Manage RSVPs for {DEFAULT_EVENT.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleShare}
              className="apple-button bg-white border border-[#DDDDDD] text-[#222222] hover:bg-[#F7F7F7] flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Share Invite
            </button>
            <button 
              onClick={() => navigate('/')}
              className="apple-button bg-[#222222] text-white hover:bg-black flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total RSVPs', value: stats.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Total Guests', value: stats.attending, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
            { label: 'Maybe', value: stats.maybe, icon: HelpCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
            { label: 'Declined', value: stats.declined, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="apple-card p-6"
            >
              <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}>
                <stat.icon className={`${stat.color} w-6 h-6`} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#717171] mb-1">{stat.label}</p>
              <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-6 mb-10">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171]" />
            <input 
              type="text"
              placeholder="Search guests by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#DDDDDD] rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>
          <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-[#DDDDDD] overflow-x-auto no-scrollbar">
            {['all', 'attending', 'maybe', 'declined'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? "bg-[#222222] text-white shadow-sm" 
                    : "text-[#717171] hover:bg-surface"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Guest List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-[#717171]">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand" />
            <p className="font-medium">Loading your guest list...</p>
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="apple-card py-32 text-center">
            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-[#717171] opacity-20" />
            </div>
            <h3 className="text-xl font-bold mb-2">No guests found</h3>
            <p className="text-[#717171]">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuests.map((guest, i) => (
              <motion.div 
                key={guest.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="apple-card p-8 group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-xl font-bold truncate mb-1">{guest.name}</h3>
                    <p className="text-sm text-[#717171] truncate font-medium">{guest.email}</p>
                  </div>
                  <div className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    guest.status === 'attending' ? 'bg-green-50 text-green-600' :
                    guest.status === 'maybe' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {guest.status}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between py-3 border-y border-[#F0F0F0]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                        <Users className="w-4 h-4 text-[#717171]" />
                      </div>
                      <span className="text-sm font-bold text-[#717171]">Party Size</span>
                    </div>
                    <span className="text-lg font-bold">{guest.guestsCount}</span>
                  </div>

                  {guest.dietaryRestrictions && (
                    <div className="bg-surface rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Utensils className="w-3 h-3 text-brand" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#717171]">Dietary Notes</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{guest.dietaryRestrictions}</p>
                    </div>
                  )}

                  {guest.message && (
                    <div className="bg-surface rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-3 h-3 text-brand" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#717171]">Message</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed italic">"{guest.message}"</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-[#F0F0F0] flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#717171]">RSVP Date</span>
                  <span className="text-[10px] font-bold text-[#717171]">{new Date(guest.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
