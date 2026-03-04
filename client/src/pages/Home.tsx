import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import useProfileLabel from '../utility/hooks';

export default function HomePage() {
  const authData = useAuth();
  const [profile, setProfile] = useState<string>('');
  const navigate = useNavigate();

  useProfileLabel(authData, setProfile);

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
