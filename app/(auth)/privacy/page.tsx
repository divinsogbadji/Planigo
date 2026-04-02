"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

export default function PrivacyPolicyPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Link href="/signup">
            <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground">
              <ArrowLeft className="size-4" /> {t("privacy.back")}
            </Button>
          </Link>
          <CardTitle className="text-2xl font-bold">{t("privacy.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("privacy.lastUpdated")}</p>
        </CardHeader>
        <CardContent className="prose prose-invert prose-sm max-w-none space-y-4 text-sm text-muted-foreground">
          <section>
            <h3 className="text-base font-semibold text-foreground">{t("privacy.s1Title")}</h3>
            <p>{t("privacy.s1Intro")}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">{t("privacy.s1Email")}</strong> — {t("privacy.s1EmailDesc")}</li>
              <li><strong className="text-foreground">{t("privacy.s1Tasks")}</strong> — {t("privacy.s1TasksDesc")}</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">{t("privacy.s2Title")}</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t("privacy.s2Item1")}</li>
              <li>{t("privacy.s2Item2")}</li>
              <li>{t("privacy.s2Item3")}</li>
              <li>{t("privacy.s2Item4")}</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">{t("privacy.s3Title")}</h3>
            <p>{t("privacy.s3Text")}</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">{t("privacy.s4Title")}</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Supabase</strong> — {t("privacy.s4Supabase")}</li>
              <li><strong className="text-foreground">OpenAI</strong> — {t("privacy.s4OpenAI")}</li>
              <li><strong className="text-foreground">Vercel</strong> — {t("privacy.s4Vercel")}</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">{t("privacy.s5Title")}</h3>
            <p>{t("privacy.s5Intro")}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t("privacy.s5Item1")}</li>
              <li>{t("privacy.s5Item2")}</li>
              <li>{t("privacy.s5Item3")}</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">{t("privacy.s6Title")}</h3>
            <p>{t("privacy.s6Text")}</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">{t("privacy.s7Title")}</h3>
            <p>{t("privacy.s7Text")}</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">{t("privacy.s8Title")}</h3>
            <p>{t("privacy.s8Text")}</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">{t("privacy.s9Title")}</h3>
            <p>{t("privacy.s9Text")}</p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

