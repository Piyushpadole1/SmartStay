"use client"

import { useEffect, useState } from "react"
import { getAllApplications } from "@/lib/firebase/firestore"
import type { Application } from "@/lib/types"
import { ApplicationsTable } from "@/components/admin/applications-table"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, CheckCircle, XCircle, Mars, Venus, AlertTriangle } from "lucide-react"

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  const fetchApplications = async () => {
    setLoading(true)
    const apps = await getAllApplications()
    setApplications(apps)
    setLoading(false)
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  // Separate applications by gender
  const boysApplications = applications.filter((app) => app.gender === "Male")
  const girlsApplications = applications.filter((app) => app.gender === "Female")
  const otherApplications = applications.filter((app) => app.gender === "other" || !app.gender)

  // Stats for Boys
  const boysStats = {
    total: boysApplications.length,
    pending: boysApplications.filter((a) => a.status === "pending").length,
    selected: boysApplications.filter((a) => a.status === "selected").length,
    confirmed: boysApplications.filter((a) => a.status === "confirmed").length,
    rejected: boysApplications.filter((a) => a.status === "rejected").length,
  }

  // Stats for Girls
  const girlsStats = {
    total: girlsApplications.length,
    pending: girlsApplications.filter((a) => a.status === "pending").length,
    selected: girlsApplications.filter((a) => a.status === "selected").length,
    confirmed: girlsApplications.filter((a) => a.status === "confirmed").length,
    rejected: girlsApplications.filter((a) => a.status === "rejected").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Applications</h1>
        <p className="text-muted-foreground">
          Review and manage hostel applications (separate sections for Boys & Girls)
        </p>
      </div>

      {/* Gender Tabs */}
      <Tabs defaultValue="boys" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="boys" className="flex items-center gap-2">
            <Mars className="h-4 w-4" />
            Boys Hostel
            <Badge variant="secondary" className="ml-2">{boysStats.total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="girls" className="flex items-center gap-2">
            <Venus className="h-4 w-4" />
            Girls Hostel
            <Badge variant="secondary" className="ml-2">{girlsStats.total}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Boys Applications Tab */}
        <TabsContent value="boys" className="space-y-6 mt-6">
          {/* Boys Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  Total Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-700">{boysStats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-700">{boysStats.pending}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Selected/Confirmed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-700">
                  {boysStats.selected + boysStats.confirmed}
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">{boysStats.rejected}</p>
              </CardContent>
            </Card>
          </div>

          {/* Boys Applications Table */}
          <div className="rounded-lg border border-blue-200 overflow-hidden">
            <div className="bg-blue-100 px-4 py-3 border-b border-blue-200">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                <Mars className="h-5 w-5" />
                Boys Hostel Applications
              </h3>
            </div>
            <div className="p-4">
              {boysApplications.length > 0 ? (
                <ApplicationsTable applications={boysApplications} onUpdate={fetchApplications} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No boys applications found
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Girls Applications Tab */}
        <TabsContent value="girls" className="space-y-6 mt-6">
          {/* Girls Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-pink-200 bg-pink-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-pink-600" />
                  Total Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-pink-700">{girlsStats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-700">{girlsStats.pending}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Selected/Confirmed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-700">
                  {girlsStats.selected + girlsStats.confirmed}
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">{girlsStats.rejected}</p>
              </CardContent>
            </Card>
          </div>

          {/* Girls Applications Table */}
          <div className="rounded-lg border border-pink-200 overflow-hidden">
            <div className="bg-pink-100 px-4 py-3 border-b border-pink-200">
              <h3 className="font-semibold text-pink-800 flex items-center gap-2">
                <Venus className="h-5 w-5" />
                Girls Hostel Applications
              </h3>
            </div>
            <div className="p-4">
              {girlsApplications.length > 0 ? (
                <ApplicationsTable applications={girlsApplications} onUpdate={fetchApplications} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No girls applications found
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Other/Gender Not Specified Warning */}
      {otherApplications.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Applications Without Gender
            </CardTitle>
            <CardContent className="pt-2">
              <p className="text-sm text-yellow-700">
                {otherApplications.length} application(s) have missing or unspecified gender. 
                Please ask students to update their applications.
              </p>
            </CardContent>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}