'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Users } from 'lucide-react'
import Link from 'next/link'

function RoomGrid({ hostelType }: { hostelType: 'boys' | 'girls' }) {
  const colors = hostelType === 'boys' ? 'bg-blue-100 border-blue-300' : 'bg-pink-100 border-pink-300'
  
  return (
    <div className="space-y-8">
      {Array.from({ length: 6 }).map((_, floor) => (
        <div key={floor}>
          <h3 className="text-lg font-semibold mb-4">Floor {floor + 1}</h3>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {Array.from({ length: 16 }).map((_, room) => {
              const roomNum = `${floor + 1}${String(room + 1).padStart(2, '0')}`
              return (
                <div
                  key={roomNum}
                  className={`h-16 rounded-lg border-2 ${colors} flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow`}
                >
                  <div className="text-xs font-semibold">Room</div>
                  <div className="text-sm font-bold">{roomNum}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function HostelPage() {
  const searchParams = useSearchParams()
  const hostelType = (searchParams.get('type') || 'boys') as 'boys' | 'girls'
  
  const title = hostelType === 'boys' ? 'Boys Hostel' : 'Girls Hostel'
  const icon = hostelType === 'boys' ? 'blue' : 'pink'

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Building2 className={`h-8 w-8 ${icon === 'blue' ? 'text-blue-600' : 'text-pink-600'}`} />
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">View room availability and layout</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Room Layout</CardTitle>
          <CardDescription>
            {hostelType === 'boys' ? '6 floors × 16 rooms per floor × 2 students per room' : '6 floors × 16 rooms per floor × 2 students per room'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading room layout...</div>}>
            <RoomGrid hostelType={hostelType} />
          </Suspense>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/dashboard/hostel-selection">Change Hostel</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
