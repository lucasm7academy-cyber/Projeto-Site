import { supabase } from './supabase';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_DIMENSION = 1080;

export function validarImagem(file: File): Promise<string | null> {
  return new Promise(resolve => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      resolve('Apenas PNG ou JPEG são aceitos.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        resolve(`Imagem muito grande (${img.width}×${img.height}px). Máximo: ${MAX_DIMENSION}×${MAX_DIMENSION}px.`);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve('Erro ao ler a imagem.'); };
    img.src = url;
  });
}

export async function uploadLogoTime(file: File, timeId: string): Promise<string | null> {
  const ext  = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${timeId}.${ext}`;
  const { error } = await supabase.storage
    .from('team-logos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return null;
  const { data } = supabase.storage.from('team-logos').getPublicUrl(path);
  return data.publicUrl;
}
