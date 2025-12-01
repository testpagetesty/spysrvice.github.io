const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { default: fetch } = require('node-fetch');

async function uploadCreative() {
  const folderPath = 'C:\\Users\\840G5\\Desktop\\spyservice\\spy-dashboard\\Новая папка';
  const apiUrl = 'http://localhost:3001/api/creatives';
  
  // Данные креатива из f5spy
  const creativeData = {
    title: 'Escribí tu consulta',
    description: 'Crypto advertisement creative from Argentina',
    format: 'teaser',
    type: 'crypt', 
    placement: 'demand_gen',
    country: 'AR',
    platform: 'web',
    cloaking: false,
    landing_url: 'https://f5spy.com/viewer/4480/view',
    source_link: 'https://f5spy.com/viewer/4480/view',
    source_device: 'desktop'
  };

  try {
    // Читаем файлы из папки
    const files = fs.readdirSync(folderPath);
    console.log('Files found:', files);

    const formData = new FormData();
    
    // Добавляем текстовые данные
    Object.keys(creativeData).forEach(key => {
      formData.append(key, String(creativeData[key]));
    });

    // Добавляем файлы
    let mediaAdded = false;
    files.forEach(fileName => {
      const filePath = path.join(folderPath, fileName);
      const fileStats = fs.statSync(filePath);
      
      if (fileStats.isFile()) {
        const fileStream = fs.createReadStream(filePath);
        
        if (fileName.endsWith('.zip')) {
          formData.append('zip_file', fileStream, fileName);
          console.log('Added zip file:', fileName);
        } else if (fileName.endsWith('.webp') || fileName.endsWith('.jpg') || fileName.endsWith('.png')) {
          if (!mediaAdded) {
            formData.append('media_file', fileStream, fileName);
            console.log('Added media file:', fileName);
            mediaAdded = true;
          } else {
            formData.append('thumbnail_file', fileStream, fileName);
            console.log('Added thumbnail file:', fileName);
          }
        }
      }
    });

    console.log('Uploading creative to:', apiUrl);
    console.log('Data:', creativeData);

    // Отправляем запрос
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Creative uploaded successfully!');
      console.log('Creative ID:', result.creative?.id);
      console.log('URLs:', result.urls);
    } else {
      console.error('❌ Upload failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Запускаем загрузку
uploadCreative();
