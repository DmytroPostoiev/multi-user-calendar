const ngrok = require('ngrok');

(async function() {
  try {
    console.log('🚀 Starte Ngrok Tunnel...');
    
    const url = await ngrok.connect({
      addr: 3000,
      authtoken: '3IgWG2QyXHkgn5Q4xImG8FNafqf_22RJJ6BZqCQMfmtmvbqEU',
      domain: 'voting-prone-skipper.ngrok-free.dev'
    });
    
    console.log('✅ Ngrok Tunnel läuft!');
    console.log('📱 URL:', url);
    console.log('📊 Dashboard: http://127.0.0.1:4040');
    console.log('');
    console.log('🛑 Drücke STRG+C zum Beenden');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }
})();
