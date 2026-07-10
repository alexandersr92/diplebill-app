import { Redirect } from 'expo-router';
import { useAppSelector } from '@/store/hooks';

export default function Index() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isSellerAuthenticated = useAppSelector((state) => state.auth.isSellerAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isSellerAuthenticated) {
    return <Redirect href="/(auth)/seller-login" />;
  }

  return <Redirect href="/(app)" />;
}
