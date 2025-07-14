// pages/register.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Auth.module.css'; // পরে এই ফাইলটি তৈরি করব

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    if (!email || !password || !confirmPassword) {
      setError('সকল ঘর পূরণ করুন।');
      return;
    }

    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না।');
      return;
    }

    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setLoading(true); // Show loading state

    try {
      const response = await fetch('/api/register', { // এই API endpoint পরে ব্যাকএন্ডে তৈরি হবে
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('রেজিস্ট্রেশন সফল হয়েছে! এখন লগইন করুন।');
        router.push('/login'); // সফল হলে লগইন পেজে রিডাইরেক্ট
      } else {
        setError(data.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('একটি ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false); // Hide loading state
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>রেজিস্ট্রেশন করুন</h1>
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

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={styles.input}
          />
        </div>

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? 'রেজিস্ট্রেশন হচ্ছে...' : 'রেজিস্ট্রেশন'}
        </button>
      </form>
      <p className={styles.linkText}>
        ইতিমধ্যে অ্যাকাউন্ট আছে? <a href="/login" className={styles.link}>লগইন করুন</a>
      </p>
    </div>
  );
}
