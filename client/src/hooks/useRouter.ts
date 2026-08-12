import { useRouter } from 'next/navigation';

export const useAuthRedirect = (route: string) => {
    const router = useRouter();
    return () => router.push(route);
  };

