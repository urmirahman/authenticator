import { Redirect } from 'expo-router';

// TODO: redirect to /codes when a session exists in SecureStore.
export default function Index() {
  return <Redirect href="/sign-in" />;
}
