"use client";

import { Input } from "@/components/ui/input";
import { TRANSACTIONS_PARAMS } from "@/utils/transactions-url.helpers";
import { useSearchText } from "../hooks/use-search-text";
import { MAX_SEARCH_LENGTH, TRANSACTIONS_COPY } from "../transaction.constants";

type SearchInputProps = { readonly id: string; readonly search?: string };

/** The search's text field, which follows the URL's search when it changes. */
export function SearchInput({ id, search }: SearchInputProps) {
  const [text, setText] = useSearchText(search);
  return (
    <Input
      id={id}
      type="search"
      name={TRANSACTIONS_PARAMS.search}
      value={text}
      onChange={(event) => setText(event.currentTarget.value)}
      placeholder={TRANSACTIONS_COPY.search.placeholder}
      maxLength={MAX_SEARCH_LENGTH}
      enterKeyHint="search"
      autoComplete="off"
      className="rounded-full pl-11 shadow-chip"
    />
  );
}
