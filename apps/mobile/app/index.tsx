import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { session } from '@/features/session/session';

/** Decide where to start: codes if we have a session in SecureStore, otherwise sign-in. */
export default function Index() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    session.isSignedIn().then(setSignedIn);
  }, []);
  if (signedIn === null) return null;
  return <Redirect href={signedIn ? '/codes' : '/sign-in'} />;
}
