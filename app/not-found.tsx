"use client"

import Link from "next/link"
import { useTranslation } from "@/lib/i18n"

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0c10] px-4 text-center">
      <h1 className="text-8xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
        404
      </h1>
      <h2 className="mt-4 text-xl font-semibold text-white">{t("error.notFound")}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("error.notFoundDesc")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl"
      >
        {t("error.backHome")}
      </Link>
    </div>
  )
}

