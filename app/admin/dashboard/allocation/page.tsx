"use client"

import { useEffect, useState } from "react"
import {
  getAllApplications,
  getSettings,
  batchUpdateApplications,
} from "@/lib/firebase/firestore"
import { allocateByBranchYear, getConfirmationDeadline } from "@/lib/utils/allocation"
import type { Application, Settings } from "@/lib/types"
import { BRANCHES, YEARS } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Play, Users, Award, Clock, RefreshCw, Venus, Mars } from "lucide-react"
import { Timestamp } from "firebase/firestore"

export default function AllocationPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [runningBoys, setRunningBoys] = useState(false)
  const [runningGirls, setRunningGirls] = useState(false)
  
  // Boys filters
  const [boysBranchFilter, setBoysBranchFilter] = useState<string>("all")
  const [boysYearFilter, setBoysYearFilter] = useState<string>("all")
  
  // Girls filters
  const [girlsBranchFilter, setGirlsBranchFilter] = useState<string>("all")
  const [girlsYearFilter, setGirlsYearFilter] = useState<string>("all")

  useEffect(() => {
    async function fetchData() {
      const [apps, s] = await Promise.all([getAllApplications(), getSettings()])
      setApplications(apps)
      setSettings(s)
      setLoading(false)
    }
    fetchData()
  }, [])

  // Boys applications
  const boysApps = applications.filter((a) => a.gender === "Male")
  const boysPending = boysApps.filter((a) => a.status === "pending")
  const boysSelected = boysApps.filter((a) => a.status === "selected")
  const boysWaitlisted = boysApps.filter((a) => a.status === "waitlisted")
  const boysConfirmed = boysApps.filter((a) => a.status === "confirmed")

  // Girls applications
  const girlsApps = applications.filter((a) => a.gender === "Female")
  const girlsPending = girlsApps.filter((a) => a.status === "pending")
  const girlsSelected = girlsApps.filter((a) => a.status === "selected")
  const girlsWaitlisted = girlsApps.filter((a) => a.status === "waitlisted")
  const girlsConfirmed = girlsApps.filter((a) => a.status === "confirmed")

  // Filtered results for Boys
  const filteredBoysApps = boysApps.filter((a) => {
    const matchesBranch = boysBranchFilter === "all" || a.branch === boysBranchFilter
    const matchesYear = boysYearFilter === "all" || a.year === parseInt(boysYearFilter)
    return matchesBranch && matchesYear && ["selected", "waitlisted", "confirmed"].includes(a.status)
  })

  // Filtered results for Girls
  const filteredGirlsApps = girlsApps.filter((a) => {
    const matchesBranch = girlsBranchFilter === "all" || a.branch === girlsBranchFilter
    const matchesYear = girlsYearFilter === "all" || a.year === parseInt(girlsYearFilter)
    return matchesBranch && matchesYear && ["selected", "waitlisted", "confirmed"].includes(a.status)
  })

  const runBoysAllocation = async () => {
    if (!settings) {
      toast.error("Please configure settings first")
      return
    }

    if (boysPending.length === 0) {
      toast.info("No pending boys applications to allocate")
      return
    }

    setRunningBoys(true)
    try {
      const boysSettings = {
        ...settings,
        seatDistribution: settings.seatDistributionBoys
      }

      const results = allocateByBranchYear(boysPending, boysSettings as Settings)
      const deadline = getConfirmationDeadline(settings)
      const updates: { id: string; data: Partial<Application> }[] = []

      for (const [key, result] of results) {
        for (const app of result.selected) {
          updates.push({
            id: app.id,
            data: {
              status: "selected",
              meritRank: app.meritRank,
              confirmationDeadline: Timestamp.fromDate(deadline),
            },
          })
        }
        for (const app of result.waitlisted) {
          updates.push({
            id: app.id,
            data: {
              status: "waitlisted",
              meritRank: app.meritRank,
            },
          })
        }
      }

      if (updates.length > 0) {
        await batchUpdateApplications(updates)
        toast.success(`Allocated ${updates.length} boys applications`)
        
        // Refresh data
        const apps = await getAllApplications()
        setApplications(apps)
      }
    } catch (error) {
      toast.error("Boys allocation failed")
    } finally {
      setRunningBoys(false)
    }
  }

  const runGirlsAllocation = async () => {
    if (!settings) {
      toast.error("Please configure settings first")
      return
    }

    if (girlsPending.length === 0) {
      toast.info("No pending girls applications to allocate")
      return
    }

    setRunningGirls(true)
    try {
      const girlsSettings = {
        ...settings,
        seatDistribution: settings.seatDistributionGirls
      }

      const results = allocateByBranchYear(girlsPending, girlsSettings as Settings)
      const deadline = getConfirmationDeadline(settings)
      const updates: { id: string; data: Partial<Application> }[] = []

      for (const [key, result] of results) {
        for (const app of result.selected) {
          updates.push({
            id: app.id,
            data: {
              status: "selected",
              meritRank: app.meritRank,
              confirmationDeadline: Timestamp.fromDate(deadline),
            },
          })
        }
        for (const app of result.waitlisted) {
          updates.push({
            id: app.id,
            data: {
              status: "waitlisted",
              meritRank: app.meritRank,
            },
          })
        }
      }

      if (updates.length > 0) {
        await batchUpdateApplications(updates)
        toast.success(`Allocated ${updates.length} girls applications`)
        
        // Refresh data
        const apps = await getAllApplications()
        setApplications(apps)
      }
    } catch (error) {
      toast.error("Girls allocation failed")
    } finally {
      setRunningGirls(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Seat Allocation</h1>
        <p className="text-muted-foreground">
          Manage hostel seat allocation separately for Boys and Girls
        </p>
      </div>

      {/* ==================== BOYS SECTION ==================== */}
      <div className="space-y-4 border rounded-lg p-6 bg-blue-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mars className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-blue-700">Boys Hostel</h2>
              <p className="text-sm text-muted-foreground">Seat allocation for male students</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={runningBoys || boysPending.length === 0}
              >
                {runningBoys ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Boys Allocation
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Boys Seat Allocation</AlertDialogTitle>
                <AlertDialogDescription>
                  This will run the merit-based allocation algorithm for BOYS hostel.
                  <br /><br />
                  <strong>Pending applications:</strong> {boysPending.length}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={runBoysAllocation}>
                  Run Allocation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Boys Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{boysPending.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500" />
                Selected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{boysSelected.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                Waitlisted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{boysWaitlisted.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-emerald-500" />
                Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{boysConfirmed.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Boys Results Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Boys Allocation Results</CardTitle>
                <CardDescription>View selected and waitlisted male students</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={boysBranchFilter} onValueChange={setBoysBranchFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {BRANCHES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={boysYearFilter} onValueChange={setBoysYearFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredBoysApps.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoysApps
                    .sort((a, b) => (a.meritRank || 999) - (b.meritRank || 999))
                    .map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <span className="font-mono">#{app.meritRank || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.fullName}</p>
                            <p className="text-xs text-muted-foreground">{app.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{app.branch}</TableCell>
                        <TableCell>{app.year}</TableCell>
                        <TableCell>{app.category}</TableCell>
                        <TableCell>
                          {app.admissionType === "CET" ? app.cetMarks : app.sgpa}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              app.status === "selected"
                                ? "bg-blue-100 text-blue-800"
                                : app.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-indigo-100 text-indigo-800"
                            }
                          >
                            {app.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No boys allocation results yet. Run allocation to see results.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ==================== GIRLS SECTION ==================== */}
      <div className="space-y-4 border rounded-lg p-6 bg-pink-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Venus className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-pink-700">Girls Hostel</h2>
              <p className="text-sm text-muted-foreground">Seat allocation for female students</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="bg-pink-600 hover:bg-pink-700"
                disabled={runningGirls || girlsPending.length === 0}
              >
                {runningGirls ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Girls Allocation
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Girls Seat Allocation</AlertDialogTitle>
                <AlertDialogDescription>
                  This will run the merit-based allocation algorithm for GIRLS hostel.
                  <br /><br />
                  <strong>Pending applications:</strong> {girlsPending.length}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={runGirlsAllocation}>
                  Run Allocation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Girls Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{girlsPending.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500" />
                Selected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{girlsSelected.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                Waitlisted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{girlsWaitlisted.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-emerald-500" />
                Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{girlsConfirmed.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Girls Results Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Girls Allocation Results</CardTitle>
                <CardDescription>View selected and waitlisted female students</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={girlsBranchFilter} onValueChange={setGirlsBranchFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {BRANCHES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={girlsYearFilter} onValueChange={setGirlsYearFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredGirlsApps.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGirlsApps
                    .sort((a, b) => (a.meritRank || 999) - (b.meritRank || 999))
                    .map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <span className="font-mono">#{app.meritRank || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.fullName}</p>
                            <p className="text-xs text-muted-foreground">{app.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{app.branch}</TableCell>
                        <TableCell>{app.year}</TableCell>
                        <TableCell>{app.category}</TableCell>
                        <TableCell>
                          {app.admissionType === "CET" ? app.cetMarks : app.sgpa}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              app.status === "selected"
                                ? "bg-blue-100 text-blue-800"
                                : app.status === "confirmed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-indigo-100 text-indigo-800"
                            }
                          >
                            {app.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No girls allocation results yet. Run allocation to see results.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}