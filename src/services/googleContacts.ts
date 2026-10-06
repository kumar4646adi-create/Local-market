import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { Store } from '../types';

export const CONTACTS_SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/directory.readonly',
  'https://www.googleapis.com/auth/user.addresses.read',
  'https://www.googleapis.com/auth/user.birthday.read',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/user.gender.read',
  'https://www.googleapis.com/auth/user.organization.read',
  'https://www.googleapis.com/auth/user.phonenumbers.read',
];

export interface GoogleContactPerson {
  resourceName: string;
  etag?: string;
  name: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  organization?: string;
  jobTitle?: string;
  address?: string;
  isMerchant?: boolean;
}

// In-memory token cache (never stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initializes Google Contacts Auth listener
 */
export const initContactsAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Signs in with Google requesting Google Contacts / People API scopes
 */
export const signInWithGoogleContacts = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    CONTACTS_SCOPES.forEach((scope) => provider.addScope(scope));

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Contacts access token');
    }

    cachedAccessToken = credential.accessToken;
    console.log('[GoogleContacts] Access token obtained successfully');
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('[GoogleContacts] Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getContactsAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const signOutContacts = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Fetches connections from Google People API
 */
export async function fetchGoogleContacts(): Promise<GoogleContactPerson[]> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Not authenticated with Google Contacts. Please sign in.');
  }

  const endpoint =
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,organizations,addresses&pageSize=100&sortOrder=FIRST_NAME_ASCENDING';

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error('[GoogleContacts] Fetch connections failed:', res.status, errorBody);
    throw new Error(`Google People API error (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  const connections = data.connections || [];

  return connections.map((c: any) => {
    const nameObj = c.names?.[0];
    const emailObj = c.emailAddresses?.[0];
    const phoneObj = c.phoneNumbers?.[0];
    const photoObj = c.photos?.[0];
    const orgObj = c.organizations?.[0];
    const addrObj = c.addresses?.[0];

    return {
      resourceName: c.resourceName,
      etag: c.etag,
      name: nameObj?.displayName || 'Unnamed Contact',
      givenName: nameObj?.givenName,
      familyName: nameObj?.familyName,
      email: emailObj?.value || '',
      phone: phoneObj?.value || '',
      photoUrl: photoObj?.url || '',
      organization: orgObj?.name || '',
      jobTitle: orgObj?.title || '',
      address: addrObj?.formattedValue || '',
      isMerchant: orgObj?.name?.toLowerCase().includes('localmarket') || false,
    };
  });
}

/**
 * Creates a new contact in Google Contacts
 */
export async function createGoogleContact(contactData: {
  givenName: string;
  familyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  organization?: string;
}): Promise<GoogleContactPerson> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Not authenticated with Google Contacts.');
  }

  const body: any = {
    names: [
      {
        givenName: contactData.givenName,
        familyName: contactData.familyName || '',
      },
    ],
  };

  if (contactData.phone) {
    body.phoneNumbers = [{ value: contactData.phone, type: 'work' }];
  }
  if (contactData.email) {
    body.emailAddresses = [{ value: contactData.email, type: 'work' }];
  }
  if (contactData.address) {
    body.addresses = [{ formattedValue: contactData.address, type: 'work' }];
  }
  if (contactData.organization) {
    body.organizations = [{ name: contactData.organization, title: 'LocalMarket Partner' }];
  }

  const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create Google Contact: ${errorText}`);
  }

  const created = await res.json();
  return {
    resourceName: created.resourceName,
    etag: created.etag,
    name: created.names?.[0]?.displayName || contactData.givenName,
    phone: contactData.phone,
    email: contactData.email,
    address: contactData.address,
    organization: contactData.organization,
  };
}

/**
 * Saves a verified LocalMarket merchant directly to user's Google Contacts
 */
export async function saveMerchantToGoogleContacts(store: Store): Promise<GoogleContactPerson> {
  return createGoogleContact({
    givenName: store.name,
    familyName: '(LocalMarket Ghumarwin)',
    phone: store.phone,
    address: `${store.address}, ${store.area}, Ghumarwin, Bilaspur, HP`,
    organization: `LocalMarket - ${store.category}`,
  });
}

/**
 * Deletes a contact from Google Contacts (Requires user confirmation)
 */
export async function deleteGoogleContact(resourceName: string): Promise<void> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Not authenticated with Google Contacts.');
  }

  const res = await fetch(`https://people.googleapis.com/v1/${resourceName}:deleteContact`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete Google Contact: ${errorText}`);
  }
}
