// heic-decode 2.x não traz tipos. Só o que a Mídia usa (src/lib/midia/preparar.ts).
declare module "heic-decode" {
  type ImagemDecodificada = { width: number; height: number; data: Uint8ClampedArray };
  function decode(entrada: { buffer: Uint8Array | ArrayBuffer }): Promise<ImagemDecodificada>;
  export default decode;
}
