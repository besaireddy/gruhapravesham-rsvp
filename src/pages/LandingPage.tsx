import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Calendar, Clock, Phone, User, Users, MessageSquare, Plus, Minus, Check, LogIn } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { collection, addDoc, serverTimestamp, getDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatCalendarDate, formatDateForGoogleCalendar, parseConfiguredEventDate } from '../lib/eventUtils';
import { findDuplicateGuestByName, formatDisplayUsPhoneNumber, normalizeGuestName, validateRsvpSubmission } from '../lib/guestUtils';

const DEFAULT_COVER_PHOTO_URL = '/housewarming-cover.jpg';
const LEGACY_COVER_PHOTO_URL = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=1920';
const DRIVE_COVER_PHOTO_URL = 'https://drive.google.com/uc?export=view&id=1pUZXNu9T9ZtFgEEO0rqK3MxfodW_Cvce';

export default function LandingPage() {
  const { settings, loading } = useSettings();
  const [searchParams] = useSearchParams();
  const guestId = searchParams.get('guestId');
  const [activeGuestId, setActiveGuestId] = useState<string | null>(guestId);

  const [rsvpStatus, setRsvpStatus] = useState<'attending' | 'declined'>('attending');
  const [name, setName] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [guestRecordFound, setGuestRecordFound] = useState(!guestId);
  const [hasExistingRsvp, setHasExistingRsvp] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  const eventStart = useMemo(() => parseConfiguredEventDate(settings.eventDate, 2026), [settings.eventDate]);
  const eventEnd = useMemo(() => new Date(eventStart.getTime() + 8 * 60 * 60 * 1000), [eventStart]);
  const addToCalendarUrl = useMemo(
    () => `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(settings.heroSubtitle || settings.heroTitle)}&dates=${formatDateForGoogleCalendar(eventStart)}/${formatDateForGoogleCalendar(eventEnd)}&details=${encodeURIComponent(settings.welcomeMessage)}&location=${encodeURIComponent(settings.address)}`,
    [eventEnd, eventStart, settings.address, settings.heroSubtitle, settings.heroTitle, settings.welcomeMessage]
  );
  const directionsUrl = useMemo(() => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`, [settings.address]);
  const formattedPhone = useMemo(() => formatDisplayUsPhoneNumber(settings.hostPhone), [settings.hostPhone]);
  const coverPhotoUrl = useMemo(() => {
    const configuredUrl = settings.coverPhotoUrl?.trim();
    if (!configuredUrl || configuredUrl === LEGACY_COVER_PHOTO_URL || configuredUrl === DRIVE_COVER_PHOTO_URL) {
      return DEFAULT_COVER_PHOTO_URL;
    }
    return configuredUrl;
  }, [settings.coverPhotoUrl]);

  useEffect(() => {
    if (guestId) {
      let cancelled = false;
      const fetchGuest = async () => {
        try {
          const guestDoc = await getDoc(doc(db, 'guests', guestId));
          if (cancelled) return;

          if (guestDoc.exists()) {
            const guestData = guestDoc.data();
            setGuestRecordFound(true);
            setName(guestData.name || '');
            if (guestData.status && guestData.status !== 'pending') {
              setRsvpStatus(guestData.status === 'declined' ? 'declined' : 'attending');
              setAdults(Math.max(guestData.adults ?? 1, 1));
              setChildren(Math.max(guestData.children ?? 0, 0));
              setMessage(guestData.message || '');
              setHasExistingRsvp(true);
              setIsSubmitted(true);
            }
          } else {
            setGuestRecordFound(false);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `guests/${guestId}`);
          if (!cancelled) {
            setGuestRecordFound(false);
            setSubmissionError('We couldn’t load this RSVP link right now. Please try again in a moment.');
          }
        }
      };
      fetchGuest();
      return () => {
        cancelled = true;
      };
    }
  }, [guestId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#5b3624] text-[#f8ead0]">Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError('');
    const validationError = validateRsvpSubmission({
      name,
      status: rsvpStatus,
      adults,
      children,
      isInvalidInviteLink: Boolean(guestId && !guestRecordFound)
    });

    if (validationError) {
      setSubmissionError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!activeGuestId) {
        const guestSnapshot = await getDocs(collection(db, 'guests'));
        const duplicateGuest = findDuplicateGuestByName(
          guestSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() })),
          name
        );

        if (duplicateGuest) {
          setSubmissionError(
            duplicateGuest.status && duplicateGuest.status !== 'pending'
              ? 'An RSVP already exists for this name. Please use your original invite link to edit it or contact the host.'
              : 'This guest already exists in the invitation list. Please use the invite link shared by the host.'
          );
          setIsSubmitting(false);
          return;
        }
      }

      const rsvpPayload = {
        name: name.trim(),
        normalizedName: normalizeGuestName(name),
        status: rsvpStatus,
        adults: rsvpStatus === 'declined' ? 0 : adults,
        children: rsvpStatus === 'declined' ? 0 : children,
        message,
        lastUpdated: serverTimestamp()
      };

      if (activeGuestId) {
        await updateDoc(doc(db, 'guests', activeGuestId), rsvpPayload);
      } else {
        const docRef = await addDoc(collection(db, 'guests'), {
          ...rsvpPayload,
          invited: false
        });
        setActiveGuestId(docRef.id);
        window.history.replaceState({}, '', `${window.location.pathname}?guestId=${docRef.id}#rsvp`);
      }
      setHasExistingRsvp(true);
      setIsSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, activeGuestId ? OperationType.UPDATE : OperationType.CREATE, activeGuestId ? `guests/${activeGuestId}` : 'guests');
      setSubmissionError('We couldn’t save your RSVP just now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ceremony-shell min-h-screen text-[#2f1b12] font-sans pb-12 overflow-hidden">
      <div className="garland" />
      <div className="lamp lamp-left" />
      <div className="lamp lamp-right" />
      <div className="hanger hanger-left" />
      <div className="hanger hanger-right" />
      <div className="rangoli top-[10rem] left-4 md:left-10" />
      <div className="rangoli top-[30rem] right-4 md:right-12" />
      <div className="rangoli bottom-[28rem] left-4 md:left-12" />
      <div className="rangoli bottom-[8rem] right-6 md:right-14" />

      <div className="relative z-10">
        <section id="welcome" className="relative">
          <div className="h-[40vh] md:h-[60vh] relative overflow-hidden">
            <img
              src={coverPhotoUrl}
              alt="Housewarming"
              className="w-full h-full object-cover object-[55%_center] scale-[1.02]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#5b3624] via-[#5b3624]/30 to-black/25" />
          </div>

          <div className="max-w-4xl mx-auto px-6 -mt-12 md:-mt-24 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="apple-card ceremony-panel p-6 md:p-12 backdrop-blur-xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-brand to-transparent opacity-80" />
              <div className="absolute inset-x-8 top-5 h-px bg-gradient-to-r from-transparent via-[#7e4b22]/30 to-transparent" />

              <h1 className="text-4xl md:text-7xl font-semibold tracking-tight mb-2 text-[#4d2718] font-serif">
                {settings.heroTitle}
              </h1>
              <p className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-brand mb-6">
                {settings.heroSubtitle}
              </p>
              <p className="text-xl md:text-3xl text-[#6a4430] font-medium leading-relaxed max-w-2xl mx-auto italic font-serif">
                {settings.welcomeMessage}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-bold uppercase tracking-widest text-brand">
                <span className="flex items-center gap-2">
                  <span className="w-8 h-px bg-brand/30" />
                  {settings.hostName}
                  <span className="w-8 h-px bg-brand/30" />
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="event" className="mt-4 md:mt-5">
          <div className="max-w-4xl mx-auto px-6 pt-3 md:pt-4 pb-6 md:pb-8 space-y-6 md:space-y-8">
          <div id="location">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-[2rem] bg-[#fffaf2]/95 shadow-[0_18px_45px_rgba(101,64,35,0.18)] border border-[#e9d6b7] overflow-hidden"
            >
              <div className="border-b border-[#efe2cf] px-6 py-6 md:px-8">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#3b2418] font-serif">
                  Event Details
                </h2>
              </div>

              <div className="px-6 py-6 md:px-8">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fbf1df] text-brand">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a27b57]">When</p>
                    <p className="text-xl md:text-2xl font-semibold text-[#3b2418]">{formatCalendarDate(eventStart)}</p>
                    <div className="mt-5 space-y-0 -ml-2">
                      {settings.schedule.map((item, index) => (
                        <div key={index} className="relative flex gap-4 pb-5 last:pb-0">
                          <div className="relative flex w-16 shrink-0 justify-center">
                            {index !== settings.schedule.length - 1 && (
                              <div className="absolute top-4 bottom-[-1.25rem] w-px bg-gradient-to-b from-[#e7c485] via-[#d7b07a] to-transparent" />
                            )}
                            <span className="relative z-10 mt-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#d1a35d] bg-[#fff6e6] shadow-[0_0_0_4px_rgba(255,248,238,0.95)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#b98328]" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 px-1 py-1">
                            <div className="text-sm md:text-[15px] text-[#4b2f20] leading-tight">
                              {item.time.toLowerCase().includes('onwards') ? (
                                <>
                                  <p>{item.time.replace(/\s*onwards/i, '').trim()}</p>
                                  <p className="mt-1 text-[15px] md:text-base text-[#6f513d] leading-snug">
                                    onwards {item.event}
                                  </p>
                                </>
                              ) : (
                                <p>{item.time}</p>
                              )}
                            </div>
                            {!item.time.toLowerCase().includes('onwards') && (
                              <p className="mt-1 text-[15px] md:text-base text-[#6f513d] leading-snug">{item.event}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <a
                      href={addToCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center rounded-xl bg-[#f5ead9] px-4 py-2.5 text-sm font-semibold text-[#4b2f20] hover:bg-[#eddcc0] transition-colors"
                    >
                      Add to Calendar
                    </a>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#efe2cf] px-6 py-6 md:px-8">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fbf1df] text-brand">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a27b57]">Where</p>
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xl font-semibold leading-snug text-[#3b2418] hover:text-brand transition-colors"
                    >
                      {settings.address}
                    </a>
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center rounded-xl bg-[#f5ead9] px-4 py-2.5 text-sm font-semibold text-[#4b2f20] hover:bg-[#eddcc0] transition-colors"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#efe2cf] px-6 py-6 md:px-8">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fbf1df] text-brand">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a27b57]">Dress Code</p>
                    <p className="text-xl font-semibold leading-snug text-[#3b2418]">{settings.dressCode}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#efe2cf] px-6 py-6 md:px-8">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fbf1df] text-brand">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a27b57]">Hosts</p>
                    <p className="text-xl font-semibold text-[#3b2418]">{settings.hostName}</p>
                    <p className="mt-3 text-[15px] md:text-base text-[#6f513d]">{formattedPhone}</p>
                    <a
                      href={`tel:${settings.hostPhone}`}
                      className="mt-4 inline-flex items-center rounded-xl bg-[#5b3624] px-4 py-2.5 text-sm font-semibold text-[#fff8ee] hover:bg-[#4b2f20] transition-colors"
                    >
                      Call Host
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div id="rsvp" className="pb-2">
            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 md:py-20 ceremony-panel rounded-[2rem] px-6 md:px-8"
              >
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Check className="w-12 h-12" />
                </div>
                <h2 className="text-4xl font-semibold mb-4 tracking-tight font-serif text-[#4d2718]">Thank You!</h2>
                <p className="text-[#6b4b3a] text-xl">Your RSVP has been received. We can&apos;t wait to see you!</p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="mt-10 px-8 py-3 bg-[#5b3624] text-[#f8ead0] font-bold rounded-xl hover:bg-[#4d2718] transition-all"
                >
                  Edit RSVP
                </button>
              </motion.div>
            ) : (
              <div className="w-full ceremony-panel rounded-[2rem] p-6 md:p-8">
                <div className="text-center mb-10">
                  <h2 className="text-4xl md:text-5xl font-semibold mb-3 tracking-tight font-serif text-[#4d2718]">RSVP</h2>
                  <p className="text-lg md:text-xl text-[#6b4b3a]">A quick response helps us plan your welcome.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {submissionError && (
                    <div className="rounded-2xl border border-[#f2c8c2] bg-[#fff5f3] px-4 py-3 text-sm font-medium text-[#8a3b2e]">
                      {submissionError}
                    </div>
                  )}
                  <div className="rounded-[1.5rem] bg-[#fff8ee]/85 border border-[#e7c485]/30 p-5 md:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5ead9] text-[#5b3624] font-bold">1</div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a27b57]">Your Details</p>
                        <p className="text-lg font-semibold text-[#4d2718]">Tell us who is replying</p>
                      </div>
                    </div>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b6244]" />
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        readOnly={Boolean(guestId && guestRecordFound)}
                        className={`w-full rounded-2xl pl-12 pr-4 py-4 border border-[#e7c485]/30 transition-all ${guestId && guestRecordFound ? 'bg-[#f7efe1] text-[#6b4b3a] cursor-not-allowed' : 'bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand'}`}
                        placeholder="Enter your full name"
                      />
                    </div>
                    {guestId && guestRecordFound && (
                      <p className="mt-3 text-sm text-[#8b6244]">This invite link is tied to your household, so the name is locked to prevent duplicate RSVPs.</p>
                    )}
                    {guestId && !guestRecordFound && (
                      <p className="mt-3 text-sm text-red-600">This invite link could not be matched to a guest record. Please contact the host for a fresh RSVP link.</p>
                    )}
                  </div>

                  <div className="rounded-[1.5rem] bg-[#fff8ee]/85 border border-[#e7c485]/30 p-5 md:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5ead9] text-[#5b3624] font-bold">2</div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a27b57]">Attendance</p>
                        <p className="text-lg font-semibold text-[#4d2718]">Choose the option that fits best</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { value: 'attending', title: 'Joyfully attending', subtitle: 'Count me in' },
                        { value: 'declined', title: 'Unable to attend', subtitle: 'Sending wishes' }
                      ].map((status) => (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => setRsvpStatus(status.value as 'attending' | 'declined')}
                          className={`rounded-2xl border p-4 text-left transition-all ${
                            rsvpStatus === status.value
                              ? 'bg-[#5b3624] text-[#fff8ee] border-[#5b3624] shadow-[0_12px_24px_rgba(91,54,36,0.18)]'
                              : 'bg-white text-[#6b4b3a] border-[#e7c485]/30 hover:border-[#5b3624] hover:bg-[#fffaf2]'
                          }`}
                        >
                          <p className={`font-semibold ${rsvpStatus === status.value ? 'text-[#fff8ee]' : 'text-[#4d2718]'}`}>{status.title}</p>
                          <p className={`text-sm mt-1 ${rsvpStatus === status.value ? 'text-[#f1dfc8]' : 'text-[#8b6244]'}`}>{status.subtitle}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {rsvpStatus !== 'declined' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-[1.5rem] bg-[#fff8ee]/85 border border-[#e7c485]/30 p-5 md:p-6 space-y-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5ead9] text-[#5b3624] font-bold">3</div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a27b57]">Guest Count</p>
                              <p className="text-lg font-semibold text-[#4d2718]">How many should we expect?</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="rounded-2xl bg-white border border-[#e7c485]/30 p-5">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-[#4d2718]">Adults</p>
                                  <p className="text-sm text-[#8b6244]">Ages 12+</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setAdults(Math.max(1, adults - 1))}
                                    className="w-10 h-10 rounded-full bg-[#f5ead9] border border-[#e7c485]/40 flex items-center justify-center hover:bg-[#eedabd]"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="min-w-8 text-center text-2xl font-semibold text-[#4d2718]">{adults}</span>
                                  <button
                                    type="button"
                                    onClick={() => setAdults(adults + 1)}
                                    className="w-10 h-10 rounded-full bg-[#5b3624] text-[#fff8ee] border border-[#5b3624] flex items-center justify-center hover:bg-[#4b2f20]"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl bg-white border border-[#e7c485]/30 p-5">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-[#4d2718]">Children</p>
                                  <p className="text-sm text-[#8b6244]">Under 12</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setChildren(Math.max(0, children - 1))}
                                    className="w-10 h-10 rounded-full bg-[#f5ead9] border border-[#e7c485]/40 flex items-center justify-center hover:bg-[#eedabd]"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="min-w-8 text-center text-2xl font-semibold text-[#4d2718]">{children}</span>
                                  <button
                                    type="button"
                                    onClick={() => setChildren(children + 1)}
                                    className="w-10 h-10 rounded-full bg-[#5b3624] text-[#fff8ee] border border-[#5b3624] flex items-center justify-center hover:bg-[#4b2f20]"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="rounded-[1.5rem] bg-[#fff8ee]/85 border border-[#e7c485]/30 p-5 md:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5ead9] text-[#5b3624] font-bold">
                        {rsvpStatus !== 'declined' ? '4' : '3'}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a27b57]">Message</p>
                        <p className="text-lg font-semibold text-[#4d2718]">
                          {rsvpStatus === 'declined' ? 'Send your blessings' : 'Any special note for the hosts?'}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-[#8b6244]" />
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full bg-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-brand/20 border border-[#e7c485]/30 focus:border-brand transition-all min-h-[120px]"
                        placeholder={rsvpStatus === 'declined' ? 'Share your wishes...' : 'Arrival updates or a sweet message'}
                      />
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#4d2c1c] text-[#fff8ee] px-5 py-5 md:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-[0_16px_32px_rgba(64,36,22,0.2)]">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-[#e8c98f] font-semibold">Final Step</p>
                      <p className="text-lg font-semibold">Submit your RSVP when everything looks right.</p>
                    </div>
                    <button
                      disabled={isSubmitting || !name}
                      type="submit"
                      className="apple-button bg-[#f0c15d] text-[#4b2f20] min-w-[180px] hover:bg-[#e7b347] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : hasExistingRsvp ? 'Update RSVP' : 'Confirm RSVP'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
          </div>
        </section>

        <footer className="mt-6 md:mt-8 py-8 border-t border-[#e7c485]/20 text-center">
          <div className="max-w-4xl mx-auto px-6 mb-6">
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <a href="#event" className="flex items-center gap-2 rounded-full bg-[#fff8ee]/90 px-4 py-2.5 text-sm font-semibold text-[#5b3624] border border-[#e7c485]/40 hover:bg-[#f5ead9] transition-colors">
                <Clock className="w-4 h-4" />
                <span>Event</span>
              </a>
              <a href="#location" className="flex items-center gap-2 rounded-full bg-[#fff8ee]/90 px-4 py-2.5 text-sm font-semibold text-[#5b3624] border border-[#e7c485]/40 hover:bg-[#f5ead9] transition-colors">
                <MapPin className="w-4 h-4" />
                <span>Location</span>
              </a>
              <Link to="/login" className="flex items-center gap-2 rounded-full bg-[#fff8ee]/90 px-4 py-2.5 text-sm font-semibold text-[#5b3624] border border-[#e7c485]/40 hover:bg-[#f5ead9] transition-colors">
                <LogIn className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            </div>
          </div>
          <p className="text-[#6b4b3a] text-sm font-medium">© 2026 {settings.hostName}</p>
        </footer>
      </div>
      <a
        href="#rsvp"
        className="fixed right-5 bottom-5 z-50 flex items-center gap-2 rounded-full bg-[#5b3624] px-5 py-3 text-sm font-semibold text-[#fff8ee] shadow-[0_14px_30px_rgba(50,26,16,0.28)] hover:bg-[#4b2f20] transition-colors safe-area-bottom"
      >
        <Check className="w-4 h-4" />
        <span>RSVP</span>
      </a>
    </div>
  );
}
