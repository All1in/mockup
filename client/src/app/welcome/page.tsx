'use client';

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function Welcome() {
  const { data: user, isLoading, isError } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError || !user) {
    router.replace('/sign-in');
    return null;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}> Welcome to our app! U successfuly registred </div>
  )
}