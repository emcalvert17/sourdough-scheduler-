const PHOTOS_KEY = 'ss_photos';

export function getPhotos() {
  try { return JSON.parse(localStorage.getItem(PHOTOS_KEY)) || []; } catch { return []; }
}

export function savePhoto(photo) {
  const photos = getPhotos();
  const existing = photos.findIndex(p => p.id === photo.id);
  if (existing >= 0) { photos[existing] = photo; } else { photos.unshift(photo); }
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
}

export function deletePhoto(id) {
  const photos = getPhotos().filter(p => p.id !== id);
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
}

export function compressImage(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}
