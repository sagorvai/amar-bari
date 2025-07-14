// pages/index.js
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Home.module.css'; // পরে এই ফাইলটি তৈরি করব

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>আমার বাড়ি - আপনার প্রপার্টি সলিউশন</title>
        <meta name="description" content="রিয়েল এস্টেট প্ল্যাটফর্ম" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          স্বাগতম <a href="/">আমার বাড়ি</a>-তে!
        </h1>

        <p className={styles.description}>
          আপনার পছন্দের সম্পত্তি খুঁজুন বা বিক্রি করুন।
        </p>

        <div className={styles.grid}>
          <Link href="/register" className={styles.card}>
             <h2>রেজিস্ট্রেশন করুন &rarr;</h2>
             <p>নতুন অ্যাকাউন্ট তৈরি করুন এবং আমাদের সাথে যোগ দিন।</p>
          </Link>

          <Link href="/login" className={styles.card}>
             <h2>লগইন করুন &rarr;</h2>
             <p>আপনার অ্যাকাউন্টে প্রবেশ করুন এবং আপনার কাজ চালিয়ে যান।</p>
          </Link>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="#" // এখানে আপনার ওয়েবসাইটের ফুটার লিংক যোগ করুন
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by Amar Bari
        </a>
      </footer>
    </div>
  );
}
