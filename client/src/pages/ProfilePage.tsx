import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import useProfileLabel from '../utility/hooks';

export default function ProfilePage() {
  const authData = useAuth();
  const [profile, setProfile] = useState<string>('');

  useProfileLabel(authData, setProfile);

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
