# Arquivos de teste da Mídia

Só o HEIC é um arquivo real. Os outros (JPG com GPS, PNG, GIF, PDF, DOCX, ODT, OLE…) são gerados por `gerar.ts` durante os testes.

## exemplo.heic

- **Origem:** `examples/example.heic` do repositório do libheif, no commit `b97d0c2b2353c8c132f334729fc75e2d47d3763d` (09/07/2024).
  https://github.com/strukturag/libheif/blob/b97d0c2b2353c8c132f334729fc75e2d47d3763d/examples/example.heic
- **Licença:** MIT. A pasta `examples/` do libheif tem o próprio `COPYING`, com a licença MIT. O restante da biblioteca é LGPL.
- **SHA-256:** `7f8b363e4936c0666a25f64f3a92fda10bd8e5453be4592530b65a55dd98f3f2`
- **Conteúdo:** 1280 × 854 px, HEVC.
- **Privacidade:** sem EXIF e sem GPS. Conferido com o `exifr` (`exifr.parse` e `exifr.gps` devolvem `undefined`). O teste `preparar.test.ts` confere de novo que a saída não tem GPS.
