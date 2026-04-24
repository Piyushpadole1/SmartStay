'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Building2, Users, BedDouble, Activity } from 'lucide-react'
import { getAllRooms, getAllApplications, getRoomStats } from '@/lib/firebase/firestore'
import type { Room, Application } from '@/lib/types'

function HostelSection({ 
  hostelType, 
  title, 
  rooms, 
  applications,
  onRoomClick 
}: { 
  hostelType: 'boys' | 'girls', 
  title: string,
  rooms: Room[],
  applications: Application[],
  onRoomClick: (room: Room) => void
}) {
  const colors = hostelType === 'boys' 
    ? 'bg-blue-100 border-blue-300 text-blue-700' 
    : 'bg-pink-100 border-pink-300 text-pink-700'
  
  const filteredRooms = rooms.filter(r => r.hostelType === hostelType)
  const filteredApplications = applications.filter(a => a.gender === (hostelType === 'boys' ? 'Male' : 'Female'))
  
  // Calculate stats
  const totalRooms = filteredRooms.length
  const totalCapacity = filteredRooms.reduce((sum, r) => sum + r.capacity, 0)
  const occupiedBeds = filteredRooms.reduce((sum, r) => sum + r.occupants.length, 0)
  const availableBeds = totalCapacity - occupiedBeds
  const availableRooms = filteredRooms.filter(r => r.status === 'available').length
  const fullRooms = filteredRooms.filter(r => r.status === 'full').length
  const partialRooms = filteredRooms.filter(r => r.status === 'partial').length
  
  // Get unique floors
  const floors = [...new Set(filteredRooms.map(r => r.floor))].sort((a, b) => a - b)
  
  // Group rooms by floor
  const roomsByFloor: Record<number, Room[]> = {}
  floors.forEach(floor => {
    roomsByFloor[floor] = filteredRooms.filter(r => r.floor === floor)
  })

  if (filteredRooms.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No rooms initialized for {title}</p>
        <p className="text-sm text-muted-foreground">Go to Settings to initialize rooms</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`h-12 w-12 rounded-full ${colors.split(' ')[0]} flex items-center justify-center`}>
          <Users className={`h-6 w-6 ${hostelType === 'boys' ? 'text-blue-600' : 'text-pink-600'}`} />
        </div>
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {floors.length} floors × {Math.round(totalRooms / floors.length)} rooms × {filteredRooms[0]?.capacity || 2} students per room
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BedDouble className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{totalCapacity}</p>
              <p className="text-xs text-muted-foreground">Total Capacity</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{occupiedBeds}</p>
              <p className="text-xs text-muted-foreground">Occupied Beds</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{availableBeds}</p>
              <p className="text-xs text-muted-foreground">Available Beds</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{availableRooms}</p>
              <p className="text-xs text-muted-foreground">Available Rooms</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Occupancy Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div 
                className={`h-full transition-all ${hostelType === 'boys' ? 'bg-blue-500' : 'bg-pink-500'}`}
                style={{ width: `${(occupiedBeds / totalCapacity) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round((occupiedBeds / totalCapacity) * 100)}% Occupied</span>
              <span>{fullRooms} Full Rooms | {partialRooms} Partial Rooms</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Room Layout</CardTitle>
          <CardDescription>Click on any room to assign or view students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {floors.map((floor) => (
              <div key={floor}>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Floor {floor}
                </h4>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {roomsByFloor[floor]
                    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber))
                    .map((room) => {
                      let statusColor = ''
                      let statusLabel = ''
                      
                      if (room.status === 'available') {
                        statusColor = 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200'
                        statusLabel = ''
                      } else if (room.status === 'partial') {
                        statusColor = 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'
                        statusLabel = `${room.occupants.length}/${room.capacity}`
                      } else {
                        statusColor = 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200'
                        statusLabel = 'Full'
                      }
                      
                      return (
                        <div
                          key={room.roomNumber}
                          onClick={() => onRoomClick(room)}
                          className={`h-16 rounded border-2 ${statusColor} flex flex-col items-center justify-center text-xs font-semibold cursor-pointer hover:shadow-md transition-all`}
                        >
                          <span className="text-sm">{room.roomNumber}</span>
                          {statusLabel && <span className="text-[10px]">{statusLabel}</span>}
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Room Status Legend */}
      <div className="flex gap-4 justify-center text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Full</span>
        </div>
      </div>
    </div>
  )
}

export default function AdminHostelPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('boys')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  useEffect(() => {
    async function fetchData() {
      const [roomData, appData] = await Promise.all([
        getAllRooms(),
        getAllApplications(),
      ])
      setRooms(roomData)
      setApplications(appData)
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room)
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
        <h1 className="text-3xl font-bold">Hostel Management</h1>
        <p className="text-muted-foreground">View and manage boys and girls hostel rooms</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="boys" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Boys Hostel
          </TabsTrigger>
          <TabsTrigger value="girls" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Girls Hostel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="boys" className="mt-6">
          <HostelSection 
            hostelType="boys" 
            title="Boys Hostel" 
            rooms={rooms}
            applications={applications}
            onRoomClick={handleRoomClick}
          />
        </TabsContent>

        <TabsContent value="girls" className="mt-6">
          <HostelSection 
            hostelType="girls" 
            title="Girls Hostel" 
            rooms={rooms}
            applications={applications}
            onRoomClick={handleRoomClick}
          />
        </TabsContent>
      </Tabs>

      {/* Room Detail Dialog */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedRoom(null)}>
          <div className="bg-white rounded-lg max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Room {selectedRoom.roomNumber}</h3>
                <button onClick={() => setSelectedRoom(null)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <p><strong>Floor:</strong> {selectedRoom.floor}</p>
                <p><strong>Capacity:</strong> {selectedRoom.capacity}</p>
                <p><strong>Status:</strong> {selectedRoom.status}</p>
                <p><strong>Current Occupants:</strong> {selectedRoom.occupants.length}</p>
                {selectedRoom.occupants.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Occupant Details:</h4>
                    <div className="space-y-2">
                      {selectedRoom.occupants.map((id) => {
                        const student = applications.find(a => a.id === id)
                        return student ? (
                          <div key={id} className="p-2 bg-muted rounded">
                            <p className="font-medium">{student.fullName}</p>
                            <p className="text-xs text-muted-foreground">{student.branch} - Year {student.year}</p>
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={() => setSelectedRoom(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}