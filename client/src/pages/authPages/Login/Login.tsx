import { useState, type SubmitEvent } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ApiError } from '../../../utility/requests';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errMsg, setErrMsg] = useState('');

  const navigate = useNavigate();

  const authInfo = useAuth();

  async function sendLoginForm(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const res = await authInfo.login({ email, password });
      console.log('result on login page', res);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          console.log('error on login page', err);
          setErrMsg(err.message);
        }
      } else if (err instanceof Error) {
        setErrMsg(err.message);
      } else {
        setErrMsg('Something went wrong');
      }
    }
  }
  return (
    <div>
      <form onSubmit={sendLoginForm}>
        <h2>Login to your account</h2>
        <div>
          <label htmlFor="email">Email adress:</label>
          <input
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            id="email"
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password: </label>
          <input
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            id="password"
            required
          />
        </div>
        <button disabled={authInfo.isLoading} type="submit">
          Log in
        </button>
        <Link to="/register">Don't have account?</Link>
      </form>
      {errMsg !== '' && <p style={{ color: 'red' }}>{errMsg}</p>}
    </div>
  );
}
