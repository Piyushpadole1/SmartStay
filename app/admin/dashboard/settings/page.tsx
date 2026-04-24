"use client"

import { useEffect, useState } from "react"
import { getSettings, updateSettings, initializeSettings, initializeRooms } from "@/lib/firebase/firestore"
import type { Settings, Category } from "@/lib/types"
import { DEFAULT_SEAT_DISTRIBUTION, CATEGORIES } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Save, RefreshCw, Building2, Mars, Venus } from "lucide-react"
import { Timestamp } from "firebase/firestore"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initializingRooms, setInitializingRooms] = useState(false)

  const [formData, setFormData] = useState({
    applicationDeadline: "",
    confirmationPeriodDays: 3,
    seatsPerBranchYear: 10,
  })

  // Boys seat distribution
  const [boysSeatDistribution, setBoysSeatDistribution] = useState({ ...DEFAULT_SEAT_DISTRIBUTION })
  
  // Girls seat distribution
  const [girlsSeatDistribution, setGirlsSeatDistribution] = useState({ ...DEFAULT_SEAT_DISTRIBUTION })

  // Room structure for each hostel
  const [boysRoomStructure, setBoysRoomStructure] = useState({
    floors: 6,
    roomsPerFloor: 16,
    capacityPerRoom: 2,
  })

  const [girlsRoomStructure, setGirlsRoomStructure] = useState({
    floors: 4,
    roomsPerFloor: 12,
    capacityPerRoom: 2,
  })

  useEffect(() => {
    async function fetchSettings() {
      const s = await getSettings()
      if (s) {
        setSettings(s)
        setFormData({
          applicationDeadline: s.applicationDeadline?.toDate?.()?.toISOString().split("T")[0] || "",
          confirmationPeriodDays: s.confirmationPeriodDays,
          seatsPerBranchYear: s.seatsPerBranchYear,
        })
        
        if (s.seatDistributionBoys) {
          setBoysSeatDistribution(s.seatDistributionBoys)
        }
        
        if (s.seatDistributionGirls) {
          setGirlsSeatDistribution(s.seatDistributionGirls)
        }
      }
      setLoading(false)
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings({
        applicationDeadline: Timestamp.fromDate(new Date(formData.applicationDeadline)),
        confirmationPeriodDays: formData.confirmationPeriodDays,
        seatsPerBranchYear: formData.seatsPerBranchYear,
        seatDistributionBoys: boysSeatDistribution,
        seatDistributionGirls: girlsSeatDistribution,
      })
      toast.success("Settings saved successfully")
    } catch (error) {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleInitialize = async () => {
    setSaving(true)
    try {
      await initializeSettings(DEFAULT_SEAT_DISTRIBUTION)
      const s = await getSettings()
      if (s) {
        setSettings(s)
        setFormData({
          applicationDeadline: s.applicationDeadline?.toDate?.()?.toISOString().split("T")[0] || "",
          confirmationPeriodDays: s.confirmationPeriodDays,
          seatsPerBranchYear: s.seatsPerBranchYear,
        })
      }
      toast.success("Settings initialized")
    } catch (error) {
      toast.error("Failed to initialize settings")
    } finally {
      setSaving(false)
    }
  }

  const handleInitializeRooms = async (hostelType: "boys" | "girls") => {
    setInitializingRooms(true)
    try {
      const structure = hostelType === "boys" ? boysRoomStructure : girlsRoomStructure
      await initializeRooms(hostelType, structure)
      toast.success(`${hostelType === "boys" ? "Boys" : "Girls"} hostel rooms initialized with ${structure.floors * structure.roomsPerFloor} rooms`)
    } catch (error) {
      toast.error("Failed to initialize rooms")
    } finally {
      setInitializingRooms(false)
    }
  }

  const updateBoysSeat = (category: Category, value: number) => {
    setBoysSeatDistribution({ ...boysSeatDistribution, [category]: value })
  }

  const updateGirlsSeat = (category: Category, value: number) => {
    setGirlsSeatDistribution({ ...girlsSeatDistribution, [category]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const boysTotalSeats = boysRoomStructure.floors * boysRoomStructure.roomsPerFloor * boysRoomStructure.capacityPerRoom
  const girlsTotalSeats = girlsRoomStructure.floors * girlsRoomStructure.roomsPerFloor * girlsRoomStructure.capacityPerRoom

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure system parameters for both hostels</p>
      </div>

      {!settings && (
        <Card>
          <CardHeader>
            <CardTitle>Initialize System</CardTitle>
            <CardDescription>
              Set up initial configuration for the hostel admission system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleInitialize} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Initialize Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {settings && (
        <div className="grid gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure deadlines and confirmation periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="deadline">Application Deadline</FieldLabel>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={(e) =>
                      setFormData({ ...formData, applicationDeadline: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmationDays">
                    Confirmation Period (days)
                  </FieldLabel>
                  <Input
                    id="confirmationDays"
                    type="number"
                    min={1}
                    max={14}
                    value={formData.confirmationPeriodDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmationPeriodDays: parseInt(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="seatsPerBranchYear">
                    Seats per Branch/Year
                  </FieldLabel>
                  <Input
                    id="seatsPerBranchYear"
                    type="number"
                    min={1}
                    value={formData.seatsPerBranchYear}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        seatsPerBranchYear: parseInt(e.target.value),
                      })
                    }
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Boys & Girls Hostel Settings Tabs */}
          <Tabs defaultValue="boys" className="w-full">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2">
              <TabsTrigger value="boys" className="flex items-center gap-2">
                <Mars className="h-4 w-4" />
                Boys Hostel
              </TabsTrigger>
              <TabsTrigger value="girls" className="flex items-center gap-2">
                <Venus className="h-4 w-4" />
                Girls Hostel
              </TabsTrigger>
            </TabsList>

            {/* Boys Hostel Tab */}
            <TabsContent value="boys" className="space-y-6 mt-6">
              <Card className="border-blue-200">
                <CardHeader className="bg-blue-50/30">
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Mars className="h-5 w-5" />
                    Boys Hostel Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure room structure and seat distribution for boys hostel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Room Structure */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Room Structure</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field>
                        <FieldLabel>Number of Floors</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={boysRoomStructure.floors}
                          onChange={(e) => setBoysRoomStructure({ ...boysRoomStructure, floors: parseInt(e.target.value) })}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Rooms per Floor</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={boysRoomStructure.roomsPerFloor}
                          onChange={(e) => setBoysRoomStructure({ ...boysRoomStructure, roomsPerFloor: parseInt(e.target.value) })}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Capacity per Room</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={6}
                          value={boysRoomStructure.capacityPerRoom}
                          onChange={(e) => setBoysRoomStructure({ ...boysRoomStructure, capacityPerRoom: parseInt(e.target.value) })}
                        />
                      </Field>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Total Rooms:</strong> {boysRoomStructure.floors * boysRoomStructure.roomsPerFloor} | 
                        <strong> Total Capacity:</strong> {boysTotalSeats} seats
                      </p>
                    </div>
                  </div>

                  {/* Seat Distribution */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Category-wise Seat Distribution (per branch/year)</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      {CATEGORIES.map((category) => (
                        <Field key={category}>
                          <FieldLabel>{category}</FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            value={boysSeatDistribution[category]}
                            onChange={(e) => updateBoysSeat(category, parseInt(e.target.value) || 0)}
                          />
                        </Field>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total per branch/year:{" "}
                      {Object.values(boysSeatDistribution).reduce((a, b) => a + b, 0)} seats
                    </p>
                  </div>

                  {/* Initialize Rooms Button */}
                  <Button
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => handleInitializeRooms("boys")}
                    disabled={initializingRooms}
                  >
                    {initializingRooms ? (
                      <Spinner className="h-4 w-4 mr-2" />
                    ) : (
                      <Building2 className="h-4 w-4 mr-2" />
                    )}
                    Initialize Boys Hostel Rooms
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Girls Hostel Tab */}
            <TabsContent value="girls" className="space-y-6 mt-6">
              <Card className="border-pink-200">
                <CardHeader className="bg-pink-50/30">
                  <CardTitle className="flex items-center gap-2 text-pink-700">
                    <Venus className="h-5 w-5" />
                    Girls Hostel Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure room structure and seat distribution for girls hostel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Room Structure */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Room Structure</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field>
                        <FieldLabel>Number of Floors</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={girlsRoomStructure.floors}
                          onChange={(e) => setGirlsRoomStructure({ ...girlsRoomStructure, floors: parseInt(e.target.value) })}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Rooms per Floor</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={girlsRoomStructure.roomsPerFloor}
                          onChange={(e) => setGirlsRoomStructure({ ...girlsRoomStructure, roomsPerFloor: parseInt(e.target.value) })}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Capacity per Room</FieldLabel>
                        <Input
                          type="number"
                          min={1}
                          max={6}
                          value={girlsRoomStructure.capacityPerRoom}
                          onChange={(e) => setGirlsRoomStructure({ ...girlsRoomStructure, capacityPerRoom: parseInt(e.target.value) })}
                        />
                      </Field>
                    </div>
                    <div className="bg-pink-50 p-3 rounded-lg">
                      <p className="text-sm text-pink-700">
                        <strong>Total Rooms:</strong> {girlsRoomStructure.floors * girlsRoomStructure.roomsPerFloor} | 
                        <strong> Total Capacity:</strong> {girlsTotalSeats} seats
                      </p>
                    </div>
                  </div>

                  {/* Seat Distribution */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Category-wise Seat Distribution (per branch/year)</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      {CATEGORIES.map((category) => (
                        <Field key={category}>
                          <FieldLabel>{category}</FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            value={girlsSeatDistribution[category]}
                            onChange={(e) => updateGirlsSeat(category, parseInt(e.target.value) || 0)}
                          />
                        </Field>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total per branch/year:{" "}
                      {Object.values(girlsSeatDistribution).reduce((a, b) => a + b, 0)} seats
                    </p>
                  </div>

                  {/* Initialize Rooms Button */}
                  <Button
                    variant="outline"
                    className="w-full border-pink-300 text-pink-700 hover:bg-pink-50"
                    onClick={() => handleInitializeRooms("girls")}
                    disabled={initializingRooms}
                  >
                    {initializingRooms ? (
                      <Spinner className="h-4 w-4 mr-2" />
                    ) : (
                      <Building2 className="h-4 w-4 mr-2" />
                    )}
                    Initialize Girls Hostel Rooms
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save All Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}