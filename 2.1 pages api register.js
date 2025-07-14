// pages/api/register.js

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, password } = req.body;

    // TODO: 1. Input Validation (সার্ভার-সাইড ভ্যালিডেশন)
    // - ইমেইল ফরম্যাট, পাসওয়ার্ডের দৈর্ঘ্য ইত্যাদি যাচাই করুন।
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ message: 'ইমেইল এবং পাসওয়ার্ডের সঠিক ফরম্যাট প্রয়োজন।' });
    }

    // TODO: 2. Check if user already exists
    // - ডেটাবেজে দেখুন এই ইমেইল দিয়ে কোনো ইউজার আছে কিনা।
    // Example (conceptual):
    // const existingUser = await db.collection('users').findOne({ email });
    // if (existingUser) {
    //   return res.status(409).json({ message: 'এই ইমেইল দিয়ে ইতিমধ্যেই একটি অ্যাকাউন্ট বিদ্যমান।' });
    // }

    // TODO: 3. Hash Password (পাসওয়ার্ড হ্যাশিং)
    // - পাসওয়ার্ডকে সুরক্ষিতভাবে হ্যাশ করুন (যেমন: bcryptjs ব্যবহার করে)।
    // Example (conceptual):
    // const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // TODO: 4. Save User to Database
    // - নতুন ইউজারকে ডেটাবেজে সংরক্ষণ করুন (ইমেইল, হ্যাশড পাসওয়ার্ড, রোল: 'buyer')।
    // Example (conceptual):
    // const newUser = await db.collection('users').insertOne({
    //   email,
    //   password: hashedPassword,
    //   role: 'buyer', // default role
    //   createdAt: new Date(),
    // });

    // TODO: 5. Send Email Verification (ঐচ্ছিক)
    // - ইমেইল ভেরিফিকেশন লিংক পাঠান।

    // Successful Registration Response
    res.status(201).json({ message: 'রেজিস্ট্রেশন সফল হয়েছে!' });

  } else {
    // Only POST method is allowed
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}