// pages/login.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Auth.module.css'; // একই CSS ফাইল ব্যবহার করা হবে

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('ইমেইল এবং পাসওয়ার্ড উভয়ই পূরণ করুন।');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/login', { // এই API endpoint পরে ব্যাকএন্ডে তৈরি হবে
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Assume backend returns a token or user info
        // You would typically save this token in localStorage or a cookie
        localStorage.setItem('userToken', data.token); // Example: Save token
        alert('লগইন সফল হয়েছে!');
        router.push('/dashboard'); // সফল হলে ড্যাশবোর্ড পেজে রিডাইরেক্ট
      } else {
        setError(data.message || 'লগইন ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('একটি ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>লগইন করুন</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.formGroup}>
          <label htmlFor="email">ইমেইল:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">পাসওয়ার্ড:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'লগইন হচ্ছে...' : 'লগইন'}
        </button>
      </form>
      <p className={styles.linkText}>
        অ্যাকাউন্ট নেই? <a href="/register" className={styles.link}>রেজিস্ট্রেশন করুন</a>
      </p>
      <p className={styles.linkText}>
        <a href="/forgot-password" className={styles.link}>পাসওয়ার্ড ভুলে গেছেন?</a>
      </p>
    </div>
  );
}