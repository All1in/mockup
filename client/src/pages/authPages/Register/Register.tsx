import { useState, type SubmitEvent } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ApiError } from '../../../utility/requests';

export default function RegisterPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [errMsg, setErrMsg] = useState('');

  const navigate = useNavigate();

  let authInfo = useAuth();

  async function sendLoginForm(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const res = await authInfo.register({ name, email, password });
      console.log('result on register page', res);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrMsg(err.message);
        console.log('error on register page', err);
      } else {
        setErrMsg(String(err));
        console.log('error on register page', err);
      }
    }
  }
  return (
    <div>
      <form onSubmit={sendLoginForm}>
        <h2>Register new profile</h2>
        <div>
          <label htmlFor="name">Name: </label>
          <input
            onChange={(e) => setName(e.target.value)}
            type="text"
            id={'name'}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email adress: </label>
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
          Register
        </button>
        <Link to="/login">Already have account?</Link>
      </form>
      {errMsg !== '' && <p style={{ color: 'red' }}>{errMsg}</p>}
    </div>
  );
}
