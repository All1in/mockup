import { useQuery } from "@tanstack/react-query"
import { authMe } from "@/lib/api/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function useAuth() {
  return useQuery({
    queryKey: ["me"],
    queryFn: authMe,
    retry: false,
  })
}