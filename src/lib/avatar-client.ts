import { AVATAR_SIZE } from "./avatar";

/** Recorta al centro en cuadrado y comprime a JPEG liviano para subir. */
export async function prepareAvatarFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Elegí una imagen (JPG, PNG o WebP)");

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("No se pudo procesar la imagen");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("No se pudo comprimir la foto"))), "image/jpeg", 0.86);
  });

  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}
