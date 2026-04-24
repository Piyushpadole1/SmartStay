'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users } from 'lucide-react'
import Link from 'next/link'

export default function HostelSelectionPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-text-balance">
              Select Your Hostel
            </h1>
            <p className="text-muted-foreground mt-2">
              Choose between boys or girls hostel
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Boys Hostel Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Boys Hostel</CardTitle>
                    <CardDescription>Accommodation for male students</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ 6 floors with 16 rooms each</li>
                    <li>✓ 2 students per room</li>
                    <li>✓ Common facilities available</li>
                    <li>✓ 24/7 security</li>
                  </ul>
                  <Button 
                    onClick={() => router.push('/dashboard/hostel?type=boys')}
                    className="w-full"
                  >
                    View Boys Hostel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Girls Hostel Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-accent">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <CardTitle>Girls Hostel</CardTitle>
                    <CardDescription>Accommodation for female students</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ 6 floors with 16 rooms each</li>
                    <li>✓ 2 students per room</li>
                    <li>✓ Common facilities available</li>
                    <li>✓ 24/7 security</li>
                  </ul>
                  <Button 
                    onClick={() => router.push('/dashboard/hostel?type=girls')}
                    className="w-full"
                    variant="outline"
                  >
                    View Girls Hostel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Button asChild variant="ghost">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
