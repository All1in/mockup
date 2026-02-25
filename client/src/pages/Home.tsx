import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const authData = useAuth();
  const [profile, setProfile] = useState<string>('');
  const navigate = useNavigate();

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
          <button
            onClick={() => {
              if (profile === 'Guest') {
                navigate('/login');
              } else {
                authData.logout();
              }
            }}
          >
            {profile === 'Guest' ? 'Login' : 'Logout'}
          </button>
        </>
      )}
    </div>
  );
}
