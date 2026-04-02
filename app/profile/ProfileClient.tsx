"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/components/Toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Loader2, Shield, User, Settings, AlertTriangle } from "lucide-react"

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[A-Za-z0-9@$!%*?&]{8,}$/

interface Props {
  userId: string
  email: string
  firstName: string
  lastName: string
  autoArchive: boolean
  notifications: boolean
}

export default function ProfileClient({ userId, email: initialEmail, firstName: initFirst, lastName: initLast, autoArchive: initAutoArchive, notifications: initNotifications }: Props) {
  const supabase = createClient()
  const { t } = useTranslation()
  const { toast } = useToast()

  // Personal info
  const [firstName, setFirstName] = useState(initFirst)
  const [lastName, setLastName] = useState(initLast)
  const [email, setEmail] = useState(initialEmail)
  const [savingInfo, setSavingInfo] = useState(false)

  // Password
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdError, setPwdError] = useState("")

  // Preferences
  const [autoArchive, setAutoArchive] = useState(initAutoArchive)
  const [notifications, setNotifications] = useState(initNotifications)
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Danger
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  async function saveInfo() {
    setSavingInfo(true)
    const updates: Record<string, unknown> = { data: { first_name: firstName, last_name: lastName } }
    if (email !== initialEmail) {
      updates.email = email
    }
    const { error } = await supabase.auth.updateUser(updates as Parameters<typeof supabase.auth.updateUser>[0])
    if (error) {
      toast("error", error.message)
    } else {
      toast("success", t("profile.saved"))
      if (email !== initialEmail) {
        toast("success", t("profile.emailHint"))
      }
    }
    setSavingInfo(false)
  }

  async function changePassword() {
    setPwdError("")
    if (!newPwd) return
    if (!PASSWORD_REGEX.test(newPwd)) {
      setPwdError(t("password.tooWeak"))
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdError(t("signup.passwordMismatch"))
      return
    }
    setSavingPwd(true)
    // Verify current password by re-signing in
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: initialEmail, password: currentPwd })
    if (signInErr) {
      setPwdError(signInErr.message)
      setSavingPwd(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    if (error) {
      setPwdError(error.message)
    } else {
      toast("success", t("profile.passwordChanged"))
      setCurrentPwd("")
      setNewPwd("")
      setConfirmPwd("")
    }
    setSavingPwd(false)
  }

  async function savePreferences() {
    setSavingPrefs(true)
    const { error } = await supabase.auth.updateUser({ data: { auto_archive: autoArchive, notifications } })
    if (error) toast("error", error.message)
    else toast("success", t("profile.saved"))
    setSavingPrefs(false)
  }

  async function deleteAccount() {
    // Client-side: we delete tasks then sign out. Full deletion requires admin API.
    await supabase.from("tasks").delete().eq("user_id", userId)
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <div className="min-h-screen bg-[#0c0c10] p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{t("profile.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("profile.subtitle")}</p>
          </div>
        </div>

        {/* PERSONAL INFO */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><User className="size-5 text-purple-400" />{t("profile.personalInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("profile.firstName")}</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.lastName")}</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("profile.email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("profile.emailHint")}</p>
            </div>
            <Button onClick={saveInfo} disabled={savingInfo}>
              {savingInfo ? <><Loader2 className="size-4 animate-spin" /> {t("profile.saving")}</> : t("profile.save")}
            </Button>
          </CardContent>
        </Card>

        {/* SECURITY */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Shield className="size-5 text-purple-400" />{t("profile.security")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("profile.currentPassword")}</Label>
              <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("profile.newPassword")}</Label>
              <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                <li>• {t("password.minLength")}</li>
                <li>• {t("password.uppercase")}</li>
                <li>• {t("password.lowercase")}</li>
                <li>• {t("password.digit")}</li>
                <li>• {t("password.special")}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label>{t("profile.confirmNewPassword")}</Label>
              <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            </div>
            {pwdError && <p className="text-xs text-red-400">{pwdError}</p>}
            <Button onClick={changePassword} disabled={savingPwd}>
              {savingPwd ? <><Loader2 className="size-4 animate-spin" /></> : t("profile.changePassword")}
            </Button>
          </CardContent>
        </Card>

        {/* PREFERENCES */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Settings className="size-5 text-purple-400" />{t("profile.preferences")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm text-white font-medium">{t("profile.autoArchive")}</p>
                <p className="text-xs text-muted-foreground">{t("profile.autoArchiveDesc")}</p>
              </div>
              <input type="checkbox" checked={autoArchive} onChange={(e) => setAutoArchive(e.target.checked)} className="size-5 rounded accent-purple-500" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm text-white font-medium">{t("profile.notifications")}</p>
                <p className="text-xs text-muted-foreground">{t("profile.notificationsDesc")}</p>
              </div>
              <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} className="size-5 rounded accent-purple-500" />
            </label>
            <Button onClick={savePreferences} disabled={savingPrefs}>
              {savingPrefs ? <><Loader2 className="size-4 animate-spin" /></> : t("profile.save")}
            </Button>
          </CardContent>
        </Card>

        {/* DANGER ZONE */}
        <Card className="glass-card border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400"><AlertTriangle className="size-5" />{t("profile.dangerZone")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">{t("profile.delete")}</p>
                <p className="text-xs text-muted-foreground">{t("profile.deleteDesc")}</p>
              </div>
              {!showDeleteConfirm ? (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>{t("profile.delete")}</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>{t("profile.cancel")}</Button>
                  <Button variant="destructive" size="sm" onClick={deleteAccount}>{t("profile.deleteButton")}</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

