"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { toast } from "sonner"
import {
  Flag,
  ThumbsUp,
  RefreshCw,
  ThumbsDown,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  FileText,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Bell,
  Send,
  Eye,
  Filter,
  Search,
  Download,
  AlertTriangle,
  CheckSquare,
  ListTodo,
  Flame,
  Droplet,
  Wifi,
  Zap,
  AlertCircle,
  Frown,
  Meh,
  Smile,
  Shield,
} from "lucide-react"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/components/auth/auth-provider"
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore"

// Types
interface Complaint {
  id: string
  title: string
  description: string
  userId: string
  userName?: string
  roomNumber?: string
  status: "pending" | "in-progress" | "resolved" | "rejected"
  priority: "high" | "medium" | "low"
  upvotes: number
  downvotes: number
  imageBase64?: string
  createdAt: Timestamp
  resolvedAt?: Timestamp
}

interface LeaveApplication {
  id: string
  userId: string
  userName?: string
  roomNumber?: string
  fromDate: Timestamp
  toDate: Timestamp
  reason: string
  status: "pending" | "approved" | "rejected"
  documentUrl?: string
  wardenRemarks?: string
  appliedAt: Timestamp
  respondedAt?: Timestamp
}

interface Attendance {
  id: string
  userId: string
  userName?: string
  date: string
  status: "present" | "absent" | "late"
  checkInTime?: string
  checkOutTime?: string
}

interface Announcement {
  id: string
  title: string
  content: string
  priority: "high" | "medium" | "low"
  createdBy: string
  createdAt: Timestamp
  expiresAt?: Timestamp
  targetAudience: "all" | "boys" | "girls"
}

interface User {
  uid: string
  email: string
  fullName?: string
  roomNumber?: string
  gender?: string
}

// Priority icons mapping with safe fallback
const priorityIcons = {
  high: { icon: Flame, color: "text-red-600", label: "Urgent" },
  medium: { icon: AlertCircle, color: "text-yellow-600", label: "Medium" },
  low: { icon: Smile, color: "text-green-600", label: "Low" },
  default: { icon: AlertCircle, color: "text-gray-600", label: "Unknown" }
}

// Category based on complaint title/content
const getComplaintCategory = (title: string, description: string): string => {
  const text = ((title || "") + " " + (description || "")).toLowerCase()
  
  if (text.includes("water") || text.includes("leak") || text.includes("tap") || text.includes("bathroom") || text.includes("toilet")) {
    return "Water & Plumbing"
  }
  if (text.includes("electric") || text.includes("light") || text.includes("fan") || text.includes("power") || text.includes("switch") || text.includes("plug")) {
    return "Electricity"
  }
  if (text.includes("wifi") || text.includes("internet") || text.includes("network") || text.includes("connection")) {
    return "WiFi & Internet"
  }
  if (text.includes("furniture") || text.includes("bed") || text.includes("table") || text.includes("chair") || text.includes("almirah") || text.includes("cupboard")) {
    return "Furniture"
  }
  if (text.includes("clean") || text.includes("dirty") || text.includes("garbage") || text.includes("dust") || text.includes("mosquito") || text.includes("pest")) {
    return "Cleaning & Hygiene"
  }
  if (text.includes("food") || text.includes("mess") || text.includes("canteen") || text.includes("meal")) {
    return "Food & Mess"
  }
  if (text.includes("security") || text.includes("safety") || text.includes("gate") || text.includes("entry")) {
    return "Security"
  }
  if (text.includes("noise") || text.includes("loud") || text.includes("disturb") || text.includes("music")) {
    return "Noise Complaint"
  }
  if (text.includes("staff") || text.includes("warden") || text.includes("behavior") || text.includes("misconduct")) {
    return "Staff Related"
  }
  return "Other"
}

// Get category icon and color
const getCategoryStyle = (category: string) => {
  switch (category) {
    case "Water & Plumbing":
      return { icon: Droplet, color: "bg-blue-100 text-blue-700" }
    case "Electricity":
      return { icon: Zap, color: "bg-yellow-100 text-yellow-700" }
    case "WiFi & Internet":
      return { icon: Wifi, color: "bg-indigo-100 text-indigo-700" }
    case "Furniture":
      return { icon: CheckSquare, color: "bg-orange-100 text-orange-700" }
    case "Cleaning & Hygiene":
      return { icon: CheckCircle, color: "bg-emerald-100 text-emerald-700" }
    case "Food & Mess":
      return { icon: TrendingUp, color: "bg-rose-100 text-rose-700" }
    case "Security":
      return { icon: Shield, color: "bg-purple-100 text-purple-700" }
    case "Noise Complaint":
      return { icon: AlertTriangle, color: "bg-amber-100 text-amber-700" }
    case "Staff Related":
      return { icon: User, color: "bg-slate-100 text-slate-700" }
    default:
      return { icon: MessageSquare, color: "bg-gray-100 text-gray-700" }
  }
}

export default function TasksPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("complaints")
  const [loading, setLoading] = useState(true)
  
  // Complaints state
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [complaintFilter, setComplaintFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [complaintSearch, setComplaintSearch] = useState("")
  const [sortBy, setSortBy] = useState<"upvotes" | "downvotes" | "recent">("recent")
  
  // Leaves state
  const [leaves, setLeaves] = useState<LeaveApplication[]>([])
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null)
  const [leaveFilter, setLeaveFilter] = useState("all")
  
  // Attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>("all")
  const [attendanceStats, setAttendanceStats] = useState<any>({})
  const [users, setUsers] = useState<User[]>([])
  
  // Announcement state
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    priority: "medium" as "high" | "medium" | "low",
    targetAudience: "all" as "all" | "boys" | "girls",
    expiresIn: 7,
  })
  const [submitting, setSubmitting] = useState(false)

  // Extract unique categories from complaints
  const categories = ["all", ...new Set(complaints.map(c => getComplaintCategory(c.title || "", c.description || "")))]

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchUsers(),
        fetchComplaints(),
        fetchLeaves(),
        fetchAttendance(),
        fetchAnnouncements(),
      ])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "users")
      const snapshot = await getDocs(usersRef)
      const usersList = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[]
      setUsers(usersList)
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchComplaints = async () => {
    try {
      const complaintsRef = collection(db, "complaints")
      const snapshot = await getDocs(complaintsRef)
      const complaintsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Complaint[]
      
      // Enrich with user names
      const enrichedComplaints = complaintsList.map(complaint => ({
        ...complaint,
        userName: users.find(u => u.uid === complaint.userId)?.fullName || complaint.userId,
        roomNumber: users.find(u => u.uid === complaint.userId)?.roomNumber,
        priority: complaint.priority || "medium",
        status: complaint.status || "pending",
        upvotes: complaint.upvotes || 0,
        downvotes: complaint.downvotes || 0,
      }))
      
      setComplaints(enrichedComplaints)
    } catch (error) {
      console.error("Error fetching complaints:", error)
    }
  }

  const fetchLeaves = async () => {
    try {
      const leavesRef = collection(db, "leave_applications")
      const snapshot = await getDocs(leavesRef)
      const leavesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveApplication[]
      
      const enrichedLeaves = leavesList.map(leave => ({
        ...leave,
        userName: users.find(u => u.uid === leave.userId)?.fullName || leave.userId,
        roomNumber: users.find(u => u.uid === leave.userId)?.roomNumber,
      }))
      
      setLeaves(enrichedLeaves)
    } catch (error) {
      console.error("Error fetching leaves:", error)
    }
  }

  const fetchAttendance = async () => {
    try {
      const attendanceRef = collection(db, "attendance")
      const snapshot = await getDocs(attendanceRef)
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Attendance[]
      
      const enrichedRecords = records.map(record => ({
        ...record,
        userName: users.find(u => u.uid === record.userId)?.fullName || record.userId,
      }))
      
      setAttendanceRecords(enrichedRecords)
      calculateAttendanceStats(enrichedRecords)
    } catch (error) {
      console.error("Error fetching attendance:", error)
    }
  }

  const calculateAttendanceStats = (records: Attendance[]) => {
    const stats: any = {}
    records.forEach(record => {
      if (!stats[record.userId]) {
        stats[record.userId] = {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          percentage: 0,
        }
      }
      stats[record.userId].total++
      stats[record.userId][record.status]++
      stats[record.userId].percentage = (stats[record.userId].present / stats[record.userId].total) * 100
    })
    setAttendanceStats(stats)
  }

  const fetchAnnouncements = async () => {
    try {
      const announcementsRef = collection(db, "announcements")
      const q = query(announcementsRef, orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)
      const announcementsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[]
      setAnnouncements(announcementsList)
    } catch (error) {
      console.error("Error fetching announcements:", error)
    }
  }

  const updateComplaintStatus = async (complaintId: string, status: Complaint["status"]) => {
    try {
      await updateDoc(doc(db, "complaints", complaintId), {
        status,
        resolvedAt: status === "resolved" ? Timestamp.now() : null,
      })
      toast.success(`Complaint marked as ${status}`)
      fetchComplaints()
    } catch (error) {
      console.error("Error updating complaint:", error)
      toast.error("Failed to update complaint")
    }
  }

  const updateLeaveStatus = async (leaveId: string, status: LeaveApplication["status"], remarks: string) => {
    try {
      await updateDoc(doc(db, "leave_applications", leaveId), {
        status,
        wardenRemarks: remarks,
        respondedAt: Timestamp.now(),
      })
      toast.success(`Leave ${status}`)
      fetchLeaves()
      setSelectedLeave(null)
    } catch (error) {
      console.error("Error updating leave:", error)
      toast.error("Failed to update leave")
    }
  }

  const createAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      toast.error("Please fill all fields")
      return
    }

    setSubmitting(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + newAnnouncement.expiresIn)

      await addDoc(collection(db, "announcements"), {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        priority: newAnnouncement.priority,
        targetAudience: newAnnouncement.targetAudience,
        createdBy: user?.email || "admin",
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
      })
      
      toast.success("Announcement sent successfully")
      setShowAnnouncementDialog(false)
      setNewAnnouncement({
        title: "",
        content: "",
        priority: "medium",
        targetAudience: "all",
        expiresIn: 7,
      })
      fetchAnnouncements()
    } catch (error) {
      console.error("Error creating announcement:", error)
      toast.error("Failed to create announcement")
    } finally {
      setSubmitting(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-700 border-red-200"
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "low": return "bg-green-100 text-green-700 border-green-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700"
      case "in-progress": return "bg-blue-100 text-blue-700"
      case "resolved": return "bg-green-100 text-green-700"
      case "approved": return "bg-green-100 text-green-700"
      case "rejected": return "bg-red-100 text-red-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  // Filter and sort complaints
  const filteredComplaints = complaints
    .filter(c => {
      if (complaintFilter !== "all" && c.status !== complaintFilter) return false
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false
      if (categoryFilter !== "all") {
        const complaintCategory = getComplaintCategory(c.title || "", c.description || "")
        if (complaintCategory !== categoryFilter) return false
      }
      if (complaintSearch && !(c.title || "").toLowerCase().includes(complaintSearch.toLowerCase()) && 
          !(c.description || "").toLowerCase().includes(complaintSearch.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === "upvotes") return (b.upvotes || 0) - (a.upvotes || 0)
      if (sortBy === "downvotes") return (b.downvotes || 0) - (a.downvotes || 0)
      // recent
      return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
    })

  const filteredLeaves = leaves.filter(l => {
    if (leaveFilter !== "all" && l.status !== leaveFilter) return false
    return true
  })

  // Group complaints by priority for summary
  const highPriorityCount = complaints.filter(c => c.priority === "high" && c.status !== "resolved").length
  const mediumPriorityCount = complaints.filter(c => c.priority === "medium" && c.status !== "resolved").length
  const lowPriorityCount = complaints.filter(c => c.priority === "low" && c.status !== "resolved").length

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
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ListTodo className="h-8 w-8" />
          Admin Management Dashboard
        </h1>
        <p className="text-muted-foreground">Manage complaints, leaves, attendance, and announcements</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="complaints" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Complaints ({complaints.length})
          </TabsTrigger>
          <TabsTrigger value="leaves" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Leave Applications ({leaves.length})
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Announcements ({announcements.length})
          </TabsTrigger>
        </TabsList>

        {/* ==================== COMPLAINTS SECTION ==================== */}
        <TabsContent value="complaints" className="space-y-6 mt-6">
          {/* Priority Summary Cards - INSIDE complaints tab */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                  <Flame className="h-4 w-4" />
                  High Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">{highPriorityCount}</p>
                <p className="text-xs text-muted-foreground">Urgent issues needing immediate attention</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-700">
                  <AlertCircle className="h-4 w-4" />
                  Medium Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-700">{mediumPriorityCount}</p>
                <p className="text-xs text-muted-foreground">Important but not urgent</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
                  <Smile className="h-4 w-4" />
                  Low Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-700">{lowPriorityCount}</p>
                <p className="text-xs text-muted-foreground">Can be addressed later</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Student Complaints</CardTitle>
                  <CardDescription>Review and manage student complaints</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search complaints..."
                      value={complaintSearch}
                      onChange={(e) => setComplaintSearch(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High (Urgent)</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat === "all" ? "All Categories" : cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={complaintFilter} onValueChange={setComplaintFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most Recent</SelectItem>
                      <SelectItem value="upvotes">Most Upvoted</SelectItem>
                      <SelectItem value="downvotes">Most Downvoted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredComplaints.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No complaints found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredComplaints.map((complaint) => {
                    const complaintCategory = getComplaintCategory(complaint.title || "", complaint.description || "")
                    const categoryStyle = getCategoryStyle(complaintCategory)
                    const CategoryIcon = categoryStyle.icon
                    const priorityConfig = priorityIcons[complaint.priority] || priorityIcons.default
                    const PriorityIcon = priorityConfig.icon
                    
                    return (
                      <div
                        key={complaint.id}
                        className="p-4 rounded-lg border hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="font-semibold">{complaint.title || "Untitled"}</h3>
                              <Badge className={getPriorityColor(complaint.priority || "low")}>
                                <PriorityIcon className="h-3 w-3 mr-1" />
                                {priorityConfig.label}
                              </Badge>
                              <Badge className={categoryStyle.color}>
                                <CategoryIcon className="h-3 w-3 mr-1" />
                                {complaintCategory}
                              </Badge>
                              <Badge className={getStatusColor(complaint.status || "pending")}>
                                {complaint.status === "in-progress" ? "In Progress" : (complaint.status || "pending")}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{complaint.description || "No description"}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {complaint.userName || complaint.userId} {complaint.roomNumber && `(Room ${complaint.roomNumber})`}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {complaint.createdAt?.toDate().toLocaleDateString() || "Unknown date"}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-green-600">
                                  <ThumbsUp className="h-3 w-3" />
                                  {complaint.upvotes || 0}
                                </div>
                                <div className="flex items-center gap-1 text-red-600">
                                  <ThumbsDown className="h-3 w-3" />
                                  {complaint.downvotes || 0}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {complaint.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600"
                                  onClick={() => updateComplaintStatus(complaint.id, "in-progress")}
                                >
                                  Start
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600"
                                  onClick={() => updateComplaintStatus(complaint.id, "resolved")}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Resolve
                                </Button>
                              </>
                            )}
                            {complaint.status === "in-progress" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => updateComplaintStatus(complaint.id, "resolved")}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Resolved
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedComplaint(complaint)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== LEAVE APPLICATIONS SECTION ==================== */}
        <TabsContent value="leaves" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leave Applications</CardTitle>
                  <CardDescription>Review and approve student leave requests</CardDescription>
                </div>
                <Select value={leaveFilter} onValueChange={setLeaveFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredLeaves.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leave applications found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLeaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="p-4 rounded-lg border hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold">{leave.userName}</h3>
                            <Badge className={getStatusColor(leave.status)}>
                              {leave.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{leave.reason}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              From: {leave.fromDate?.toDate().toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              To: {leave.toDate?.toDate().toLocaleDateString()}
                            </div>
                            {leave.roomNumber && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Room: {leave.roomNumber}
                              </div>
                            )}
                          </div>
                          {leave.wardenRemarks && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Remarks: {leave.wardenRemarks}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {leave.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => setSelectedLeave(leave)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedLeave(leave)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

       {/* ==================== ATTENDANCE SECTION ==================== */}
<TabsContent value="attendance" className="space-y-6 mt-6">
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>Student Attendance</CardTitle>
          <CardDescription>View attendance records and statistics</CardDescription>
        </div>
        <div className="flex gap-2">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {users.map((student) => (
                <SelectItem key={student.uid} value={student.uid}>
                  {student.fullName || student.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchAttendance()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">
      {selectedStudent === "all" ? (
        // Overall statistics for all students
        <div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.filter(student => attendanceStats[student.uid] && attendanceStats[student.uid].total > 0).map((student) => {
              const stats = attendanceStats[student.uid]
              if (!stats || stats.total === 0) return null
              return (
                <Card key={student.uid} className="border hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {student.fullName || student.email?.split('@')[0] || 'Unknown'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Room: {student.roomNumber || "Not assigned"} | ID: {student.uid?.slice(-6)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Attendance Rate</span>
                        <span className={`font-semibold ${
                          stats.percentage >= 75 ? "text-green-600" : 
                          stats.percentage >= 60 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {stats.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            stats.percentage >= 75 ? "bg-green-500" : 
                            stats.percentage >= 60 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-2">
                        <div className="bg-green-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-green-600">{stats.present || 0}</p>
                          <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-yellow-600">{stats.late || 0}</p>
                          <p className="text-xs text-muted-foreground">Late</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-red-600">{stats.absent || 0}</p>
                          <p className="text-xs text-muted-foreground">Absent</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          {users.filter(student => attendanceStats[student.uid] && attendanceStats[student.uid].total > 0).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records found</p>
              <p className="text-sm">Students need to mark their attendance first</p>
            </div>
          )}
        </div>
      ) : (
        // Individual student attendance
        (() => {
          const student = users.find(u => u.uid === selectedStudent)
          const studentRecords = attendanceRecords.filter(r => r.userId === selectedStudent)
          const stats = attendanceStats[selectedStudent]
          
          // Sort records by date (newest first)
          const sortedRecords = [...studentRecords].sort((a, b) => {
            const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date)
            const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date)
            return dateB.getTime() - dateA.getTime()
          })
          
          return (
            <div className="space-y-6">
              {/* Student Info Card */}
              <Card className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">{student?.fullName || 'Student'}</h3>
                      <p className="text-sm text-muted-foreground">
                        Room: {student?.roomNumber || 'Not assigned'} | Email: {student?.email || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Overall Attendance</p>
                      <p className={`text-3xl font-bold ${
                        (stats?.percentage || 0) >= 75 ? "text-green-600" : 
                        (stats?.percentage || 0) >= 60 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {(stats?.percentage || 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      Present
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-700">{stats?.present || 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-700">
                      <Clock className="h-4 w-4" />
                      Late
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-700">{stats?.late || 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                      <XCircle className="h-4 w-4" />
                      Absent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-700">{stats?.absent || 0}</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Attendance Progress Bar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Target: 75%</span>
                      <span>Current: {(stats?.percentage || 0).toFixed(1)}%</span>
                    </div>
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (stats?.percentage || 0) >= 75 ? "bg-green-500" : 
                          (stats?.percentage || 0) >= 60 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(stats?.percentage || 0, 100)}%` }}
                      />
                    </div>
                    {(stats?.percentage || 0) < 75 && (
                      <p className="text-xs text-amber-600 mt-2">
                        ⚠️ Attendance below 75%. Need {(75 - (stats?.percentage || 0)).toFixed(1)}% more to reach target.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Recent Attendance Records Table */}
              {/* Recent Attendance Records Table */}
<div className="rounded-lg border">
  <div className="bg-muted/30 px-4 py-3 border-b">
    <h3 className="font-semibold flex items-center gap-2">
      <Calendar className="h-4 w-4" />
      Recent Attendance Records
    </h3>
  </div>
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Check In Time</TableHead>
          <TableHead>Check Out Time</TableHead>
          <TableHead>Remarks</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRecords.length > 0 ? (
          sortedRecords.slice(0, 30).map((record) => {
            // Format date safely
            let formattedDate = "Unknown"
            if (record.date) {
              if (record.date instanceof Timestamp) {
                formattedDate = record.date.toDate().toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })
              } else if (typeof record.date === 'string') {
                formattedDate = new Date(record.date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })
              }
            }
            
            // Format check-in time safely
            let formattedCheckIn = "--:--"
            if (record.checkInTime) {
              if (record.checkInTime instanceof Timestamp) {
                formattedCheckIn = record.checkInTime.toDate().toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              } else if (typeof record.checkInTime === 'string') {
                formattedCheckIn = record.checkInTime
              }
            }
            
            // Format check-out time safely
            let formattedCheckOut = "--:--"
            if (record.checkOutTime) {
              if (record.checkOutTime instanceof Timestamp) {
                formattedCheckOut = record.checkOutTime.toDate().toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              } else if (typeof record.checkOutTime === 'string') {
                formattedCheckOut = record.checkOutTime
              }
            }
            
            return (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{formattedDate}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(record.status)}>
                    {record.status === "present" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {record.status === "late" && <Clock className="h-3 w-3 mr-1" />}
                    {record.status === "absent" && <XCircle className="h-3 w-3 mr-1" />}
                    {record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : "Unknown"}
                  </Badge>
                </TableCell>
                <TableCell>{formattedCheckIn}</TableCell>
                <TableCell>{formattedCheckOut}</TableCell>
                <TableCell className="text-muted-foreground">
                  {record.status === "late" ? "Arrived late" : 
                   record.status === "absent" ? "Not marked" : 
                   record.status === "present" ? "On time" : "-"}
                </TableCell>
              </TableRow>
            )
          })
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No attendance records found for this student
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
</div>
            </div>
          )
        })()
      )}
    </CardContent>
  </Card>
</TabsContent>
        {/* ==================== ANNOUNCEMENTS SECTION ==================== */}
        <TabsContent value="announcements" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Announcements</CardTitle>
                  <CardDescription>Create and manage announcements for students</CardDescription>
                </div>
                <Button onClick={() => setShowAnnouncementDialog(true)} className="gap-2">
                  <Bell className="h-4 w-4" />
                  New Announcement
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No announcements yet</p>
                  <p className="text-sm">Click "New Announcement" to create one</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="p-4 rounded-lg border hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold">{announcement.title}</h3>
                            <Badge className={getPriorityColor(announcement.priority)}>
                              {announcement.priority}
                            </Badge>
                            <Badge variant="outline">
                              {announcement.targetAudience === "all" ? "All Students" : 
                               announcement.targetAudience === "boys" ? "Boys Hostel" : "Girls Hostel"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              By: {announcement.createdBy}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {announcement.createdAt?.toDate().toLocaleDateString()}
                            </div>
                            {announcement.expiresAt && (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Expires: {announcement.expiresAt.toDate().toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rest of the dialogs remain the same */}
      {/* Complaint Detail Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complaint Details</DialogTitle>
            <DialogDescription>View and manage complaint</DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <p className="text-sm">{selectedComplaint.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">{selectedComplaint.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Student</label>
                  <p className="text-sm">{selectedComplaint.userName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Room</label>
                  <p className="text-sm">{selectedComplaint.roomNumber || "N/A"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Badge className={getPriorityColor(selectedComplaint.priority)}>
                    {selectedComplaint.priority}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge className={getStatusColor(selectedComplaint.status)}>
                    {selectedComplaint.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Votes</label>
                <div className="flex gap-4 mt-1">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                    <span>{selectedComplaint.upvotes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsDown className="h-4 w-4 text-red-600" />
                    <span>{selectedComplaint.downvotes || 0}</span>
                  </div>
                </div>
              </div>
              {selectedComplaint.imageBase64 && (
                <div>
                  <label className="text-sm font-medium">Attached Image</label>
                  <img 
                    src={selectedComplaint.imageBase64} 
                    alt="Complaint attachment" 
                    className="mt-2 rounded-lg border max-h-48 object-cover"
                  />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
                  Close
                </Button>
                {selectedComplaint.status !== "resolved" && (
                  <Button onClick={() => updateComplaintStatus(selectedComplaint.id, "resolved")}>
                    Mark as Resolved
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Review Dialog */}
      <Dialog open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave Application Review</DialogTitle>
            <DialogDescription>Review and respond to leave request</DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Student</label>
                <p className="text-sm">{selectedLeave.userName}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Room Number</label>
                <p className="text-sm">{selectedLeave.roomNumber || "N/A"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">From Date</label>
                  <p className="text-sm">{selectedLeave.fromDate?.toDate().toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">To Date</label>
                  <p className="text-sm">{selectedLeave.toDate?.toDate().toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <p className="text-sm text-muted-foreground">{selectedLeave.reason}</p>
              </div>
              {selectedLeave.documentUrl && (
                <div>
                  <label className="text-sm font-medium">Supporting Document</label>
                  <Button variant="outline" size="sm" className="mt-1" asChild>
                    <a href={selectedLeave.documentUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      View Document
                    </a>
                  </Button>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Warden Remarks</label>
                <Textarea
                  id="remarks"
                  placeholder="Add your remarks..."
                  className="mt-1"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedLeave(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    const remarks = (document.getElementById("remarks") as HTMLTextAreaElement)?.value || ""
                    updateLeaveStatus(selectedLeave.id, "approved", remarks)
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const remarks = (document.getElementById("remarks") as HTMLTextAreaElement)?.value || ""
                    updateLeaveStatus(selectedLeave.id, "rejected", remarks)
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Announcement</DialogTitle>
            <DialogDescription>Send announcement to students</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                placeholder="Enter announcement title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content *</label>
              <Textarea
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                placeholder="Enter announcement content"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={newAnnouncement.priority}
                  onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, priority: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Target Audience</label>
                <Select
                  value={newAnnouncement.targetAudience}
                  onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, targetAudience: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="boys">Boys Hostel Only</SelectItem>
                    <SelectItem value="girls">Girls Hostel Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Expires In (Days)</label>
              <Input
                type="number"
                min={1}
                max={30}
                value={newAnnouncement.expiresIn}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expiresIn: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createAnnouncement} disabled={submitting} className="gap-2">
              {submitting ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              Send Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}