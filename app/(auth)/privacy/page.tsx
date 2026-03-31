import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Link href="/signup">
            <Button variant="ghost" size="sm" className="mb-2 gap-2 text-muted-foreground">
              <ArrowLeft className="size-4" /> Back to Sign Up
            </Button>
          </Link>
          <CardTitle className="text-2xl font-bold">Privacy Policy</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: March 31, 2026</p>
        </CardHeader>
        <CardContent className="prose prose-invert prose-sm max-w-none space-y-4 text-sm text-muted-foreground">
          <section>
            <h3 className="text-base font-semibold text-foreground">1. Data Collection</h3>
            <p>Planigo collects the following information when you create an account:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Email address</strong> — used for authentication and account recovery.</li>
              <li><strong className="text-foreground">Task data</strong> — titles, descriptions, categories, priorities, and due dates you create within the app.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">2. How We Use Your Data</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>To provide and maintain the task management service.</li>
              <li>To authenticate your identity and protect your account.</li>
              <li>To generate AI-assisted task suggestions (your goal descriptions are sent to OpenAI for processing; no personal data beyond your input is shared).</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">3. Data Storage & Security</h3>
            <p>Your data is stored securely on <strong className="text-foreground">Supabase</strong> (PostgreSQL) with Row Level Security (RLS) enabled. Each user can only access their own tasks. All communication uses HTTPS encryption.</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">4. Third-Party Services</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Supabase</strong> — Authentication and database hosting.</li>
              <li><strong className="text-foreground">OpenAI</strong> — AI task suggestion feature (only processes the goal text you submit).</li>
              <li><strong className="text-foreground">Vercel</strong> — Application hosting.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">5. Your Rights</h3>
            <p>You have the right to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Access all your personal data stored in Planigo.</li>
              <li>Delete your account and all associated data at any time.</li>
              <li>Export your task data.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">6. Cookies</h3>
            <p>Planigo uses only essential cookies required for authentication (session tokens). We do not use tracking or analytics cookies.</p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">7. AI & Personal Data</h3>
            <p>
              <strong className="text-foreground">No personal data is stored or provided to the AI.</strong> When you use the AI task planning feature, only the task objective or idea you describe is sent to OpenAI for processing. No identifying information (email, name, account data, or existing task history) is included in the AI request. The AI response is used solely to generate task suggestions and is not stored beyond your session.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-foreground">8. Contact</h3>
            <p>For any questions about this privacy policy, please contact us via the project&apos;s GitHub repository.</p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}

