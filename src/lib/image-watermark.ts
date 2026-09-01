const LOGO_URL = '/brand/alqirsh-logoo.jpg';

function createSeed(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`.split('').reduce((seed, character) => ((seed * 31) + character.charCodeAt(0)) >>> 0, 7);
}

function loadImage(source: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = source instanceof Blob ? URL.createObjectURL(source) : source;
    image.onload = () => {
      if (source instanceof Blob) URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      if (source instanceof Blob) URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر تجهيز الصورة للرفع.'));
    };
    image.src = objectUrl;
  });
}

export async function addBrandWatermark(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('الملف يجب أن يكون صورة.');

  const [source, logo] = await Promise.all([loadImage(file), loadImage(LOGO_URL)]);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 2400 / Math.max(source.naturalWidth, source.naturalHeight));
  canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز الصورة للرفع.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  const padding = Math.max(12, Math.round(canvas.width * 0.018));
  const seed = createSeed(file);
  const position = seed % 5;
  const logoWidth = Math.min(Math.round(canvas.width * (0.16 + ((seed % 5) * 0.012))), 220);
  const logoHeight = Math.round((logo.naturalHeight / logo.naturalWidth) * logoWidth);
  const positions = [
    [padding, padding],
    [canvas.width - logoWidth - padding, padding],
    [padding, canvas.height - logoHeight - padding],
    [canvas.width - logoWidth - padding, canvas.height - logoHeight - padding],
    [Math.round((canvas.width - logoWidth) / 2), Math.round((canvas.height - logoHeight) / 2)],
  ] as const;
  const [x, y] = positions[position];

  context.save();
  context.globalAlpha = 0.86 + ((seed % 10) / 100);
  context.fillStyle = 'rgba(255, 255, 255, 0.88)';
  context.beginPath();
  context.roundRect(x - padding / 2, y - padding / 2, logoWidth + padding, logoHeight + padding, padding / 2);
  context.fill();
  context.globalAlpha = 1;
  context.drawImage(logo, x, y, logoWidth, logoHeight);
  context.restore();

  const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!output) throw new Error('تعذر حفظ الصورة المعلّمة.');
  return new File([output], file.name.replace(/\.[^.]+$/, '') + '-alqirsh.jpg', { type: 'image/jpeg' });
}
