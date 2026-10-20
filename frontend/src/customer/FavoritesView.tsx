"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { HeartIcon } from "@/components/ui/icons";
import { useCustomer } from "@/customer/CustomerProvider";
import { LoginForm } from "@/customer/LoginForm";
import { format, localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import type { Product } from "@/lib/api";
import { clientApi, clientFileUrl, formatPhone } from "@/lib/clientApi";

/** Саҳифаи "Писандида": ворид нашуда — формаи даромад; ворид шуда — молҳои писандида. */
export function FavoritesView() {
  const { locale, dict } = useI18n();
  const { user, isFavorite, logout } = useCustomer();
  const [items, setItems] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Рӯйхат баъд аз даромад бор мешавад (агар ворид нашуда бошад — дархост намеравад)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    clientApi.favorites().then(
      (list) => !cancelled && setItems(list),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user === undefined || (user && items === null && !failed)) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-r-transparent" />
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="mx-auto max-w-md rounded-[28px] bg-surface p-6 sm:mt-6 sm:p-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sale/10">
          <HeartIcon width={28} height={28} className="fill-sale text-sale" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{dict.auth.title}</h2>
        <p className="mt-1 mb-5 text-sm text-muted">{dict.auth.subtitle}</p>
        <LoginForm />
      </div>
    );
  }

  // ❤️-и хомӯшкардашуда фавран аз рӯйхат мебарояд
  const visible = (items ?? []).filter((p) => isFavorite(p.id));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>{format(dict.auth.loggedInAs, { phone: formatPhone(user.phone) })}</span>
        <button type="button" onClick={() => void logout()} className="font-medium text-foreground hover:underline">
          {dict.auth.logout}
        </button>
      </div>

      {failed ? (
        <p className="py-16 text-center text-muted">{dict.auth.errors.unknown}</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <HeartIcon width={48} height={48} className="text-muted/50" />
          <p className="text-muted">
            {dict.favorites.empty.split("♥").map((part, i) => (
              <span key={i}>
                {i > 0 && <HeartIcon width={16} height={16} className="inline-block fill-sale align-[-2px] text-sale" />}
                {part}
              </span>
            ))}
          </p>
          <Link
            href={localizePath(locale, "/catalog")}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent hover:brightness-95"
          >
            {dict.favorites.toCatalog}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((p) => (
            <li key={p.id}>
              <ProductCard
                product={{
                  id: p.id,
                  name: p.name[locale] || p.name.tg,
                  price: p.price,
                  oldPrice: p.oldPrice,
                  sizeLabel: p.sizeLabel,
                  isNew: p.isNew,
                  images: p.images.map(clientFileUrl),
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
