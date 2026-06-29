// ─────────────────────────────────────────────────────────────
// Downscale an image (in the browser) before uploading or scanning.
// Smaller images upload faster and — for AI scans — cost a fraction as much,
// since cost scales with image size. We cap the longest edge and re-encode
// as JPEG.
// ─────────────────────────────────────────────────────────────
export async function resizeImage(file, maxEdge = 1500, quality = 0.8) {
  // Non-images (e.g. PDFs) are returned untouched.
  if (!file || !file.type.startsWith('image/')) return file;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (Math.max(width, height) > maxEdge) {
    const scale = maxEdge / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  // Wrap back into a File so it keeps a name/type.
  return new File([blob], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', {
    type: 'image/jpeg',
  });
}
