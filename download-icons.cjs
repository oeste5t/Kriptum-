const https = require('https');
const fs = require('fs');

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

Promise.all([
  download('https://ui-avatars.com/api/?name=IP&background=0a0a0a&color=ff007f&size=192', 'public/icon-192.png'),
  download('https://ui-avatars.com/api/?name=IP&background=0a0a0a&color=ff007f&size=512', 'public/icon-512.png')
]).then(() => console.log('Downloaded icons')).catch(console.error);
