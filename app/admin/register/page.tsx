import { AdminRegisterForm } from "@/components/auth/admin-register-form"
import { Navbar } from "@/components/shared/navbar"
import { ShieldCheck } from "lucide-react"
import Link from "next/link"

export default function AdminRegisterPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Admin Registration</h1>
            <p className="text-muted-foreground">Create an administrator account</p>
          </div>
          <AdminRegisterForm />
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an admin account?{" "}
            <Link href="/admin/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
