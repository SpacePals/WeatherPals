import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors()); // allow frontend requests

const USERNAME = process.env.METEOMATICS_USERNAME;
const PASSWORD = process.env.METEOMATICS_PASSWORD;

// Example route: /weather?lat=26.22&lon=50.58
app.get("/weather", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });

  const now = new Date().toISOString();
  const url = `https://api.meteomatics.com/${now}/precip_1h:mm/${lat},${lon}/json`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64"),
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
