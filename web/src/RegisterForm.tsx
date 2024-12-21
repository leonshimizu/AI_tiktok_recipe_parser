import React, { useState } from 'react';

function RegisterForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/register', {
        method: 'POST',
        credentials: 'include', // important if using session cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        // Attempt to parse JSON error
        const data = await res.json();
        throw new Error(data.error || 'Registration failed');
      }
      const data = await res.json();
      alert(`User created with id: ${data.user_id}`);
    } catch (error) {
      console.error(error);
      alert('Registration error');
    }
  }

  return (
    <form onSubmit={handleRegister} className="mb-8 space-y-2">
      <h2 className="text-xl font-bold">Register</h2>
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
      <button className="bg-blue-500 text-white px-2 py-1 rounded">
        Register
      </button>
    </form>
  );
}

export default RegisterForm;
