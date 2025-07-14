// pages/api/login.js
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, password } = req.body;

    // TODO: 1. Input Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'ইমেইল এবং পাসওয়ার্ড উভয়ই পূরণ করুন।' });
    }

    // TODO: 2. Find User in Database
    // - ডেটাবেজে ইমেইল দিয়ে ইউজার খুঁজুন।
    // Example (conceptual):
    // const user = await db.collection('users').findOne({ email });
    // if (!user) {
    //   return res.status(401).json({ message: 'ভুল ইমেইল বা পাসওয়ার্ড।' });
    // }

    // TODO: 3. Compare Password
    // - ইনপুট পাসওয়ার্ড হ্যাশড পাসওয়ার্ডের সাথে তুলনা করুন (যেমন: bcryptjs.compare)।
    // Example (conceptual):
    // const isMatch = await bcrypt.compare(password, user.password);
    // if (!isMatch) {
    //   return res.status(401).json({ message: 'ভুল ইমেইল বা পাসওয়ার্ড।' });
    // }

    // TODO: 4. Generate JWT Token (অথেনটিকেশনের জন্য)
    // - ইউজার সফলভাবে লগইন করলে একটি JSON Web Token (JWT) তৈরি করুন।
    // - টোকেনে ইউজারের আইডি, রোল ইত্যাদি তথ্য এনকোড করা যেতে পারে।
    // Example (conceptual):
    // const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Successful Login Response
    // - ক্লায়েন্টকে টোকেন এবং ইউজারের কিছু তথ্য পাঠান।
    res.status(200).json({
      message: 'লগইন সফল হয়েছে!',
      // token: token, // Uncomment this line when you implement JWT
      // user: { id: user._id, email: user.email, role: user.role } // Example user data
    });

  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}