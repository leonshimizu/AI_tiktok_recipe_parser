import React, { useState } from 'react';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }
      const data = await res.json();
      alert(`Logged in as user_id: ${data.user_id}`);
    } catch (error) {
      console.error(error);
      alert('Login error');
    }
  }

  return (
    <form onSubmit={handleLogin} className="mb-8 space-y-2">
      <h2 className="text-xl font-bold">Login</h2>
      <div>
        <label>Username</label>
        <input
          className="border"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </div>
      <div>
        <label>Password</label>
        <input
          className="border"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      <button className="bg-green-500 text-white px-2 py-1 rounded">
        Log In
      </button>
    </form>
  );
}

export default LoginForm;
