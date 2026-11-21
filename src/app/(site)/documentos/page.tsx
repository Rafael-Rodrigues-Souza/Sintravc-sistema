import { redirect } from "next/navigation";

/** “Documentos” sozinho abre a primeira aba, Editais (E60). */
export default function PaginaDocumentos() {
  redirect("/documentos/editais");
}
