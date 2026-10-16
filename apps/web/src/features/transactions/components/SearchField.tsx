import { Search } from "lucide-react";
import Form from "next/form";
import { useId } from "react";
import {
  periodParam,
  TRANSACTIONS_PARAMS,
} from "@/utils/transactions-url.helpers";
import type { ListLink } from "../transaction-list.helpers";
import { TRANSACTIONS_COPY } from "../transaction.constants";
import { SearchInput } from "./SearchInput";

const COPY = TRANSACTIONS_COPY.search;

// The filters the search keeps: the account, when there are several, and the period.
function KeptFilters({ link }: { link: ListLink }) {
  return (
    <>
      {link.accountId && (
        <input
          type="hidden"
          name={TRANSACTIONS_PARAMS.account}
          value={link.accountId}
        />
      )}
      <input
        type="hidden"
        name={TRANSACTIONS_PARAMS.period}
        value={periodParam(link.period)}
      />
    </>
  );
}

/**
 * "Busca por descripción o monto" (docs/ui/v8-03): a GET form, so the search
 * lands in the URL with the account and the period, and works before the
 * page's script loads. Enter searches; an empty search shows every movement.
 */
export function SearchField({ link }: { link: ListLink }) {
  const id = useId();
  return (
    <Form
      action="/transactions"
      scroll={false}
      role="search"
      className="relative"
    >
      <KeptFilters link={link} />
      <label htmlFor={id} className="sr-only">
        {COPY.label}
      </label>
      <Search
        aria-hidden
        strokeWidth={1.9}
        className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-muted"
      />
      <SearchInput id={id} search={link.search} />
    </Form>
  );
}
