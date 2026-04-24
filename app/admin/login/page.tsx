import { AdminLoginForm } from "@/components/auth/admin-login-form"
import { Navbar } from "@/components/shared/navbar"
import { Shield } from "lucide-react"
import Link from "next/link"

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Admin Portal</h1>
            <p className="text-muted-foreground">SmartStay Administration</p>
          </div>
          <AdminLoginForm />
          <p className="text-center text-sm text-muted-foreground mt-4">
            Need an admin account?{" "}
            <Link href="/admin/register" className="text-primary hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
