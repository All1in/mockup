import { useQuery } from "@tanstack/react-query"
import { authMe } from "@/lib/api/api"

export function useAuth() {
  return useQuery({
    queryKey: ["me"],
    queryFn: authMe,
    retry: false,
  })
}