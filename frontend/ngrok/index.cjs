const ngrok = require("@ngrok/ngrok");

async function startCalendar() {
  try {
    console.log("🚀 Starte Ngrok Tunnel...");

    const tunnel = await ngrok.forward({
      addr: "localhost:3000",
      authtoken: "3IgWG2QyXHkgn5Q4xImG8FNafqf_22RJJ6BZqCQMfmtmvbqEU",
      domain: "voting-prone-skipper.ngrok-free.dev",
    });

    console.log("\n✅ Kalender ist öffentlich erreichbar!");
    console.log(`📱 URL: ${tunnel.url()}`);
    console.log(`📊 Dashboard: http://127.0.0.1:4040\n`);
  } catch (error) {
    console.error("❌ Fehler:", error.message);
    console.error("Fehler-Code:", error.errorCode || "Unbekannt");
  }
}

startCalendar();