export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const MAX_SIDE = 2000
const KEEP_AS_IS_BYTES = 2.5 * 1024 * 1024

/**
 * Акси камераи телефон (3–8 MB, баъзан HEIC) ё сурати калон аз интернет дар худи браузер то 2000px ва JPEG
 * хурд карда мешавад — бор кардан тез ва аз ҳадди 5 MB-и сервер намегузарад. Файлҳои хурди PNG/JPEG/WebP — бетағйир.
 */
export async function prepareImage(file: File): Promise<File | null> {
  if (IMAGE_TYPES.includes(file.type) && file.size <= KEEP_AS_IS_BYTES) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#fff' // PNG-и шаффоф → заминаи сафед
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) return null
    return new File([blob], (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return null // браузер ин форматро намехонад
  }
}
