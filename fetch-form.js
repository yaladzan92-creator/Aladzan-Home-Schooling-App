import fs from 'fs';

async function run() {
  const url = 'https://forms.gle/XW88uWo2UJPBxej36?d=1';
  console.log('Fetching:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    console.log('Status:', res.status);
    const html = await res.text();
    fs.writeFileSync('raw-form-d1.html', html);
    console.log('Saved raw-form-d1.html, length:', html.length);
    
    // Look for any interesting strings
    const keywords = ['nama', 'email', 'paket', 'kelas', 'lahir', 'nik', 'nisn', 'srikandi', 'pendaftaran', 'Google Form', 'Formulir'];
    keywords.forEach(kw => {
      const regex = new RegExp(`[^\\s"'\\\`<>]{0,100}${kw}[^\\s"'\\\`<>]{0,100}`, 'gi');
      const matches = html.match(regex);
      console.log(`Keyword "${kw}" matches (first 8):`, matches ? matches.slice(0, 8) : 'none');
    });
  } catch (err) {
    console.error(err);
  }
}

run();
