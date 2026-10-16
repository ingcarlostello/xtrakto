import { useState } from "react";

/**
 * The search field's text: what the person types, and the URL's search again
 * whenever that changes from elsewhere, as "Quitar búsqueda" or going back
 * does. The field stays mounted across those navigations, so it can't rely
 * on its default value.
 */
export const useSearchText = (search: string | undefined) => {
  const [text, setText] = useState(search ?? "");
  const [shownSearch, setShownSearch] = useState(search);
  if (search !== shownSearch) {
    setShownSearch(search);
    setText(search ?? "");
  }
  return [text, setText] as const;
};
