import { useEffect } from 'react';
import type { AuthContextValue } from '../models/auth';

export default function useProfileLabel(
  authData: AuthContextValue,
  setProfile: (value: React.SetStateAction<string>) => void,
) {
  useEffect(() => {
    if (authData.isLoading === true) {
      setProfile('Loading...');
    } else if (authData.isLoading === false && authData.user === null) {
      setProfile('Guest');
    } else if (authData.isLoading === false && authData.user !== null) {
      setProfile(authData.user.name);
    } else {
      setProfile('Guest');
    }
  }, [authData]);
}
