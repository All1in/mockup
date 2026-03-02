import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const authData = useAuth();
  const [profile, setProfile] = useState<string>('');

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
  }, [authData.isLoading]);

  return (
    <div>
      {authData.isLoading === false && (
        <>
          <p>Hello, {profile}</p>
          <p>Name: {authData.user?.name}</p>
          <p>Email: {authData.user?.email}</p>
          <p>Data created: {authData.user?.createdAt}</p>
        </>
      )}
    </div>
  );
}
