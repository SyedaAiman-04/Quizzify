export default function handler(req: any, res: any) {
  if (req.method === "POST") {
    const { username, password } = req.body;

    if (username === "admin" && password === "1234") {
      return res.status(200).json({ success: true });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  res.status(405).json({ message: "Method not allowed" });
}