"use client"

import { useEffect, useState } from "react"
import {
  getAllRooms,
  getAllApplications,
  assignRoom,
  updateApplication,
  getAvailableRooms,
  getRoomStats,
} from "@/lib/firebase/firestore"
import type { Room, Application } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { RoomGrid } from "@/components/admin/room-grid"
import { toast } from "sonner"
import { BedDouble, Users, Building2, Wand2, Mars, Venus } from "lucide-react"

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [assigning, setAssigning] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [activeHostel, setActiveHostel] = useState<"boys" | "girls">("boys")

  const fetchData = async () => {
    const [roomData, appData] = await Promise.all([
      getAllRooms(),
      getAllApplications(),
    ])
    setRooms(roomData)
    setApplications(appData)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter rooms by hostel type
  const boysRooms = rooms.filter((r) => r.hostelType === "boys" || !r.hostelType)
  const girlsRooms = rooms.filter((r) => r.hostelType === "girls")

  // Filter applications by gender
  const boysApplications = applications.filter((a) => a.gender === "Male")
  const girlsApplications = applications.filter((a) => a.gender === "Female")

  const getConfirmedWithoutRoom = (gender: "Male" | "Female") => {
    return applications.filter(
      (a) => a.status === "confirmed" && !a.roomNumber && a.gender === gender
    )
  }

  const boysConfirmedWithoutRoom = getConfirmedWithoutRoom("Male")
  const girlsConfirmedWithoutRoom = getConfirmedWithoutRoom("Female")

  const getStats = (roomsList: Room[]) => {
    return {
      total: roomsList.length,
      available: roomsList.filter((r) => r.status === "available").length,
      partial: roomsList.filter((r) => r.status === "partial").length,
      full: roomsList.filter((r) => r.status === "full").length,
      totalCapacity: roomsList.reduce((acc, r) => acc + r.capacity, 0),
      occupied: roomsList.reduce((acc, r) => acc + r.occupants.length, 0),
    }
  }

  const boysStats = getStats(boysRooms)
  const girlsStats = getStats(girlsRooms)

  const getRoomsByFloor = (floor: number, hostelType: "boys" | "girls") => {
    return rooms.filter((r) => r.floor === floor && r.hostelType === hostelType)
  }

  const handleAssign = async () => {
    if (!selectedRoom || !selectedStudent) return

    setAssigning(true)
    try {
      const success = await assignRoom(selectedRoom.roomNumber, selectedStudent)
      if (success) {
        await updateApplication(selectedStudent, {
          roomNumber: selectedRoom.roomNumber,
          floor: selectedRoom.floor,
        })
        toast.success("Room assigned successfully")
        await fetchData()
        setSelectedRoom(null)
        setSelectedStudent("")
      } else {
        toast.error("Room is full")
      }
    } catch (error) {
      toast.error("Failed to assign room")
    } finally {
      setAssigning(false)
    }
  }

  const handleAutoAssign = async (hostelType: "boys" | "girls") => {
    setAutoAssigning(true)
    try {
      const confirmedWithoutRoomList = hostelType === "boys" ? boysConfirmedWithoutRoom : girlsConfirmedWithoutRoom
      const roomsList = hostelType === "boys" ? boysRooms : girlsRooms
      
      const availableRooms = roomsList
        .filter((r) => r.status !== "full")
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))

      let assigned = 0
      let roomIndex = 0

      for (const student of confirmedWithoutRoomList) {
        while (roomIndex < availableRooms.length) {
          const room = availableRooms[roomIndex]
          if (room.occupants.length < room.capacity) {
            const success = await assignRoom(room.roomNumber, student.id)
            if (success) {
              await updateApplication(student.id, {
                roomNumber: room.roomNumber,
                floor: room.floor,
              })
              room.occupants.push(student.id)
              assigned++
            }
            break
          }
          roomIndex++
        }
      }

      toast.success(`Auto-assigned ${assigned} ${hostelType === "boys" ? "boys" : "girls"} to rooms`)
      await fetchData()
    } catch (error) {
      toast.error("Auto-assignment failed")
    } finally {
      setAutoAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Room Management</h1>
          <p className="text-muted-foreground">Manage hostel room assignments</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Rooms Initialized</h3>
            <p className="text-muted-foreground mb-4">
              Go to Settings to initialize the room database.
            </p>
            <Button asChild>
              <a href="/admin/dashboard/settings">Go to Settings</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Room Management</h1>
        <p className="text-muted-foreground">Manage hostel room assignments for both hostels</p>
      </div>

      {/* Hostel Tabs */}
      <Tabs defaultValue="boys" className="w-full" onValueChange={(v) => setActiveHostel(v as "boys" | "girls")}>
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

        {/* Boys Hostel Tab */}
        <TabsContent value="boys" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-blue-700 flex items-center gap-2">
                <Mars className="h-5 w-5" />
                Boys Hostel
              </h2>
            </div>
            {boysConfirmedWithoutRoom.length > 0 && (
              <Button 
                onClick={() => handleAutoAssign("boys")} 
                disabled={autoAssigning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {autoAssigning ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Auto-Assign ({boysConfirmedWithoutRoom.length})
              </Button>
            )}
          </div>

          {/* Boys Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Total Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-700">{boysStats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Available
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-700">{boysStats.available}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Partial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-700">{boysStats.partial}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Full
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">{boysStats.full}</p>
              </CardContent>
            </Card>
          </div>

          {/* Boys Occupancy */}
          <Card>
            <CardHeader>
              <CardTitle>Boys Hostel Occupancy</CardTitle>
              <CardDescription>
                {boysStats.occupied} of {boysStats.totalCapacity} beds occupied (
                {Math.round((boysStats.occupied / boysStats.totalCapacity) * 100)}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-4 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${(boysStats.occupied / boysStats.totalCapacity) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Boys Room Layout */}
          <Card>
            <CardHeader>
              <CardTitle>Boys Hostel Room Layout</CardTitle>
              <CardDescription>
                Click on a room to view details or assign students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="1">
                <TabsList className="grid grid-cols-6 mb-4">
                  {[1, 2, 3, 4, 5, 6].map((floor) => {
                    const hasRooms = getRoomsByFloor(floor, "boys").length > 0
                    return (
                      <TabsTrigger key={floor} value={floor.toString()} disabled={!hasRooms}>
                        Floor {floor}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
                {[1, 2, 3, 4, 5, 6].map((floor) => (
                  <TabsContent key={floor} value={floor.toString()}>
                    <RoomGrid
                      rooms={boysRooms}
                      applications={boysApplications}
                      floor={floor}
                      onRoomClick={setSelectedRoom}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Unassigned Boys Students */}
          {boysConfirmedWithoutRoom.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50/30">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Users className="h-5 w-5" />
                  Boys Awaiting Room Assignment
                </CardTitle>
                <CardDescription>
                  {boysConfirmedWithoutRoom.length} confirmed boys students without rooms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {boysConfirmedWithoutRoom.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{student.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.branch} - Year {student.year}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-blue-300">Pending</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Girls Hostel Tab */}
        <TabsContent value="girls" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-pink-700 flex items-center gap-2">
                <Venus className="h-5 w-5" />
                Girls Hostel
              </h2>
            </div>
            {girlsConfirmedWithoutRoom.length > 0 && (
              <Button 
                onClick={() => handleAutoAssign("girls")} 
                disabled={autoAssigning}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {autoAssigning ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Auto-Assign ({girlsConfirmedWithoutRoom.length})
              </Button>
            )}
          </div>

          {/* Girls Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-pink-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-pink-700">Total Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-pink-700">{girlsStats.total}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Available
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-700">{girlsStats.available}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Partial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-700">{girlsStats.partial}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Full
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">{girlsStats.full}</p>
              </CardContent>
            </Card>
          </div>

          {/* Girls Occupancy */}
          <Card>
            <CardHeader>
              <CardTitle>Girls Hostel Occupancy</CardTitle>
              <CardDescription>
                {girlsStats.occupied} of {girlsStats.totalCapacity} beds occupied (
                {Math.round((girlsStats.occupied / girlsStats.totalCapacity) * 100)}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-4 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-pink-600 transition-all"
                  style={{ width: `${(girlsStats.occupied / girlsStats.totalCapacity) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Girls Room Layout */}
          <Card>
            <CardHeader>
              <CardTitle>Girls Hostel Room Layout</CardTitle>
              <CardDescription>
                Click on a room to view details or assign students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="1">
                <TabsList className="grid grid-cols-4 mb-4">
                  {[1, 2, 3, 4].map((floor) => {
                    const hasRooms = getRoomsByFloor(floor, "girls").length > 0
                    return (
                      <TabsTrigger key={floor} value={floor.toString()} disabled={!hasRooms}>
                        Floor {floor}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
                {[1, 2, 3, 4].map((floor) => (
                  <TabsContent key={floor} value={floor.toString()}>
                    <RoomGrid
                      rooms={girlsRooms}
                      applications={girlsApplications}
                      floor={floor}
                      onRoomClick={setSelectedRoom}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Unassigned Girls Students */}
          {girlsConfirmedWithoutRoom.length > 0 && (
            <Card className="border-pink-200">
              <CardHeader className="bg-pink-50/30">
                <CardTitle className="flex items-center gap-2 text-pink-700">
                  <Users className="h-5 w-5" />
                  Girls Awaiting Room Assignment
                </CardTitle>
                <CardDescription>
                  {girlsConfirmedWithoutRoom.length} confirmed girls students without rooms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {girlsConfirmedWithoutRoom.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-pink-50/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{student.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.branch} - Year {student.year}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-pink-300">Pending</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Room Detail Dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent>
          {selectedRoom && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5" />
                  Room {selectedRoom.roomNumber}
                  {selectedRoom.hostelType === "boys" && (
                    <Badge className="bg-blue-100 text-blue-700">Boys Hostel</Badge>
                  )}
                  {selectedRoom.hostelType === "girls" && (
                    <Badge className="bg-pink-100 text-pink-700">Girls Hostel</Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Floor {selectedRoom.floor} | Capacity: {selectedRoom.capacity}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Current Occupants</h4>
                  {selectedRoom.occupants.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRoom.occupants.map((id) => {
                        const student = applications.find((a) => a.id === id)
                        return student ? (
                          <div
                            key={id}
                            className="flex items-center justify-between p-2 rounded bg-muted"
                          >
                            <div>
                              <p className="text-sm font-medium">{student.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                {student.branch} - Year {student.year}
                              </p>
                            </div>
                          </div>
                        ) : null
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No occupants</p>
                  )}
                </div>

                {selectedRoom.occupants.length < selectedRoom.capacity && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Assign Student</h4>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedRoom.hostelType === "boys" ? boysConfirmedWithoutRoom : girlsConfirmedWithoutRoom).map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.fullName} ({student.branch} - Y{student.year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedRoom(null)}>
                  Close
                </Button>
                {selectedRoom.occupants.length < selectedRoom.capacity && (
                  <Button
                    onClick={handleAssign}
                    disabled={!selectedStudent || assigning}
                  >
                    {assigning && <Spinner className="h-4 w-4 mr-2" />}
                    Assign
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}