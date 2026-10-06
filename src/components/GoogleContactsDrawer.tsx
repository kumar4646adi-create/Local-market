import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithGoogleContacts,
  signOutContacts,
  fetchGoogleContacts,
  createGoogleContact,
  deleteGoogleContact,
  saveMerchantToGoogleContacts,
  GoogleContactPerson,
  getContactsAccessToken,
} from '../services/googleContacts';
import { Store } from '../types';

interface GoogleContactsDrawerProps {
  stores: Store[];
  onClose: () => void;
  onSelectContactForOrder?: (contact: GoogleContactPerson) => void;
}

export const GoogleContactsDrawer: React.FC<GoogleContactsDrawerProps> = ({
  stores,
  onClose,
  onSelectContactForOrder,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [contacts, setContacts] = useState<GoogleContactPerson[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Contact Form State
  const [showAddContactModal, setShowAddContactModal] = useState<boolean>(false);
  const [newGivenName, setNewGivenName] = useState<string>('');
  const [newFamilyName, setNewFamilyName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('Ghumarwin, Bilaspur, HP');
  const [newOrg, setNewOrg] = useState<string>('LocalMarket Ghumarwin');

  // Confirmation Modals (Mandatory Destructive / Mutating Operation Guard)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmButtonText: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    // Check if token already exists in memory
    const token = getContactsAccessToken();
    if (token) {
      setIsAuthenticated(true);
      loadContacts();
    }
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      const result = await signInWithGoogleContacts();
      if (result) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        showSuccess('Connected to Google Contacts successfully!');
        await loadContacts();
      }
    } catch (err: any) {
      console.error('Google Contacts sign-in error:', err);
      setErrorMsg(err?.message || 'Failed to authenticate with Google Contacts');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutContacts();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setContacts([]);
      showSuccess('Signed out of Google Contacts');
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  const loadContacts = async () => {
    setIsLoadingContacts(true);
    setErrorMsg(null);
    try {
      const list = await fetchGoogleContacts();
      setContacts(list);
    } catch (err: any) {
      console.error('Failed to load contacts:', err);
      setErrorMsg(err?.message || 'Failed to load Google Contacts');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // 1. Mandatory Confirmation for Saving Merchant to Google Contacts
  const promptSaveMerchant = (store: Store) => {
    setConfirmDialog({
      isOpen: true,
      title: `Save ${store.name} to Google Contacts?`,
      description: `This will create a new contact in your Google Account for ${store.name} with phone number ${store.phone} and address ${store.address}, Ghumarwin.`,
      confirmButtonText: 'Add to Contacts',
      isDestructive: false,
      onConfirm: async () => {
        try {
          const created = await saveMerchantToGoogleContacts(store);
          setContacts((prev) => [created, ...prev]);
          showSuccess(`Saved ${store.name} to your Google Contacts!`);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to save merchant contact');
        }
      },
    });
  };

  // 2. Mandatory Confirmation for Creating Custom Contact
  const promptCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGivenName.trim()) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Create New Google Contact?',
      description: `Add "${newGivenName} ${newFamilyName}" (${newPhone || 'No phone'}) to your Google Contacts account?`,
      confirmButtonText: 'Confirm & Create',
      isDestructive: false,
      onConfirm: async () => {
        try {
          const created = await createGoogleContact({
            givenName: newGivenName,
            familyName: newFamilyName,
            phone: newPhone,
            email: newEmail,
            address: newAddress,
            organization: newOrg,
          });
          setContacts((prev) => [created, ...prev]);
          setShowAddContactModal(false);
          setNewGivenName('');
          setNewFamilyName('');
          setNewPhone('');
          setNewEmail('');
          showSuccess(`Contact "${created.name}" created in Google Contacts!`);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to create contact');
        }
      },
    });
  };

  // 3. Mandatory Confirmation for Deleting Contact (Destructive Operation)
  const promptDeleteContact = (contact: GoogleContactPerson) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Contact: ${contact.name}?`,
      description: `Are you sure you want to permanently delete "${contact.name}" from your Google Contacts? This action cannot be undone.`,
      confirmButtonText: 'Delete Contact',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteGoogleContact(contact.resourceName);
          setContacts((prev) => prev.filter((c) => c.resourceName !== contact.resourceName));
          showSuccess(`Deleted "${contact.name}" from Google Contacts`);
        } catch (err: any) {
          setErrorMsg(err?.message || 'Failed to delete contact');
        }
      },
    });
  };

  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.organization?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-[#edeeef] overflow-hidden text-left">
        {/* Header */}
        <div className="bg-[#023616] p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <span className="material-symbols-outlined text-xl">contacts</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base text-white">Google Contacts</h3>
                <span className="text-[10px] bg-[#bbefc1] text-[#00210b] font-black px-1.5 py-0.2 rounded uppercase">
                  Workspace
                </span>
              </div>
              <p className="text-xs text-[#bbefc1]">
                Sync Ghumarwin merchants, customers, and pickup delegates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Notifications and Alerts */}
        {errorMsg && (
          <div className="bg-red-50 text-red-900 px-4 py-2 text-xs font-semibold flex items-center justify-between border-b border-red-200">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-700 font-bold ml-2">
              ×
            </button>
          </div>
        )}

        {successMsg && (
          <div className="bg-[#bbefc1] text-[#00210b] px-4 py-2 text-xs font-bold flex items-center justify-between border-b border-[#023616]/20">
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-[#00210b] font-bold ml-2">
              ×
            </button>
          </div>
        )}

        {/* Authentication State Card */}
        <div className="p-4 border-b border-[#edeeef] bg-[#f8f9fa] shrink-0">
          {!isAuthenticated ? (
            <div className="text-center py-2 space-y-3">
              <p className="text-xs text-[#414941] max-w-md mx-auto">
                Connect your Google Account to view your contacts, import store phone numbers, or pick family delegates for Smart Pickup in Ghumarwin with permission from your account.
              </p>

              {/* Official Google Sign-In Button Style */}
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isSigningIn ? 'Connecting to Google Contacts...' : 'Sign in with Google Contacts'}</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#023616] text-white flex items-center justify-center font-bold text-xs">
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Google User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>G</span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#191c1d] flex items-center gap-1">
                    <span>{currentUser?.displayName || 'Google Account Connected'}</span>
                    <span className="material-symbols-outlined text-xs text-[#023616]">check_circle</span>
                  </div>
                  <div className="text-[11px] text-[#717970]">{currentUser?.email}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={loadContacts}
                  disabled={isLoadingContacts}
                  className="bg-white border border-[#edeeef] hover:bg-gray-50 text-[#191c1d] text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                  title="Reload Google Contacts"
                >
                  <span className={`material-symbols-outlined text-sm ${isLoadingContacts ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Verified Ghumarwin Merchants to Google Contacts */}
        <div className="px-4 py-2.5 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] font-extrabold text-[#023616] flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-[#fd8b00]">add_call</span>
              <span>Save LocalMarket Shops to Your Contacts:</span>
            </span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto">
            {stores.slice(0, 3).map((st) => (
              <button
                key={st.id}
                onClick={() => promptSaveMerchant(st)}
                disabled={!isAuthenticated}
                className="bg-white hover:bg-emerald-50 text-[#023616] border border-[#023616]/30 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0"
              >
                <span>+ {st.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search & Actions Bar */}
        {isAuthenticated && (
          <div className="p-3 border-b border-[#edeeef] flex gap-2 shrink-0">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-2 text-sm text-[#717970]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google Contacts by name, phone, or store..."
                className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#191c1d] focus:outline-[#023616]"
              />
            </div>

            <button
              onClick={() => setShowAddContactModal(true)}
              className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              <span>New Contact</span>
            </button>
          </div>
        )}

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
          {!isAuthenticated ? (
            <div className="text-center py-12 text-[#717970] space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#c1c9be]">
                account_circle
              </span>
              <p className="font-bold text-sm text-[#191c1d]">Google Contacts Not Connected</p>
              <p className="text-xs max-w-xs mx-auto">
                Sign in above with your Google Account to manage and view contacts.
              </p>
            </div>
          ) : isLoadingContacts ? (
            <div className="text-center py-12 text-[#717970] space-y-2">
              <div className="w-7 h-7 border-2 border-[#023616] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-bold text-xs">Loading contacts from Google People API...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-10 text-[#717970] space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#c1c9be]">
                search_off
              </span>
              <p className="font-bold text-xs text-[#191c1d]">No contacts found</p>
              <p className="text-[11px]">
                {searchQuery ? 'Try a different search query.' : 'Use "New Contact" or tap a shop above to save your first contact!'}
              </p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.resourceName}
                className="bg-white rounded-2xl p-3 border border-[#edeeef] hover:border-[#023616]/40 transition-all shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#f3f4f5] text-[#023616] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                    {contact.photoUrl ? (
                      <img
                        src={contact.photoUrl}
                        alt={contact.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{contact.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-xs text-[#191c1d] truncate">
                        {contact.name}
                      </span>
                      {contact.isMerchant && (
                        <span className="bg-[#bbefc1]/50 text-[#00210b] text-[9px] font-black px-1.5 py-0.2 rounded">
                          LocalMarket Merchant
                        </span>
                      )}
                    </div>
                    {contact.phone && (
                      <div className="text-[11px] text-[#023616] font-semibold mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">call</span>
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="text-[10px] text-[#717970] truncate mt-0.2">
                        {contact.email}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onSelectContactForOrder && contact.phone && (
                    <button
                      onClick={() => onSelectContactForOrder(contact)}
                      className="bg-[#bbefc1] hover:bg-[#a5e4ad] text-[#00210b] px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                      title="Use this contact for Smart Pickup counter delegation"
                    >
                      <span className="material-symbols-outlined text-xs">person_check</span>
                      <span>Select</span>
                    </button>
                  )}

                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="w-8 h-8 rounded-lg bg-[#edeeef] hover:bg-[#e7e8e9] text-[#023616] flex items-center justify-center cursor-pointer"
                      title="Call Contact"
                    >
                      <span className="material-symbols-outlined text-sm">call</span>
                    </a>
                  )}

                  <button
                    onClick={() => promptDeleteContact(contact)}
                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center cursor-pointer"
                    title="Delete Google Contact"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal: New Contact Form */}
        {showAddContactModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-[#edeeef] p-4 text-left space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-sm text-[#191c1d] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#023616]">person_add</span>
                  <span>Create Contact in Google Contacts</span>
                </h4>
                <button
                  onClick={() => setShowAddContactModal(false)}
                  className="w-7 h-7 rounded-full bg-[#edeeef] flex items-center justify-center text-[#414941]"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <form onSubmit={promptCreateContact} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#191c1d] mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={newGivenName}
                      onChange={(e) => setNewGivenName(e.target.value)}
                      placeholder="e.g. Ramesh"
                      className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs focus:outline-[#023616]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#191c1d] mb-1">Last Name</label>
                    <input
                      type="text"
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                      placeholder="e.g. Sharma"
                      className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs focus:outline-[#023616]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#191c1d] mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+91 98160 XXXXX"
                      className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs focus:outline-[#023616]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#191c1d] mb-1">Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs focus:outline-[#023616]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#191c1d] mb-1">Address in Ghumarwin</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs focus:outline-[#023616]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#191c1d] mb-1">Organization / Store</label>
                  <input
                    type="text"
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#edeeef] rounded-xl px-3 py-2 text-xs focus:outline-[#023616]"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddContactModal(false)}
                    className="flex-1 bg-[#edeeef] hover:bg-[#e7e8e9] text-[#191c1d] font-bold py-2 rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#023616] hover:bg-[#1e4d2b] text-white font-extrabold py-2 rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    Review & Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Dialog (Mandatory User Confirmation Guard) */}
        {confirmDialog && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-[#edeeef] p-4 text-left space-y-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-2xl ${
                    confirmDialog.isDestructive ? 'text-red-600' : 'text-[#023616]'
                  }`}
                >
                  {confirmDialog.isDestructive ? 'warning' : 'help'}
                </span>
                <h4 className="font-extrabold text-sm text-[#191c1d]">
                  {confirmDialog.title}
                </h4>
              </div>

              <p className="text-xs text-[#414941] leading-relaxed">
                {confirmDialog.description}
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 bg-[#edeeef] hover:bg-[#e7e8e9] text-[#191c1d] font-bold py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    await action();
                  }}
                  className={`flex-1 font-extrabold py-2 rounded-xl text-xs cursor-pointer shadow-md text-white ${
                    confirmDialog.isDestructive
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#023616] hover:bg-[#1e4d2b]'
                  }`}
                >
                  {confirmDialog.confirmButtonText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
