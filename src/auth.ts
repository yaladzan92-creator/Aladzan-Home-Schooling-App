import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

let authInstance: ReturnType<typeof getAuth> | null = null;
let firebaseApp: ReturnType<typeof initializeApp> | null = null;

function getAuthInstance() {
  if (!authInstance) {
    firebaseApp = firebaseApp || initializeApp(firebaseConfig);
    authInstance = getAuth(firebaseApp);
  }
  return authInstance;
}

const provider = new GoogleAuthProvider();
// Request Google Classroom scopes matches exactly with setup
provider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.rosters');
provider.addScope('https://www.googleapis.com/auth/classroom.rosters.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.coursework.me');
provider.addScope('https://www.googleapis.com/auth/classroom.courseworkmaterials');
provider.addScope('https://www.googleapis.com/auth/classroom.announcements');
provider.addScope('https://www.googleapis.com/auth/classroom.profile.emails');
provider.addScope('https://www.googleapis.com/auth/classroom.profile.photos');

// Google Sheets scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Google Forms & Google Drive API scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
provider.addScope('https://www.googleapis.com/auth/forms.body');
provider.addScope('https://www.googleapis.com/auth/forms.body.readonly');
provider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(getAuthInstance(), async (user: User | null) => {
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

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
    try {
      isSigningIn = true;
      const result = await signInWithPopup(getAuthInstance(), provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await getAuthInstance().signOut();
  cachedAccessToken = null;
};
