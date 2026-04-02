"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useTranslation, type TranslationKey } from "@/lib/i18n"

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const

export default function FAQPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Link href="/signup">
            <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground">
              <ArrowLeft className="size-4" /> {t("faq.back")}
            </Button>
          </Link>
          <CardTitle className="text-2xl font-bold">{t("faq.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FAQ_KEYS.map((key) => (
            <details
              key={key}
              className="group rounded-lg border border-white/10 bg-white/5 p-3"
            >
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                {t(`faq.${key}` as TranslationKey)}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`faq.a${key.slice(1)}` as TranslationKey)}
              </p>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

